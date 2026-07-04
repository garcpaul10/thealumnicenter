import { eq } from "drizzle-orm";
import type { ClerkClient } from "@clerk/backend";
import { accounts, participants, type Db } from "@alumni/db";

/**
 * Lazily creates the `accounts`/owner-`participants` rows the first time a
 * Clerk-authenticated member hits the API — there's no Clerk webhook wiring
 * for this (simpler for v1; see CLAUDE.md CS4). If a staff-created guest
 * account already exists with the same phone (kiosk starter-pack sale,
 * Phase 4), it's linked to this Clerk identity rather than duplicated.
 */
export async function getOrCreateAccountForClerkUser(
  db: Db,
  clerkClient: ClerkClient,
  clerkUserId: string,
): Promise<{ id: string; phone: string }> {
  const [existing] = await db.select().from(accounts).where(eq(accounts.clerkUserId, clerkUserId));
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const phone = clerkUser.phoneNumbers[0]?.phoneNumber;
  if (!phone) {
    throw new Error(`Clerk user ${clerkUserId} has no phone number on file`);
  }

  const [byPhone] = await db.select().from(accounts).where(eq(accounts.phone, phone));
  if (byPhone) {
    const [linked] = await db
      .update(accounts)
      .set({ clerkUserId })
      .where(eq(accounts.id, byPhone.id))
      .returning();
    return linked;
  }

  return db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({ phone, clerkUserId, email: clerkUser.emailAddresses[0]?.emailAddress })
      .returning();

    await tx.insert(participants).values({
      accountId: account.id,
      firstName: clerkUser.firstName ?? "Member",
      lastName: clerkUser.lastName ?? "",
      isAccountOwner: true,
    });

    return account;
  });
}
