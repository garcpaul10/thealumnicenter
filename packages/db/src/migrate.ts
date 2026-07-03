import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and set it.");
  }
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations complete.");
  await migrationClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
