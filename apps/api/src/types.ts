import type { Db } from "@alumni/db";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}
