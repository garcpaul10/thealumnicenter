import { defineConfig } from "vitest/config";

// packages/db has no unit-testable logic of its own (schema definitions
// only) — ledger correctness is tested where the ledger service lives, in
// apps/api. This just keeps `pnpm -r test` green rather than failing on
// "no test files".
export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
