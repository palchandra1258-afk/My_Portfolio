// Server-only Prisma Client singleton — Phase 7A database foundation.
//
// NOT imported by any repository, route, or component. lib/repositories/*
// still reads content/projects.ts and content/resume-data.ts exclusively, and
// nothing in the Next.js build path touches this file.
//
// Its only consumer is scripts/db/migrate-content.ts, the Phase 7B-1 content
// migration pipeline, which imports it lazily so the database-free commands
// (and the test suite) never open a connection. Switching the read path over
// to the database is a separate, later phase. See the "Database foundation"
// section in README.md.
//
// Prisma 7 requires an explicit driver adapter rather than reading
// `datasource.url` automatically — see prisma/schema.prisma's datasource
// block (intentionally url-less) and https://pris.ly/d/driver-adapters.
//
// This file must never be imported from a "use client" component: it reads
// `process.env.DATABASE_URL` and opens a real network-capable driver, which
// cannot run in the browser.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and provide a real PostgreSQL connection string before using lib/db.ts.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Reuse the client across hot reloads in development so `next dev` doesn't
// open a new database connection pool on every file save.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
