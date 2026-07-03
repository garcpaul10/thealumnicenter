import { defineConfig } from "vitest/config";

// All test files share one physical Postgres test database and isolate
// between tests via `truncate` in beforeEach — running test *files* in
// parallel races those truncates against each other (FK violations,
// deadlocks, wrong balances). Serialize file execution; within a file,
// tests still run in the declared order against a freshly truncated DB.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
