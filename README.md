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
components/admin/      # admin shell, sidebar, and the two shared admin primitives
content/               # resume-data.ts + projects.ts (the single source of truth for site content)
lib/types.ts           # Project / Metric / VerificationStatus types
lib/admin/             # admin navigation model + dashboard overview figures (pure, unit-tested)
lib/auth/              # password hashing, session tokens, the admin guard — see "Admin dashboard"
lib/repositories/      # repository boundary the UI reads through — see "Content source" below
lib/db.ts              # Prisma Client singleton, used by scripts/db/ and the database-backed repositories
prisma/                # database schema + migrations
scripts/db/            # content → PostgreSQL migration pipeline, see "Database foundation" below
public/resume.pdf      # downloadable resume (copy of Chandrapal_Resume.pdf)
```

## Admin dashboard

A private, authenticated admin area lives at `/admin`. Since Phase 7 it can **create and edit
projects**, writing to PostgreSQL.

| Route | What it does |
| --- | --- |
| `/admin/login` | Sign in. The only admin route reachable while signed out. |
| `/admin` | Overview: project counts, featured count, unresolved evidence markers, active content source. |
| `/admin/projects` | Every project including drafts, in display order, with publication state and origin. |
| `/admin/projects/new` | Create a project. Starts as a draft. |
| `/admin/projects/[slug]` | One project, read-only view, with evidence markers highlighted. 404s on an unknown slug. |
| `/admin/projects/[slug]/edit` | Edit identity, classification, summary, evidence, technologies, links, ordering and publication state. |
| `/admin/projects/[slug]/preview` | Draft preview, rendered with the public article component. |
| `/admin/projects/[slug]/revisions/[id]` | Inspect one historical snapshot. |

### The CMS writes to the database; the public site may not be reading it

This is the one thing to understand before using the editor. The public read path honours
`CONTENT_SOURCE`, and its default outside production is `typescript`. The CMS has no such choice — a
web form cannot edit `content/projects.ts` — so it always reads and writes PostgreSQL.

While `CONTENT_SOURCE=typescript`, an edit saved in the admin is **stored and durable but invisible
to visitors**. Every CMS screen says so in a banner rather than letting that be discovered by
publishing something and checking the live site. To make edits public, run the site with
`CONTENT_SOURCE=database`.

### What the Phase 7 editor does and does not own

It owns: title, slug, category, status, fact source, featured flag, short description, evidence
status, verification notes, technologies, GitHub/demo links, display order, publication status.

It does **not** touch `problem`, `approach`, `architecture`, metrics, results, "what is working",
"in development", implementation notes, alternate names, or project relationships. A save leaves
every one of those rows exactly as it found them, and the edit form says how many it is preserving.

That is deliberate and load-bearing. Those tables hold the evidence-graded material — metrics marked
`verified-result` versus `target`, and the `[NEEDS INFORMATION]` / `[NEEDS VERIFICATION]` markers
still waiting on the owner's facts. `scripts/db/import.ts` replaces child collections wholesale; if
the CMS did the same, the first save from a form that does not collect them would erase them.
Editing them arrives with the section editor in a later phase. Until then they are preserved by not
being written, and `lib/repositories/admin-project-repository.db.test.ts` asserts it.

### Draft, preview and publish

A new project is created as a **draft** (`CMS_SPECIFICATION.md` §43) and is invisible to visitors
until it is published.

**Where the filter lives.** `getAllProjects()` in `lib/repositories/project-repository.server.ts`
restricts the query to `publication_status = 'published'`. Every public surface derives from that
one function — the project list, each detail page, `generateStaticParams`, `generateMetadata`, the
home page's featured list and `sitemap.xml` — so a draft has no page, no static path, no metadata
and no sitemap entry. A draft slug 404s exactly as a nonexistent one does; there is no "exists but
hidden" signal. The admin reads the same rows *without* the filter, through
`lib/repositories/admin-project-repository.server.ts`.

Relationship lists are stripped before rendering (`stripRelationships`). The article shows an
already-resolved `related` list, so carrying the raw `relatedTo` array would put the slug of an
unpublished project into the page's RSC payload without displaying it.

**Preview** lives at `/admin/projects/[slug]/preview` and renders the same `ProjectArticle`
component as the public route, fed the same `PublicProject` projection — so it shows what a visitor
would see, internal notes included in the omission, and cannot drift from the public layout.

Its only credential is the session, checked server-side on the page and again in `generateMetadata`.
There is no preview token, no `?preview=1`, and no client-side branch: an unauthenticated request is
redirected before any draft field is read. It carries `noindex, nofollow, noarchive`, never appears
in `sitemap.xml`, and `next.config.ts` sets `Cache-Control: private, no-store, must-revalidate` plus
`X-Robots-Tag` across `/admin/:path*`, so no shared cache may hold an unpublished page.

**Publish and unpublish** are server actions with an inline confirmation step. Each re-establishes
the caller's identity before touching anything; the `slug` field identifies the row and is never
what authorizes the call. They write exactly three columns — `publication_status`, `published_at`
and `content_origin` — and touch no other scalar and no child row, so going live is never a content
edit. `published_at` is stamped on first publish and never cleared, including on unpublish, so §46's
"remains recoverable" keeps the record of when the project first went live. Unpublish sets `draft`,
never `archived`.

Both also set `content_origin = 'cms'`, which is load-bearing rather than bookkeeping: `db:import`
writes `publication_status: 'published'` for every row it touches, so without the flag the next
routine sync would silently republish a project you had deliberately unpublished.

**TypeScript-mode limitation.** `content/projects.ts` has no publication field — all 13 entries are
effectively published, which is the current, correct behaviour and is preserved unchanged. Draft
state therefore only exists in database mode. Rather than invent a fake workflow, the CMS writes
drafts to PostgreSQL and the admin says plainly that edits are not live while
`CONTENT_SOURCE=typescript`.

### Revision history

Every CMS write records a snapshot of the project as it stands afterwards, in `content_revisions`
(`DATABASE_DESIGN.md` §20, `CMS_SPECIFICATION.md` §47-49). Create, edit, publish and unpublish each
produce one revision; `db:import` does not, because a bulk replica sync is not an editorial change.

**Recorded inside the caller's transaction.** The three functions that write project content are the
only places revisions are created, and they use the same transaction handle as the write. That gives
two properties for free: history can never describe content that was rolled back, and committed
content can never be missing its revision. The integration tests assert both directly.

**Full snapshots, not diffs** (§20): a diff turns restore into a replay engine, a snapshot makes it a
copy. The snapshot is produced by `readProjectsFromDatabase` — the same reconstruction the public
site and `db:verify` use — so a revision can never record a shape the application does not serve.

**Version numbers** are `max + 1` per project, and a unique index on
`(entity_type, entity_id, version_number)` enforces it: two concurrent writers computing the same
next number collide and one transaction rolls back, rather than silently producing two of the same.

**`created_by`** holds the session subject of the administrator who made the change — never a
fabricated author, and null when no actor was supplied. §20 leaves it as a placeholder for a future
`users` table.

**Strictly administrative.** A snapshot contains the entire project *including* the internal
verification notes, so this table is never read by a public route, metadata function or the sitemap.
A test walks the public source tree and fails if anything there so much as imports the revision
repository.

History is shown on the project page and inspected at
`/admin/projects/[slug]/revisions/[revisionId]`, which is fetched by project *and* revision id
together so a guessed id cannot surface another project's history.

**Restore** copies a revision's content back onto the project through the ordinary update path, so
it inherits the slug-collision handling, the technology sync and the deliberate non-writing of
metrics and relationships — and records a new revision of its own. It never changes publication
state: restoring a revision taken while the project was live does not push old content public, and
restoring a draft-era revision does not take a live project down.

**Comparison** (`/admin/projects/<slug>/revisions/compare?from=&to=`) shows two revisions field by
field, changed and unchanged alike. It reads both snapshots through the same projection restore
uses, so any field it marks as changed is exactly a field a restore would write. Publication status,
`published_at` and content origin are reported separately as recorded state, because restore leaves
those alone.

### Media and documents

Two managed assets — the profile photo and the resume — are administered at `/admin/media`.

**Storage.** An asset's bytes live in `media_assets.data` (PostgreSQL `bytea`) in the same row as
its metadata. Writing uploads into `public/` is *not* production-safe: Next snapshots `public/` at
build time, so a file written there at runtime is not served by a built application, and on an
ephemeral or read-only filesystem it does not survive a deploy. Keeping bytes and metadata together
also makes replacement atomic (one upsert, so the old asset is readable until the new one commits),
makes orphaned files impossible (there is no second system to leak into), and makes path traversal
impossible (there are no paths).

The cost is that every byte travels through PostgreSQL and the Node runtime. For two singleton
assets of a few megabytes that is a fair trade. **It would not scale to a real media library** — at
that point object storage is the answer, and it would change `lib/repositories/media-repository.server.ts`
and `app/media/[slot]/route.ts` and nothing else, which is why every access goes through them.

**Validation.** Uploads are checked by reading the file's own magic bytes, never the type the
browser reports. Images must be JPEG, PNG or WebP between 200×200 and 8000×8000 and at most 5 MB;
dimensions are parsed from the container header rather than by decoding the image. Documents must be
PDFs of at most 10 MB with a valid header *and* end-of-file marker, so a truncated upload is refused.
SVG is rejected outright: it is an XML document that can carry scripts. Filenames are reduced to a
safe display name — they never locate anything.

**Serving.** `/media/profile-photo` and `/media/resume` serve the bytes with `nosniff`, a restrictive
`Content-Security-Policy` and an explicit `Content-Disposition`. The path names the *slot*, not the
file, so a published link keeps working across a replacement; a `?v=` token carrying the asset's
last-modified time is what makes a replacement visible immediately while letting an unchanged URL be
cached hard.

#### TypeScript mode versus database mode

Media follows the active content source like everything else, through the same single funnel:

| | `CONTENT_SOURCE=typescript` (default) | `CONTENT_SOURCE=database` |
|---|---|---|
| Public portrait | `public/images/profile.jpg` if present, else the lettered placeholder | the managed asset, else the placeholder |
| Public resume link | `/resume.pdf` if present, else no link | `/media/resume`, else no link |
| Admin at `/admin/media` | the managed asset, always | the managed asset, always |

The CMS necessarily writes to PostgreSQL — a form cannot edit a file in `public/`. So while
`CONTENT_SOURCE=typescript`, **an uploaded photo or resume is stored and durable and visible
throughout the admin area, but visitors keep seeing the committed files in `public/`.** This is the
same gap the project CMS has, and `/admin/media` says so on screen rather than leaving it to be
discovered. Uploading does not delete anything from `public/`; the committed files remain the
TypeScript-mode fallback.

**Media has no draft state.** An asset is live from the moment it is stored. Deleting one is not a
publication change: it removes the asset and the public surface falls back to its placeholder (photo)
or omits the link (resume). Managing media never touches project content, never changes any
project's publication status, and never records a project revision — who changed an asset and when
is recorded on the asset row itself (`updated_by`, `updated_at`). Restoring a project revision
likewise leaves both assets untouched.

### Content provenance and `db:import`

Each project row records whether its current contents came from `content/*.ts` or from the CMS
(`content_origin`). This exists to stop `db:import` destroying CMS edits: an import rewrites every
scalar and replaces every child collection, so without the flag the next sync would silently discard
everything typed into the admin, with no copy anywhere.

```bash
npm run db:import                      # refuses if any in-scope project is CMS-authored
npm run db:import -- --overwrite-cms   # discards the CMS version deliberately
```

`db:compare` and `db:verify` exclude CMS-authored rows from the replica comparison and list them
separately — those rows are *supposed* to differ from the TypeScript files, so failing them would
report a deliberate edit as corruption. Row counts still include them.

**Setup.** Three server-only variables are required; the admin area refuses to authenticate anyone
without them, and the login page says so. None is `NEXT_PUBLIC_*`, and none is ever sent to a browser.

```bash
npm run auth:hash   # prompts for a password (hidden) and prints the scrypt hash to paste into .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"   # AUTH_SECRET
```

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `AUTH_SECRET` in `.env` — see `.env.example`.
`ADMIN_PASSWORD_HASH` must be the full `scrypt$...` string; a plaintext password there is rejected
at startup rather than silently accepted.

⚠ **Escape every `$` in `ADMIN_PASSWORD_HASH` as `\$`.** Next.js loads `.env` through `@next/env`,
which expands `$NAME` inside values. A scrypt hash is `scrypt$N$r$p$salt$digest`, so an unescaped one
is collapsed — measured here, a 130-character hash arrived as 7 characters — and the only symptom is
the login page reporting that sign-in is "not configured", which reads like a *missing* variable
rather than a mangled one. Quoting does not help; expansion happens after the quotes are stripped.
`npm run auth:hash` prints the correctly escaped line, so paste it verbatim and do not add quotes.
`lib/auth/env-file.ts` documents the behaviour and `lib/auth/env-file.test.ts` pins it down against
the real loader. Note the corollary: the `db:*` scripts load `.env` through Node's built-in
`--env-file`, which does *no* expansion and does *not* unescape `\$` — which is why the database
tooling kept working throughout, and why a `--env-file` script reading this variable would see the
literal backslashes.

**How access control works.** Every admin page, and `generateMetadata` on the project detail route,
calls `requireAdminAuthorized()` for itself. The layout calls it too, but only to render the header —
a layout is not the security boundary, because server actions are separately addressable endpoints
that never pass through it. Sessions are stateless HMAC-signed tokens in an `httpOnly`, `sameSite=lax`
cookie, `secure` in production; logout clears the cookie, and rotating `AUTH_SECRET` invalidates every
outstanding session at once.

Every admin route is `force-dynamic` and carries `noindex, nofollow`, and none appears in
`sitemap.xml`. The `force-dynamic` is load-bearing: without it Next prerenders the route at build
time, which runs the guard once with no cookies and serves that frozen answer to everyone.
`app/admin/admin-routes.test.ts` asserts it on every route so it cannot be lost quietly.

One structural constraint worth knowing before adding files: a `loading.tsx` at `app/admin/(dashboard)/`
or `app/admin/(dashboard)/projects/` would open a Suspense boundary above the project detail route,
and streaming would commit an HTTP 200 before `notFound()` could set a 404. The boundary is scoped to
`(overview)/` for that reason, and a test asserts the placement.

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
