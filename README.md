# Chandrapal — Portfolio

Personal portfolio site built with Next.js (App Router), TypeScript, Tailwind CSS, and Framer Motion.

## Content model

All personal/resume facts live in `content/resume-data.ts`, sourced directly from `Chandrapal_Resume.pdf`.

All project data lives in `content/projects.ts` as a **master inventory** — every project found across the resume and GitHub is represented there, even unpublished or undocumented ones. Each entry carries:

- `evidenceStatus` — `verified | partially-verified | self-reported | in-development | planned | unpublished | needs-information`
- `verificationNotes` — what was actually checked, and what wasn't
- `category` — `featured | supporting | research | coming-soon` (drives which section of `/projects` it appears in)

When adding or updating a project, keep every claim honest: a target metric is never shown as an achieved result, and a self-reported claim from a repo's own docs is never presented as independently verified.

## Development

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
```

## Structure

```
app/                  # routes (Home, Projects, Projects/[slug], About, Contact)
components/           # shared UI (nav, footer, project cards, status badges, reveal animation)
content/               # resume-data.ts + projects.ts (the single source of truth for site content)
lib/types.ts           # Project / Metric / VerificationStatus types
lib/repositories/      # repository boundary the UI reads through — see "Content source" below
lib/db.ts              # Prisma Client singleton, used by scripts/db/ and the database-backed repositories
prisma/                # database schema + migrations
scripts/db/            # content → PostgreSQL migration pipeline, see "Database foundation" below
public/resume.pdf      # downloadable resume (copy of Chandrapal_Resume.pdf)
```

## Database foundation

A PostgreSQL schema exists in `prisma/schema.prisma`, translating `docs/DATABASE_DESIGN.md` into Prisma models, and the content in `content/*.ts` has been replicated into a local development database. `content/projects.ts` and `content/resume-data.ts` remain the **authoritative** source of truth — the database is a **derived replica**: content flows one way, `content/*.ts → PostgreSQL`, and can be rebuilt from TypeScript at any time. Which one the running application actually reads from is controlled by `CONTENT_SOURCE` — see "Content source" below.

**Stack:** PostgreSQL + [Prisma](https://www.prisma.io/) (ORM/migrations), via `@prisma/adapter-pg` (Prisma 7 requires an explicit driver adapter rather than an inline datasource URL).

**Local setup (when you're ready to actually use it):**

```bash
cp .env.example .env        # then edit .env with a real PostgreSQL connection string
npx prisma migrate dev      # applies prisma/migrations/ to your database
npx prisma generate         # regenerates the client (also runs automatically via postinstall)
```

### Content migration pipeline

`scripts/db/` implements the pipeline described in `docs/DATABASE_DESIGN.md` §25 — `Normalize → Validate → Import → Compare → Verify`. Each stage is a separate module. `normalize` and `validate` are pure, as is the canonicalization/diff portion of `compare`; all three have unit tests that run without a database. `import` requires a live database and is exercised through the `db:*` commands below.

```bash
npm run db:validate     # normalize + validate, no database access at all
npm run db:import       # write content/*.ts into the database
npm run db:compare      # diff the database against content/*.ts
npm run db:verify       # row counts + full comparison (the 13/13, 1/1 check)
npm run db:status       # expected vs actual row counts (read-only)
npm run db:idempotency  # re-import and prove nothing changed
```

`db:import` replaces child rows wholesale, so re-running it deletes rows a previous run wrote. It **refuses to delete anything** unless `--allow-deletes` is passed; `--dry-run` reports what would be written and deleted without opening a write transaction. A first import into an empty database deletes nothing and needs no flag. The pilot-first order recommended by `docs/IMPLEMENTATION_ROADMAP.md` §77 is available via `--only=<slug>`.

`npm run typecheck` / `npm run lint` / `npm run build` / `npm test` all pass with no live database connection when `CONTENT_SOURCE` is unset or `typescript` (the default outside production) — `lib/db.ts` is only reached when `CONTENT_SOURCE=database` selects the database-backed repositories, and `npm test` never sets it.

### Content source (`CONTENT_SOURCE`)

`app/` and `components/` never read `process.env.CONTENT_SOURCE` directly, and never choose between TypeScript and database content themselves. Everything reads through `lib/repositories/content-repository.server.ts`, which resolves the source once per process (`lib/content/content-source.ts`) and reuses that decision for every project and profile read in the render — a response can never mix a database project list with a TypeScript profile, or vice versa.

| `CONTENT_SOURCE` | Development / test | Production |
| --- | --- | --- |
| unset | defaults to `typescript` | **error** — production must state a source explicitly |
| `typescript` | reads `content/projects.ts` / `content/resume-data.ts` | same |
| `database` | reads PostgreSQL via `lib/repositories/*.server.ts` | same, when reachable |
| anything else | **error** | **error** |

`npm run dev` and `npm test` therefore stay on TypeScript, with no PostgreSQL dependency, unless `CONTENT_SOURCE=database` is set explicitly. `CONTENT_SOURCE` is a server-only setting — it is never exposed as `NEXT_PUBLIC_*`.

**Database-unavailable fallback (build-time only).** If `CONTENT_SOURCE=database` and the database cannot be reached (`DATABASE_URL` missing, connection refused, host unreachable), a `next build` static-generation pass falls back to TypeScript content and logs a loud `[content-source] ⚠ FALLBACK` warning. Outside a build — `npm run dev` or a running production server — the same unavailability fails loudly instead: silently serving TypeScript from a process that was told to use the database would look like a working database-backed deployment and isn't.

**A reachable database that returns an error does not fall back.** A query failure, a missing table, or reconstructed data that fails validation (`lib/content/profile-content.ts`) always propagates as an error — never coerced, never quietly swapped for TypeScript. Those are bugs to fix, not availability problems to route around. A project slug that genuinely does not exist in PostgreSQL returns `null`, exactly like the TypeScript repository, so the route's `notFound()` still fires — it is not resurrected from `content/projects.ts`.

**Integrity constraints not visible in `schema.prisma`:** Prisma 7.10.0 has no schema-level `CHECK` support, so two integrity rules from the approved design (`docs/DATABASE_DESIGN.md` §23) are hand-appended to `prisma/migrations/20260905021148_init/migration.sql` instead — `project_relationships_no_self_reference` (a project cannot relate to itself) and `profile_singleton` (`id = 1`, making a second profile row impossible). ⚠ Regenerating that migration from the schema will silently drop both; re-append the block if that ever happens. The remaining open questions are listed in `docs/DATABASE_DESIGN.md` §26 — notably that `technologies.name` uniqueness is case-sensitive, which `db:validate` reports as a warning rather than silently merging variants.
