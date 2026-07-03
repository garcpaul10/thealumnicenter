import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  // Workspace packages point their package.json "main" straight at .ts
  // source (no build step of their own) — plain `node dist/server.js` can't
  // import those at runtime, so they must be bundled in, not left external
  // like real npm dependencies (fastify, drizzle-orm, postgres).
  noExternal: ["@alumni/db", "@alumni/shared"],
});
