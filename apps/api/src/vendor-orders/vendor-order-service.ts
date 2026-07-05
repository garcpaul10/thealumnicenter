import { eq, inArray } from "drizzle-orm";
import { vendorOrders, vendorOrderItems, menuItems, type Db } from "@alumni/db";
import { recordRedemption } from "../ledger/ledger-service.js";
import type { LedgerCreatedBy } from "@alumni/shared";

export class MenuItemNotFoundError extends Error {
  constructor(menuItemId: string) {
    super(`Menu item ${menuItemId} not found or inactive`);
    this.name = "MenuItemNotFoundError";
  }
}

/**
 * Concession/vendor POS mode — "another scan point" per DESIGN.md: scan →
 * ring up token-priced items → deduct. House-owned stands use the "house"
 * beneficiary (no split); third-party vendors use `beneficiary: { kind:
 * "vendor", partnerId }` so the existing settlement-by-beneficiary column
 * (token_ledger.beneficiary_partner_id) picks this up for free.
 */
export async function createVendorOrder(
  db: Db,
  params: {
    partnerId: string | null;
    participantId: string;
    accountId: string;
    items: { menuItemId: string; qty: number }[];
    createdBy: LedgerCreatedBy;
  },
) {
  if (params.items.length === 0) throw new Error("Order must have at least one item");

  const menuItemIds = params.items.map((item) => item.menuItemId);
  const rows = await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds));
  const byId = new Map(rows.map((row) => [row.id, row]));

  let totalTokens = 0;
  const lineItems: { menuItemId: string; qty: number; tokensEach: number }[] = [];
  for (const item of params.items) {
    const menuItem = byId.get(item.menuItemId);
    if (!menuItem || !menuItem.active) throw new MenuItemNotFoundError(item.menuItemId);
    totalTokens += menuItem.tokenPrice * item.qty;
    lineItems.push({ menuItemId: item.menuItemId, qty: item.qty, tokensEach: menuItem.tokenPrice });
  }

  return db.transaction(async (tx) => {
    // Insert the order row first (no ledgerTxnId yet) so its own id can be
    // the ledger's referenceId — token_ledger.reference_id is a uuid column,
    // so it can't point at the partner id (may be null for house orders) or
    // any other non-uuid label.
    const [order] = await tx
      .insert(vendorOrders)
      .values({
        partnerId: params.partnerId,
        participantId: params.participantId,
        accountId: params.accountId,
        totalTokens,
      })
      .returning();

    const { redemptionRow } = await recordRedemption(tx, {
      accountId: params.accountId,
      participantId: params.participantId,
      amountTokens: totalTokens,
      beneficiary: params.partnerId ? { kind: "vendor", partnerId: params.partnerId } : { kind: "house" },
      referenceType: "vendor_order",
      referenceId: order.id,
      createdBy: params.createdBy,
    });

    await tx.update(vendorOrders).set({ ledgerTxnId: redemptionRow.id }).where(eq(vendorOrders.id, order.id));
    await tx.insert(vendorOrderItems).values(lineItems.map((item) => ({ ...item, orderId: order.id })));

    return { ...order, ledgerTxnId: redemptionRow.id };
  });
}

export async function listMenuItems(db: Db, partnerId?: string) {
  const query = db.select().from(menuItems);
  return partnerId ? query.where(eq(menuItems.partnerId, partnerId)) : query;
}
