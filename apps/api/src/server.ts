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

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  app.listen({ port: env.port, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
