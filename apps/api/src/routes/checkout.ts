import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";
import { tokenPackages, participants, accounts } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import { env } from "../env.js";

// Constructed lazily (inside the handler, not at module load) so a missing
// STRIPE_SECRET_KEY only breaks checkout, not the whole API — server.ts
// imports every route module at startup, so top-level env access here would
// crash every route, including unrelated ones, if this var isn't set yet.
let stripe: Stripe | undefined;
function getStripe(): Stripe {
  if (!stripe) stripe = new Stripe(env.stripeSecretKey);
  return stripe;
}

export async function checkoutRoutes(app: FastifyInstance) {
  app.get("/token-packages", { preHandler: requireMemberAuth }, async () => {
    return app.db.select().from(tokenPackages).where(eq(tokenPackages.active, true));
  });

  app.post<{ Params: { id: string }; Body: { participantId: string } }>(
    "/token-packages/:id/checkout",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const { participantId } = request.body;
      if (!participantId) return reply.code(400).send({ error: "participantId is required" });

      const [pkg] = await app.db.select().from(tokenPackages).where(eq(tokenPackages.id, request.params.id));
      if (!pkg || !pkg.active) return reply.code(404).send({ error: "Token package not found" });

      const [participant] = await app.db
        .select()
        .from(participants)
        .where(and(eq(participants.id, participantId), eq(participants.accountId, request.account!.id)));
      if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });

      const [account] = await app.db.select().from(accounts).where(eq(accounts.id, request.account!.id));

      let stripeCustomerId = account.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await getStripe().customers.create({ phone: account.phone });
        stripeCustomerId = customer.id;
        await app.db.update(accounts).set({ stripeCustomerId }).where(eq(accounts.id, account.id));
      }

      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: pkg.name },
              unit_amount: pkg.priceCents,
            },
            quantity: 1,
          },
        ],
        // Ledger credit happens only on the webhook's checkout.session.completed
        // event (see routes/webhooks-stripe.ts) — never on this redirect, which
        // the client fully controls and could hit without ever paying.
        metadata: {
          tokenPackageId: pkg.id,
          participantId: participant.id,
          accountId: account.id,
        },
        success_url: `${request.headers.origin ?? env.webAppOrigin}/wallet?purchase=success`,
        cancel_url: `${request.headers.origin ?? env.webAppOrigin}/wallet?purchase=cancelled`,
      });

      return reply.send({ checkoutUrl: session.url });
    },
  );
}
