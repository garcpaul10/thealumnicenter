import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tokenPackages } from "@alumni/db";
import { env } from "../env.js";
import { recordPurchase } from "../ledger/ledger-service.js";

// Lazy — see the comment in routes/checkout.ts for why.
let stripe: Stripe | undefined;
function getStripe(): Stripe {
  if (!stripe) stripe = new Stripe(env.stripeSecretKey);
  return stripe;
}

/**
 * The only place token_ledger gets credited for a real-money purchase.
 * Verifies the Stripe signature against the *raw* request body (see
 * @fastify/raw-body registration in server.ts) — never trusts the
 * client-side success redirect, which the browser fully controls.
 */
export async function stripeWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return reply.code(400).send({ error: "Missing Stripe-Signature header" });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent((request as any).rawBody, signature, env.stripeWebhookSecret);
    } catch (err) {
      request.log.warn(err, "Stripe webhook signature verification failed");
      return reply.code(400).send({ error: "Invalid signature" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { tokenPackageId, participantId, accountId } = session.metadata ?? {};

      if (!tokenPackageId || !participantId || !accountId) {
        request.log.error({ sessionId: session.id }, "Stripe session missing required metadata");
        return reply.code(200).send({ received: true }); // ack so Stripe doesn't retry forever on bad data
      }

      const [pkg] = await app.db.select().from(tokenPackages).where(eq(tokenPackages.id, tokenPackageId));
      if (!pkg) {
        request.log.error({ tokenPackageId }, "Stripe webhook: token package no longer exists");
        return reply.code(200).send({ received: true });
      }

      await recordPurchase(app.db, {
        accountId,
        participantId,
        tokensGranted: pkg.tokensGranted,
        bonusTokens: pkg.bonusTokens,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        referenceType: "token_package_purchase",
        referenceId: pkg.id,
        createdBy: "system",
      });
    }

    return reply.send({ received: true });
  });
}
