import Fastify from "fastify";
import cors from "@fastify/cors";
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

export async function buildServer() {
  const app = Fastify({ logger: true });
  const db = createDbClient(env.databaseUrl);

  app.decorate("db", db);

  await app.register(cors, {
    origin: [env.adminAppOrigin],
    credentials: true,
  });

  app.get("/health", async () => ({ status: "ok" }));

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

  return app;
}

const app = await buildServer();
app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
