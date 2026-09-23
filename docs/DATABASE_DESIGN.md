# DATABASE_DESIGN.md

> Phase 6 — Database Design. **Design only. Nothing in this document is implemented.**
>
> No ORM, database package, migration, table, client, or environment variable exists as a result of this document.
>
> This is a technology-neutral relational data model for the future persistence layer that will eventually sit behind `lib/repositories/project-repository.ts` and `lib/repositories/profile-repository.ts`, replacing `content/projects.ts` and `content/resume-data.ts` as the source of truth — without the public UI or the repository *interface* changing.
>
> Read alongside: `PORTFOLIO_ARCHITECTURE.md` (target architecture), `CMS_SPECIFICATION.md` (content-management requirements), `ADMIN_DASHBOARD_SPECIFICATION.md` (editor workflows), `CONTENT_EVIDENCE_RULES.md` (evidence vocabulary), `SECURITY_AND_QUALITY.md` (integrity/security constraints), `IMPLEMENTATION_ROADMAP.md` (Phases 3–4, 9–11).

---

## 1. Purpose

Define a concrete, technology-neutral relational schema capable of representing — without loss — everything currently in:

- `content/projects.ts` (13 projects, as of this writing)
- `content/resume-data.ts` (personal, education, experience, achievements, financeAreas, technologyXFinanceAreas, skills, additionalVerifiedSkills)

and capable of *later* supporting, without a redesign, the CMS/admin requirements documented in `CMS_SPECIFICATION.md` and `ADMIN_DASHBOARD_SPECIFICATION.md`: draft/publish, revisions, audit logging, and media references.

This document does not choose PostgreSQL, Supabase, Prisma, Drizzle, or any other product. Every type name below (`text`, `enum`, `timestamp`, `integer`, `boolean`) is a logical type, not a vendor-specific one.

---

## 2. Design Principles

1. **Field-for-field justification.** Every column maps to a field that exists in `lib/types.ts` / `content/*.ts` today, or to a documented future CMS requirement (cited by section number). Nothing is invented because "CMS systems usually have this."
2. **Preserve the evidence model exactly.** `VerificationStatus`, `MetricStatus`, and `ImplementationStatus` remain three distinct vocabularies (per `CONTENT_EVIDENCE_RULES.md` §4–19). They are never collapsed into one generic `status` column.
3. **Repository boundary is untouched.** The schema is designed to be read by a future `lib/repositories/*` implementation that returns the same shapes the public UI already consumes. The UI never queries tables directly.
4. **Slugs stay public, IDs stay internal.** Public routing continues to use `slug`. Relationships between rows use internal surrogate keys, never strings.
5. **No premature normalization.** A list of strings with no independent identity (e.g. `technologyXFinanceAreas`) stays a simple child table, not a lookup + join.
6. **No premature CMS machinery.** Draft/publish, revisions, and audit are modeled here (per this phase's brief) but are explicitly *not* being implemented, and the model favors the simplest structure that satisfies a single-administrator CMS (per `ADMIN_DASHBOARD_SPECIFICATION.md` §63, §106) over a multi-tenant/multi-editor design.

---

## 3. Current Content Model (as actually inspected)

Read directly from `lib/types.ts`, `content/projects.ts`, `content/resume-data.ts`:

```text
Project {
  slug, title, alternateNames?, category, status, featured,
  shortDescription, problem?, approach?, architecture?,
  technologies[], results?[], metrics[Metric],
  githubUrl?, demoUrl?,
  evidenceStatus, verificationNotes,
  whatIsWorking?[], whatIsInDevelopment?[],
  implementationNotes?[ImplementationNote],
  relatedTo?[{slug, note}],
  source: "Resume" | "GitHub" | "Both"
}

Metric { label, value, kind, note?, source? }
ImplementationNote { label, status }

personal { name, location, phone, email, github, linkedin, summary }
education[] { institution, degree, duration, detail }
experience[] { title, organization, duration, bullets[] }
achievements[] { title, context, detail }
financeAreas[] { title, description }
technologyXFinanceAreas: string[]
skills: Record<categoryName, string[]>
additionalVerifiedSkills: string[]
```

No project currently has a media/image field. No admin/auth/database code exists anywhere in the repo (confirmed: no `app/admin`, no `app/api`, no ORM/DB/auth dependency in `package.json`). This document does not need to reconcile any documentation-vs-code disagreement — the two currently agree on what exists (a TypeScript content layer behind a thin repository) and on what does not (everything else in the roadmap).

---

## 4. Future Architecture

```text
CURRENT                                   FUTURE
UI / Pages / Components                   UI / Pages / Components
        ↓                                          ↓
lib/repositories/                         lib/repositories/
        ↓                                          ↓
content/*.ts                              database-backed implementation
                                                    ↓
                                                 DATABASE  (this document)
```

The repository functions (`getProjects`, `getProject`, `featuredProjects`, `personal`, `education`, …) keep their current signatures and return shapes. Only what is behind them changes.

---

## 5. Core Entities

| Domain | Entities |
|---|---|
| Project | `projects`, `project_alternate_names`, `project_metrics`, `project_implementation_notes`, `project_relationships`, `project_content_list_items`, `technologies`, `project_technologies` |
| Profile / Resume | `profile`, `education`, `experience`, `experience_highlights`, `achievements`, `skills`, `finance_areas`, `technology_finance_areas` |
| Future CMS (designed, not built) | `content_revisions`, `audit_log_entries`, `media_assets`, `media_references`, `navigation_items` |

Explicitly excluded from this phase (see §27): `users`, `roles`, `permissions`, `sessions`, `site_settings`.

---

## 6. Project Model

### `projects`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | Internal stable identifier (see §22) |
| `slug` | text, unique | yes | Public routing key — `Project.slug` |
| `title` | text | yes | `Project.title` |
| `short_description` | text | yes | `Project.shortDescription` |
| `problem` | text | no | `Project.problem` |
| `approach` | text | no | `Project.approach` |
| `architecture` | text | no | `Project.architecture` |
| `category` | controlled vocabulary | yes | `Project.category` (§9) |
| `status` | controlled vocabulary | yes | `Project.status` (§9) |
| `evidence_status` | controlled vocabulary | yes | `Project.evidenceStatus` (§9) |
| `verification_notes` | text | yes | `Project.verificationNotes` — never optional; every project has one today |
| `featured` | boolean | yes, default `false` | `Project.featured` — kept independent of `category` (see §7) |
| `source` | controlled vocabulary (`Resume`\|`GitHub`\|`Both`) | yes | `Project.source` |
| `github_url` | text | no | `Project.githubUrl` |
| `demo_url` | text | no | `Project.demoUrl` |
| `display_order` | integer | yes | **New field.** Not present in the TS model; required because `CMS_SPECIFICATION.md` §23 and §9 explicitly forbid relying on array/insertion order once content lives in a database. Initialize from current array position at migration time. |
| `publication_status` | controlled vocabulary (`draft`\|`published`\|`archived`) | yes, default `published` | Future field for §19. All 13 current projects migrate as `published` — the current site has no draft concept. |
| `published_at` | timestamp | no | Future field for §19 |
| `created_at` | timestamp | yes | Required for CMS management (§5); has no current source value — set to migration time for all rows on import |
| `updated_at` | timestamp | yes | Same as above |

Fields intentionally **not** added: `year`, `featuredImage`, `documentationUrl`, `subtitle` — these appear in `CMS_SPECIFICATION.md` §5 as *possible* future fields but have no corresponding data in the current `Project` type. Adding them now would violate CLAUDE.md §6 ("do not invent... fields") even though the invented values would be `NULL` — an empty column that nothing ever populates is still schema speculation.

### `project_alternate_names`

**5 of 13** projects currently use `alternateNames` — `the-inevitable`, `atdl-assignment`, `diabetes-prediction`, `dashboard-finance`, and `image-captioning-segmentation` — each with exactly one value. Most are plain repository names (e.g. `"ATDL_Assignment"`), but `the-inevitable`'s value is a full phrase with an embedded parenthetical note (`"The_Invitable (GitHub repository name)"`), mixing the name and an explanatory annotation in one field.

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `project_id` | FK → `projects.id`, cascade delete | yes | |
| `name` | text | yes | Preserve the string exactly as written, including any embedded note |
| `display_order` | integer | yes | |

A plain array/JSON column on `projects` would also satisfy this (see §26, Open Decisions) — a child table is chosen here for representational consistency with every other multi-valued project attribute below, not because the data demands relational querying.

### `project_technologies` / `technologies` (many-to-many)

`Project.technologies: string[]` is the one multi-valued field genuinely worth normalizing into a lookup + join, because `CMS_SPECIFICATION.md` §18 explicitly calls this out: technologies should be reusable entities so `Python`/`python`/`PYTHON` cannot coexist as different values across projects, and because a future "browse by technology" or admin technology-management view (§29 of the admin spec) needs technologies to be independently addressable.

**`technologies`**

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `name` | text, unique (case-insensitive) | yes | Canonical display name, e.g. `PyTorch` |

**`project_technologies`**

| Field | Type | Required | Purpose |
|---|---|---|---|
| `project_id` | FK → `projects.id`, cascade delete | yes | |
| `technology_id` | FK → `technologies.id`, restrict delete | yes | Restrict, not cascade — a technology referenced by any project must not silently disappear |
| `display_order` | integer | yes | Preserves the current per-project technology ordering (the order matters for the "Technology section" writing rule in `PROJECT_CONTENT_GUIDELINES.md` §14) |

Primary key: (`project_id`, `technology_id`).

---

## 7. Derived Data

The following are **never** persisted — they are computed at query time by the future repository implementation, exactly as `lib/repositories/project-repository.ts` computes them today:

| Value | Source | Derivation | Why not persisted |
|---|---|---|---|
| `featuredProjects` | `projects` | `WHERE featured = true ORDER BY display_order` | Trivial filter; persisting a duplicate list risks drift from the source rows |
| `getProject(slug)` | `projects` | `WHERE slug = :slug` (unique index) | A lookup, not a fact |
| Per-category groupings on `/projects` | `projects` | `WHERE category = :category`, grouped in application code exactly as `app/projects/page.tsx` does today | Presentation grouping, not content |
| Project count / dashboard summary stats (`ADMIN_DASHBOARD_SPECIFICATION.md` §9) | `projects` | `COUNT(*) GROUP BY status` etc. | Recomputed on every dashboard load; would go stale instantly if cached in a column |

`featured` itself is **not** derived from `category`, even though today every `featured: true` row also happens to have `category: "featured"`. `CMS_SPECIFICATION.md` §22 treats `featured` as an independent editorial flag (a "supporting" project could be featured without being reclassified), so the current 1:1 correlation is coincidental content, not a structural rule — collapsing it into a derived value would remove a capability the CMS spec explicitly wants.

---

## 8. Project Metrics

### `project_metrics`

Directly from the `Metric` interface — nothing added, nothing collapsed.

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `project_id` | FK → `projects.id`, cascade delete | yes | |
| `label` | text | yes | `Metric.label` |
| `value` | text | yes | `Metric.value` — **kept as text, not numeric.** Current values include `"94.50%"`, `"< 2s"`, `"15.49×"`, `"253,680 records"` — free-form strings with units baked in, per `CONTENT_EVIDENCE_RULES.md` §19 ("What is being measured / on what dataset / under what configuration" — the label+value pair is the display unit, not a bare float) |
| `kind` | controlled vocabulary (`MetricStatus`) | yes | `Metric.kind` — never merged with `evidence_status` |
| `note` | text | no | `Metric.note` |
| `source` | text | no | `Metric.source` — plain text pointer (e.g. `"results/task4_T2_comparison.json"`), not a validated URL; several real values are file paths, not links |
| `display_order` | integer | yes | New field — metrics are currently rendered in TS array order |

A metric row is meaningless without its parent project, so `project_id` is `NOT NULL` and cascades on delete — an orphaned metric (§24) is structurally impossible.

**Why not numeric columns:** `CMS_SPECIFICATION.md` §14 lists candidate value types (number, percentage, ratio, multiplier, range, text) precisely because a single numeric column cannot hold `"< 2s"` or `"50.1702% / 49.8298%"` pairs. Splitting `value` into `numeric_value` + `unit` + `comparator` columns was considered and rejected for this phase: it would require inventing a parser for values like `"11,164,352"` and `"4,810"` that doesn't exist today, and several current metrics (e.g. `"41"` disease classes, `"132"` symptom features) are scope facts, not measurements with units. If a future need arises to sort/filter metrics numerically, an optional nullable `numeric_value` column can be added additively without breaking `value`.

---

## 9. Implementation Notes

### `project_implementation_notes`

Only `cortex-lab` uses this field today (10 entries), but the shape is simple and evidence-sensitive enough to warrant its own table rather than folding into a generic list (§11 below), because each row carries a real second attribute (`status`) beyond label + order.

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `project_id` | FK → `projects.id`, cascade delete | yes | |
| `label` | text | yes | `ImplementationNote.label` |
| `status` | controlled vocabulary (`ImplementationStatus`) | yes | `ImplementationNote.status` |
| `display_order` | integer | yes | |

**Why a child table, not embedded JSON:** `CONTENT_EVIDENCE_RULES.md` §11 and §18 single out implementation-status claims as an area where "documentation and code can disagree" and where over-claiming is a known risk (The Inevitable, Cortex Lab). A first-class column with an enforced controlled vocabulary makes it structurally impossible to save an implementation note without a valid status — an embedded free-text blob would not.

**Why not many-to-many:** an implementation note is not a reusable fact (unlike a technology) — `"Timeline Agent (temporal/chronological reasoning)"` only ever means something in the context of `cortex-lab`. One-to-many via `project_id` is sufficient.

---

## 10. Project Relationships

### `project_relationships`

Directly from `relatedTo?: { slug: string; note: string }[]`, but resolved to internal IDs instead of raw slug strings — this is a genuine integrity improvement the database provides over the current TS array, where a typo'd slug would silently fail to resolve (`app/projects/[slug]/page.tsx` filters with `.filter((r) => r.project)`, silently dropping unresolvable entries).

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `source_project_id` | FK → `projects.id`, cascade delete | yes | The project that declares the relationship |
| `related_project_id` | FK → `projects.id`, cascade delete | yes | The referenced project |
| `note` | text | yes | `relatedTo[].note` — e.g. `"Name-plausible GitHub match — relationship unconfirmed"` |
| `display_order` | integer | yes | |

Constraints:
- `CHECK (source_project_id <> related_project_id)` — a project cannot relate to itself.
- `UNIQUE (source_project_id, related_project_id)` — prevents the same pair being declared twice; a project *can* still be the `related_project_id` of many different sources.
- **Deliberately not symmetric.** As specified, `healthcare-ai-assistant → healthcare-prediction-main` does not imply the reverse row exists. Today it doesn't (only `relatedTo` on the placeholder repos points back). The UI already treats this as directional (`project.relatedTo` is read only from the current project's own row).

**No `relationship_type` column.** The brief allows one "if genuinely justified" — the current data has exactly one shape of relationship ("possible/unconfirmed match," expressed entirely in free-text `note`), so a type enum would have exactly one meaningful value today. Adding it now would be speculative; it can be added additively later if a second relationship shape (e.g. a confirmed "supersedes" or "uses techniques from") actually appears in content.

All four `relatedTo` targets in the current data (`healthcare-prediction-main`, `healthcare-prediction` ×2, and the reverse entries) resolve to real rows already present in `content/projects.ts` — verified by inspection. No dangling reference exists to flag under §26.

---

## 11. Ordered Content Lists (`results`, `whatIsWorking`, `whatIsInDevelopment`)

These three `Project` fields (`results?: string[]`, `whatIsWorking?: string[]`, `whatIsInDevelopment?: string[]`) are structurally identical: an ordered list of plain-text bullets with no independent attributes beyond text and position.

### `project_content_list_items`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `project_id` | FK → `projects.id`, cascade delete | yes | |
| `list_type` | controlled vocabulary (`results`\|`what_is_working`\|`what_is_in_development`) | yes | Discriminates which TS field this row came from |
| `body` | text | yes | The bullet text |
| `display_order` | integer | yes | |

**One discriminated table vs. three separate tables:** three separate tables (`project_results`, `project_working_items`, `project_development_items`) would be marginally more explicit but triple the schema surface for three lists that are read, rendered, and validated identically today (see `app/projects/[slug]/page.tsx` lines 130–176 — all three render through the same list-with-bullet pattern). A single discriminated table is chosen as the simpler option consistent with §89 of `IMPLEMENTATION_ROADMAP.md` ("if a simple solution satisfies the requirement, prefer the simple solution"). This is listed as an Open Decision (§26) because the three-table split is a legitimate alternative if `whatIsWorking` items ever need their own `evidence_status` independent of the project's (not currently needed — the project-level `evidence_status` and `verification_notes` already cover this).

This table is also the natural forward path toward `CMS_SPECIFICATION.md`'s flexible "project sections" system (§6–10 of that document: `results`, `future-work`, etc. as named section types) — but building that general section registry is explicitly out of scope for this phase (§27).

---

## 12. Profile Model

`content/resume-data.ts` exports eight top-level structures. Each is evaluated individually below rather than assumed to need its own table.

### `profile` (singleton)

`personal` is a single object — there is exactly one portfolio owner. Modeled as a table constrained to exactly one row rather than a config blob, so it participates in normal relational tooling (child tables can still `FK → profile.id`).

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key, `CHECK (id = 1)` | yes | Enforces singleton — see §24 |
| `name` | text | yes | `personal.name` |
| `location` | text | yes | `personal.location` |
| `phone` | text | yes | `personal.phone` |
| `email` | text | yes | `personal.email` |
| `github_url` | text | yes | `personal.github` |
| `linkedin_url` | text | yes | `personal.linkedin` |
| `summary` | text | yes | `personal.summary` |
| `updated_at` | timestamp | yes | CMS management |

No `headline`, `profileImage`, or `resume` column — `CMS_SPECIFICATION.md` §26 lists these as *possible* future profile fields, but the current `personal` object has no headline (only prose `summary`) and no image reference field at all (the resume PDF is served as a static public asset today, referenced by a hard-coded `/resume.pdf` link in three pages, not by any data field). Adding them now would be unsupported speculation.

### `education`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `profile_id` | FK → `profile.id`, cascade delete | yes | |
| `institution` | text | yes | |
| `degree` | text | yes | |
| `duration` | text | yes | **Kept as free text**, not `start_date`/`end_date` — see Migration Safety (§26): current values are `"2023 — Present"` and `"2017 — 2023"`; `"Present"` is not a date, and splitting this now would require inventing an end-date convention the source data doesn't express |
| `detail` | text | no | e.g. `"100% Merit Scholarship · 2023–2027 · CGPA 7.89/10"` |
| `display_order` | integer | yes | Preserves "most recent first" ordering already documented in the source comment |

### `experience` / `experience_highlights`

`experience[].bullets: string[]` is a genuine one-to-many (each job has multiple, ordered, independent highlight sentences) — matches `CMS_SPECIFICATION.md` §27's `highlights` field.

**`experience`**

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `profile_id` | FK → `profile.id`, cascade delete | yes | |
| `title` | text | yes | |
| `organization` | text | yes | |
| `duration` | text | yes | Same free-text rationale as `education.duration` (current value: `"Apr 2025 – Jun 2025"`) |
| `display_order` | integer | yes | |

**`experience_highlights`**

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `experience_id` | FK → `experience.id`, cascade delete | yes | |
| `body` | text | yes | One `bullets[]` entry |
| `display_order` | integer | yes | |

### `achievements`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `profile_id` | FK → `profile.id`, cascade delete | yes | |
| `title` | text | yes | |
| `context` | text | yes | |
| `detail` | text | yes | Preserved verbatim — currently includes an inline `"[NEEDS INFORMATION — ...]"` marker for one entry. This is *not* converted into a structured `evidence_status` column (see §26 Open Decisions) because `Achievement` has no such field in the current type; the marker stays in the text exactly as authored |
| `display_order` | integer | yes | |

### `skills`

`skills: Record<string, string[]>` (a category name mapping to an array of skill strings) plus the separate `additionalVerifiedSkills: string[]` list, which the code comment explicitly says must be **shown separately so the site never implies these came from the resume** — a provenance distinction, not a cosmetic one.

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `profile_id` | FK → `profile.id`, cascade delete | yes | |
| `category` | text | yes | e.g. `"ML / DL"`. Stored as plain text on the row rather than a separate `skill_categories` lookup table — no other entity references a skill category, so a join table would be pure overhead (see §26 Open Decisions for the alternative) |
| `name` | text | yes | e.g. `"PyTorch"` |
| `source` | controlled vocabulary (`resume`\|`github`) | yes | Preserves the resume-vs-GitHub-verified distinction. `additionalVerifiedSkills` entries get `category = NULL`, `source = 'github'`; every entry from `skills` gets `source = 'resume'` |
| `display_order` | integer | yes | Orders both categories (first appearance) and skills within a category |

Reusing one table instead of two (`skills` + `additional_verified_skills`) keeps "a skill" as a single concept with a provenance flag, rather than two structurally identical tables whose only difference is which resume field produced them.

### `finance_areas`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `profile_id` | FK → `profile.id`, cascade delete | yes | |
| `title` | text | yes | |
| `description` | text | yes | |
| `display_order` | integer | yes | |

### `technology_finance_areas`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `profile_id` | FK → `profile.id`, cascade delete | yes | |
| `label` | text | yes | e.g. `"Portfolio analytics"` |
| `display_order` | integer | yes | |

Kept as a simple flat list, explicitly not projects and not cross-referenced with anything — matches the source comment ("Deliberately NOT presented as projects — none of these exist as shipped work").

---

## 13–17. (Consolidated above)

Sections 13 (Education), 14 (Experience), 15 (Achievements), 16 (Skills/Taxonomies), and 17 (Finance / Technology × Finance) from the brief are addressed together in §12, since each is a straightforward one-to-many under `profile` with no cross-cutting design questions between them.

---

## 18. Navigation

Per instruction, kept fully separate from `projects`/`profile`. Not implemented. If ever persisted:

### `navigation_items` (conceptual only)

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `label` | text | yes | |
| `href` | text | yes | |
| `type` | controlled vocabulary (`internal`\|`external`) | yes | |
| `display_order` | integer | yes | |
| `visibility` | controlled vocabulary (`visible`\|`hidden`) | yes | |
| `open_in_new_tab` | boolean | yes | |

Today's navigation (`components/nav.tsx`) is presumably a hard-coded list matching the five public routes — there is no current data to migrate here. This table would only matter once navigation actually needs to be edited without a code change (`CMS_SPECIFICATION.md` §38).

---

## 19. Draft / Publish

**Design only — the mechanism below is not built.**

Two structural options were weighed:

**Option A — status column on the live row (recommended).** `projects.publication_status` (`draft`\|`published`\|`archived`) lives directly on `projects`. There is one row per project; the admin always edits that row. "Preview" means an authenticated request rendering a `draft` row through the normal public renderer; "publish" means flipping `publication_status` to `published` and stamping `published_at`. The public read path adds `WHERE publication_status = 'published'` (matches `CMS_SPECIFICATION.md` §59).

**Option B — shadow draft table.** A separate `project_drafts` table holds in-progress edits keyed to a project; publishing copies draft → live. This isolates in-progress edits from the current public row more strongly (useful with concurrent editors), at the cost of a second, mostly-duplicate schema to keep in sync.

**Recommendation: Option A.** `ADMIN_DASHBOARD_SPECIFICATION.md` §63 and §106 are explicit that a single-trusted-administrator system should not carry enterprise-CMS machinery it doesn't need. Nothing in the current requirements implies concurrent editors working on the same project simultaneously. Option A is recorded as the default; Option B is kept as an Open Decision (§26) if multi-editor support ever becomes a real requirement.

Publication state is placed **on the entity itself**, not in a separate `publication_states` table, because every content entity that will eventually need it (`projects`, and later `profile`, `education`, etc.) needs exactly one active state at a time — a separate table would only add a join for no extra expressiveness.

---

## 20. Revisions

**Design only — not built.**

### `content_revisions` (conceptual)

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `entity_type` | controlled vocabulary (`project`\|`profile`\|`education`\|…) | yes | Which table the snapshot belongs to |
| `entity_id` | integer/UUID (matches the entity's surrogate key type) | yes | Polymorphic reference — see trade-off below |
| `version_number` | integer | yes | Monotonic per `(entity_type, entity_id)` |
| `snapshot` | structured blob (JSON or equivalent) | yes | Full denormalized copy of the entity + its children at save time |
| `publication_status_at_revision` | controlled vocabulary | yes | What state this snapshot represents |
| `change_summary` | text | no | `CMS_SPECIFICATION.md` §47 |
| `created_by` | reference to a future `users` table | no | Out of scope now (§27); nullable placeholder |
| `created_at` | timestamp | yes | |

**Generic/polymorphic table vs. one revisions table per entity:** a polymorphic `(entity_type, entity_id)` pair cannot carry a real foreign key in most relational databases (a single FK can't point at "whichever table `entity_type` names"), which is a genuine integrity trade-off. The alternative — `project_revisions`, `profile_revisions`, `education_revisions`, … each with a proper FK — preserves referential integrity but multiplies tables for a feature only `projects` needs urgently (per `IMPLEMENTATION_ROADMAP.md` Phase 10, which follows Phase 7 "Project CMS," not the profile CMS). **Recommendation:** a single generic `content_revisions` table now, accepting the FK trade-off, because revisions are read (not joined against) far more than they're written, and the roadmap's own instruction (§20 of this phase's brief) is "avoid an unnecessarily complicated event-sourcing system." This is listed as an Open Decision (§26).

**Why a full snapshot, not a diff:** diffing requires knowing the shape of the previous version to compute against, which turns "restore" into a replay engine. A snapshot makes restore a straight copy (`CMS_SPECIFICATION.md` §49: "Restore should create a new revision, preserve the old revision" — trivial with snapshots, non-trivial with diffs).

**Relationship to content data:** `content_revisions` never feeds the public read path. It is administrative history only, read by `/admin/revisions` (per `ADMIN_DASHBOARD_SPECIFICATION.md` §56–59), never by `app/projects/*`.

---

## 21. Audit Events

**Design only — not built.**

### `audit_log_entries` (conceptual)

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | surrogate key | yes | |
| `actor` | text or reference to a future `users` table | yes | "Who" — kept as plain text for now (e.g. `"admin"`) since no user model exists yet |
| `action` | controlled vocabulary (`CREATE`\|`UPDATE`\|`PUBLISH`\|`UNPUBLISH`\|`ARCHIVE`\|`DELETE`\|`RESTORE`\|`UPLOAD`\|`REPLACE_MEDIA`\|`LOGIN`\|`PERMISSION_CHANGE`) | yes | Per `CMS_SPECIFICATION.md` §50 |
| `entity_type` | text | no | Nullable — `LOGIN` has no entity |
| `entity_id` | integer/UUID | no | Nullable, same reason |
| `summary` | text | yes | Human-readable one-liner; never a raw payload dump |
| `created_at` | timestamp | yes | |

**Explicitly distinct from `content_revisions`:** an audit entry records *that an action happened*; a revision records *what the content looked like*. Publishing a project produces one audit entry (`PUBLISH`, summary: "Published The Inevitable") and, separately, one revision snapshot. Collapsing the two (as `IMPLEMENTATION_ROADMAP.md` §21 warns against) would make it impossible to answer "who logged in on this date" without wading through content snapshots, and impossible to inspect old content without wading through action logs.

**Data minimization:** per `SECURITY_AND_QUALITY.md` §55 and §821, no field here ever stores a credential, token, or full form payload — `summary` is deliberately a short derived sentence, not a serialized request body.

---

## 22. Identifiers & Slugs

**Surrogate key type:** either an auto-incrementing integer or a UUID satisfies every constraint in this document equally well; the choice is deferred to implementation (recorded as an Open Decision, §26) because it depends on the eventual database/ORM choice this phase explicitly avoids making. What *is* decided now: **every table gets an internal surrogate key**, and **no relationship in this schema is ever built on a slug string** — `project_relationships`, `project_metrics`, `project_technologies`, etc. all reference `projects.id`, never `projects.slug`.

**Slugs remain public and stable.** `projects.slug` keeps its `UNIQUE NOT NULL` constraint and continues to be the only thing `generateStaticParams()` and `getProject(slug)` need. Per `CMS_SPECIFICATION.md` §57–58, if a slug is ever changed after publication, that is a content-migration event requiring a redirect strategy — out of scope for this design document, but the separation of internal ID from public slug is exactly what makes that future redirect strategy possible without touching every foreign key in the database.

---

## 23. Constraints & Integrity

| Concern | Constraint |
|---|---|
| Project slug uniqueness | `UNIQUE (projects.slug)`, `NOT NULL` |
| Self-referential relationship validity | `CHECK (source_project_id <> related_project_id)`; `UNIQUE (source_project_id, related_project_id)` |
| Orphaned metrics | `project_metrics.project_id NOT NULL`, `FK ... ON DELETE CASCADE` |
| Orphaned implementation notes | Same pattern as metrics |
| Orphaned content-list items | Same pattern as metrics |
| Invalid evidence/status/kind values | Controlled vocabulary (enum or `CHECK` list) on `projects.category`, `.status`, `.evidence_status`; `project_metrics.kind`; `project_implementation_notes.status`; `projects.source`; `skills.source` |
| Duplicate profile records | `profile` constrained to a single row (`CHECK (id = 1)`, or an equivalent singleton-enforcing mechanism the target database supports) |
| Invalid relationship targets | `project_relationships.related_project_id` is a real `FK → projects.id` — a typo can no longer produce a silently-dropped reference the way today's raw-slug array can |
| Duplicate technology names | `UNIQUE` on `technologies.name`, compared case-insensitively |
| Technology deletion safety | `project_technologies.technology_id` is `ON DELETE RESTRICT` — a technology in use cannot vanish out from under a project |

Nothing here introduces a constraint the roadmap doesn't already call for (`IMPLEMENTATION_ROADMAP.md` §24, `SECURITY_AND_QUALITY.md` §27, §32).

---

## 24. Current TypeScript → Future Database Mapping

| Current source | Future table(s) | Notes |
|---|---|---|
| `content/projects.ts` → each `Project` object | `projects` | 1 row per project, 13 rows at migration |
| `Project.alternateNames` | `project_alternate_names` | 5 of 13 projects populate this today, one value each |
| `Project.technologies` | `technologies` + `project_technologies` | Deduplicated across all projects at import time |
| `Project.results` | `project_content_list_items` (`list_type = 'results'`) | |
| `Project.whatIsWorking` | `project_content_list_items` (`list_type = 'what_is_working'`) | |
| `Project.whatIsInDevelopment` | `project_content_list_items` (`list_type = 'what_is_in_development'`) | |
| `Project.metrics` | `project_metrics` | |
| `Project.implementationNotes` | `project_implementation_notes` | Only `cortex-lab` populates this today |
| `Project.relatedTo` | `project_relationships` | Slugs resolved to internal IDs at import time |
| `content/resume-data.ts` → `personal` | `profile` (1 row) | |
| `education[]` | `education` | 2 rows at migration |
| `experience[]` + `.bullets` | `experience` + `experience_highlights` | 1 experience row, 3 highlight rows at migration |
| `achievements[]` | `achievements` | 2 rows at migration |
| `financeAreas[]` | `finance_areas` | 6 rows at migration |
| `technologyXFinanceAreas` | `technology_finance_areas` | 7 rows at migration |
| `skills` (Record) | `skills` (`source = 'resume'`) | Category preserved as text per row |
| `additionalVerifiedSkills` | `skills` (`source = 'github'`, `category = NULL`) | 11 rows at migration |

**Intentionally not persisted anywhere:** `featuredProjects`, `getProject()` — see §7.

**Nothing in the current content is unmappable.** Every field in `lib/types.ts` and both `content/*.ts` files has an explicit destination above. The two migration-safety notes below (§25) are about *representation fidelity*, not data loss.

---

## 25. Migration Strategy

Per `CMS_SPECIFICATION.md` §61 and `IMPLEMENTATION_ROADMAP.md` §23 and §77 — described here, not executed:

```text
content/projects.ts + content/resume-data.ts   (existing TS)
        ↓
Normalize   — resolve technology name casing, resolve relatedTo slugs → IDs
        ↓
Validate    — every controlled-vocabulary value maps to an allowed enum member
        ↓
Import      — write to a development database
        ↓
Compare     — re-render each project/profile page from DB-backed repository
              vs. current TS-backed repository; diff the HTML/props
        ↓
Verify      — 13/13 projects, 1/1 profile, byte-for-byte equivalent content
        ↓
Switch Read Path   — lib/repositories/* now reads the database
        ↓
Enable CMS Editing — only after the read path has been running unchanged
```

One project should migrate first as a pilot (`IMPLEMENTATION_ROADMAP.md` §77–78 recommends starting with **The Inevitable**, being the most structurally complex), be compared, and be approved before the remaining 11 follow — never a single bulk import with no checkpoint.

**Rollback:** until "Switch Read Path" happens, `content/*.ts` remains untouched and the TypeScript repository implementation keeps working exactly as it does today — the database can be dropped and recreated at any point during Normalize/Validate/Import/Compare with zero risk to the live site.

---

## 26. Open Decisions

These are choices this document deliberately leaves for the technology-selection phase or for explicit future confirmation, listed so they are not silently decided by whoever implements first:

1. **Surrogate key type** — integer identity vs. UUID (§22).
2. **Controlled-vocabulary representation** — native DB enum / `CHECK` constraint vs. a separate lookup table per vocabulary. This document recommends enum/`CHECK` for all six vocabularies (`ProjectCategory`, `ProjectStatus`, `VerificationStatus`, `MetricStatus`, `ImplementationStatus`, `Project.source`, `skills.source`) because they are documentation-governed and rarely change, not end-user-editable lists. Revisit if the admin dashboard ever needs to let an editor rename or add a vocabulary value through the UI.
3. **Should the reserved-but-unused `VerificationStatus` values (`in-development`, `planned`)** — marked in `lib/types.ts` as "retained for backward compatibility only, no project currently uses either" — be included in the initial DB enum, or dropped and re-added only if actually needed? Recommendation: include them, to guarantee the enum is a strict superset of the TS union during migration.
4. **`project_content_list_items`** as one discriminated table vs. three separate tables (§11) — recommendation given, alternative preserved.
5. **`content_revisions`** as one polymorphic table vs. per-entity revision tables (§20) — recommendation given (polymorphic), alternative preserved for when Phase 12 (Profile CMS) makes profile revisions a real requirement.
6. **Draft/publish**: status-on-entity (Option A, recommended) vs. shadow draft table (Option B) — §19.
7. **`skills.category`** as a plain text column (recommended) vs. a normalized `skill_categories` lookup table — revisit only if categories need independent reordering/renaming through the admin UI as their own entity.
8. **`education.duration` / `experience.duration`** — kept as free text now. Whether to eventually parse into `start_date`/`end_date` depends on deciding how to represent "Present" as an open-ended end date, which the current source data does not need to answer yet.
9. **Case-insensitive uniqueness mechanism for `technologies.name`** — depends on the chosen database's collation/extension support (e.g. `citext`-equivalent vs. a normalized lowercase shadow column).
10. **`project_alternate_names` as a child table vs. a native array/JSON column** on `projects` — functionally equivalent for this data; child table chosen only for representational consistency with the other multi-valued project attributes.

None of these decisions block moving to Phase 3/4 implementation once a database technology is chosen — each has a stated, justified default.

---

## 27. Explicitly Out of Scope

Per the phase brief and `IMPLEMENTATION_ROADMAP.md` §86–89, the following are **not** addressed by this document and must not be inferred from it:

- Choice of database engine, hosting provider, or ORM.
- `users`, `roles`, `permissions`, `sessions` — authentication/authorization is Phase 5 of the roadmap and its own architectural decision (`PORTFOLIO_ARCHITECTURE.md` §22–24); this document only leaves nullable placeholder references (`created_by` on revisions, `actor` on audit entries) for a future user model to attach to.
- `site_settings` — no current data source for this exists.
- Media storage implementation — `media_assets`/`media_references` are named in §5 as anticipated future entities per `CMS_SPECIFICATION.md` §32–37, but no current `Project` or `profile` field references an image, so no concrete schema is proposed here beyond acknowledging the future join point will be a polymorphic `media_references(media_id, entity_type, entity_id, field_key, display_order)` table, populated only once an actual image field is added to a content model.
- Search indexing, analytics, content-health dashboards, navigation persistence beyond the sketch in §18.
- Any migration script, seed script, or schema-definition file (SQL DDL, Prisma schema, Drizzle schema, etc.).
- Any change to `lib/repositories/*`, `content/*.ts`, `app/*`, `components/*`, or `package.json`.

---

## 28. Final Note

Every table above exists because a field it represents is either (a) currently populated in `content/projects.ts` or `content/resume-data.ts`, or (b) explicitly required by a cited section of `CMS_SPECIFICATION.md` / `ADMIN_DASHBOARD_SPECIFICATION.md` for functionality named in the roadmap (display ordering, timestamps, publication state, revisions, audit). Nothing was added because it is common in CMS systems generally. The eventual migration described in §25 should be able to reproduce all 13 projects and the full profile content with zero loss, and the two representation caveats in this document (`alternateNames` formatting, free-text `duration` fields) are flagged, not silently resolved — per `CLAUDE.md` §21: when in doubt, do not guess.
