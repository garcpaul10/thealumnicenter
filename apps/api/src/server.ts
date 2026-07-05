import Fastify from "fastify";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import { createDbClient } from "@alumni/db";
import { env } from "./env.js";
import "./types.js";
import { authRoutes } from "./routes/auth.js";
import { sportsRoutes } from "./routes/sports.js";
import { spacesRoutes } from "./routes/spaces.js";
import { scheduleBlocksRoutes } from "./routes/schedule-blocks.js";
import { offeringsRoutes } from "./routes/offerings.js";
import { tokenPackagesRoutes } from "./routes/token-packages.js";
import { partnersRoutes } from "./routes/partners.js";
import { staffUsersRoutes } from "./routes/staff-users.js";
import { teamsRoutes } from "./routes/teams.js";
import { gamesRoutes } from "./routes/games.js";
import { enrollmentsRoutes } from "./routes/enrollments.js";
import { membersRoutes } from "./routes/members.js";
import { meRoutes } from "./routes/me.js";
import { cardRoutes } from "./routes/card.js";
import { rewardsRoutes } from "./routes/rewards.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { memberOfferingsRoutes } from "./routes/member-offerings.js";
import { reservationsRoutes } from "./routes/reservations.js";
import { splitRequestsRoutes } from "./routes/split-requests.js";
import { stripeWebhookRoutes } from "./routes/webhooks-stripe.js";
import { kioskDevicesRoutes } from "./routes/kiosk-devices.js";
import { scanStationRoutes } from "./routes/scan-station.js";
import { menuItemsRoutes } from "./routes/menu-items.js";
import { vendorOrdersRoutes } from "./routes/vendor-orders.js";
import { publicRoutes } from "./routes/public.js";

export async function buildServer() {
  const app = Fastify({ logger: true });
  const db = createDbClient(env.databaseUrl);

  app.decorate("db", db);

  await app.register(cors, {
    origin: [env.adminAppOrigin, env.webAppOrigin, env.scanStationAppOrigin, env.marketingAppOrigin],
    credentials: true,
  });

  // Needed only so routes/webhooks-stripe.ts can verify Stripe's signature
  // against the exact raw bytes Stripe signed — normal JSON body parsing
  // (request.body) still works everywhere else unaffected.
  await app.register(rawBody, { field: "rawBody", global: false, runFirst: true });

  app.get("/health", async () => ({ status: "ok" }));

  // Marketing site (apps/marketing) — fully public, no auth. Kept as its
  // own namespace rather than reusing the staff/member schedule routes so
  // it can never accidentally expose participant/account identity.
  await app.register(publicRoutes);

  // Staff dashboard (apps/admin) — unprefixed, staff/admin JWT auth.
  await app.register(authRoutes);
  await app.register(sportsRoutes);
  await app.register(spacesRoutes);
  await app.register(scheduleBlocksRoutes);
  await app.register(offeringsRoutes);
  await app.register(tokenPackagesRoutes);
  await app.register(partnersRoutes);
  await app.register(staffUsersRoutes);
  await app.register(teamsRoutes);
  await app.register(gamesRoutes);
  await app.register(enrollmentsRoutes);
  await app.register(membersRoutes);
  await app.register(kioskDevicesRoutes);
  await app.register(menuItemsRoutes);

  // Scan-station app (apps/scan-station) — kiosk-device JWT auth
  // (requireKioskAuth/requireKioskStaffAuth), not the staff dashboard JWT.
  await app.register(scanStationRoutes);
  await app.register(vendorOrdersRoutes);

  // Stripe webhook — its own top-level path, matches what's configured in
  // the Stripe dashboard; not under /member since Stripe calls it directly.
  await app.register(stripeWebhookRoutes);

  // Member PWA (apps/web) — /member prefix avoids path collisions with the
  // staff routes above (e.g. both want "GET /offerings" with different
  // auth/shape); Clerk session-token auth via requireMemberAuth.
  await app.register(
    async (memberApp) => {
      await memberApp.register(meRoutes);
      await memberApp.register(cardRoutes);
      await memberApp.register(rewardsRoutes);
      await memberApp.register(checkoutRoutes);
      await memberApp.register(memberOfferingsRoutes);
      await memberApp.register(reservationsRoutes);
      await memberApp.register(splitRequestsRoutes);
    },
    { prefix: "/member" },
  );

  return app;
}

const app = await buildServer();
app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
