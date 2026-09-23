// Vitest configuration — Phase 7B-1, extended in Phase 7B-2 Step 4.
//
// Covers the pure, database-free half of the migration pipeline
// (normalize / validate / compare's canonicalization and diff), plus the
// database-free content-source tests added in Step 4 (source selection,
// availability classification, profile validation, and the content
// repository's fallback/consistency policy with the real DB modules mocked
// out). Those modules were written without I/O, or with I/O deliberately
// mockable, precisely so they can be tested here without a PostgreSQL
// instance, which keeps `npm test` runnable in CI.
//
// The `@/` alias mirrors tsconfig.json's `paths`, so test files import the
// same specifiers the application does.
//
// `conditions: ["react-server"]` mirrors vitest.db.config.ts. It is needed
// here too, without pulling in a database dependency: lib/repositories/
// content-repository.server.ts (and the *.server.ts modules it can import)
// carry a top-level `import "server-only"`, which resolves to a module that
// throws under the default export condition and to a no-op only under
// `react-server` — the condition Next.js itself uses for Server Components.
// Nothing about this condition requires DATABASE_URL or opens a connection.

import { fileURLToPath } from "node:url";

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts", "lib/**/*.test.ts"],
    // `*.db.test.ts` files require a live PostgreSQL instance and run via
    // `npm run test:db` (vitest.db.config.ts). `npm test` must stay runnable
    // on a fresh clone with no database and no DATABASE_URL.
    exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
  },
});
