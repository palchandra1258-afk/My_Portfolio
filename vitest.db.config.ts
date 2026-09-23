// Vitest configuration for the database-backed repository contract tests.
//
// Separate from vitest.config.ts on purpose: `npm test` must stay runnable
// with no PostgreSQL and no DATABASE_URL, so the `*.db.test.ts` files live
// behind `npm run test:db` instead.
//
// Two things this config has to arrange that the default one does not:
//
//  1. DATABASE_URL. The db:* scripts get it from `tsx --env-file=.env`;
//     vitest has no equivalent flag, so .env is read here with Node's built-in
//     `process.loadEnvFile` (no dotenv dependency) and handed to the test
//     environment explicitly via `test.env`, which is forwarded to workers.
//
//  2. The `server-only` marker. lib/repositories/*.server.ts import it, and
//     its package exports resolve to a module that throws by default —
//     deliberately, since importing it outside a React Server environment is
//     exactly what it exists to prevent. Resolving with the `react-server`
//     condition picks its no-op build instead, which is also the condition
//     Next.js uses for Server Components: the tests then load these modules
//     the same way the framework will.

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// A missing .env is not fatal here — the tests report a clear message when
// DATABASE_URL is unset, which is more useful than a config-time crash.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file; fall through to whatever is already in the environment
}

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
    include: ["lib/**/*.db.test.ts", "scripts/**/*.db.test.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  },
});
