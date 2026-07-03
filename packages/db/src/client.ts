import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set it — see README.md.",
    );
  }
  return url;
}

export function createDbClient(databaseUrl: string = requireDatabaseUrl()) {
  const queryClient = postgres(databaseUrl);
  return drizzle(queryClient, { schema });
}

export type Db = ReturnType<typeof createDbClient>;
