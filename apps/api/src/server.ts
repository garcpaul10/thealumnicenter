import Fastify from "fastify";
import { createDbClient } from "@alumni/db";
import { env } from "./env.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  const db = createDbClient(env.databaseUrl);

  app.decorate("db", db);

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}

const app = buildServer();
app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
