-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "project_category" AS ENUM ('featured', 'supporting', 'research', 'coming-soon');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('Completed', 'Active Development', 'Internship Project', 'Research / Experimental', 'Repository Placeholder', 'Unpublished');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('verified', 'partially-verified', 'self-reported', 'unpublished', 'needs-information', 'in-development', 'planned');

-- CreateEnum
CREATE TYPE "metric_status" AS ENUM ('verified-result', 'target', 'scope', 'dataset-fact', 'measured', 'derived', 'assumption', 'needs-verification');

-- CreateEnum
CREATE TYPE "implementation_status" AS ENUM ('implemented', 'experimental', 'specified', 'in-development', 'planned', 'future');

-- CreateEnum
CREATE TYPE "project_source" AS ENUM ('Resume', 'GitHub', 'Both');

-- CreateEnum
CREATE TYPE "content_list_type" AS ENUM ('results', 'what_is_working', 'what_is_in_development');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "skill_source" AS ENUM ('resume', 'github');

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "problem" TEXT,
    "approach" TEXT,
    "architecture" TEXT,
    "category" "project_category" NOT NULL,
    "status" "project_status" NOT NULL,
    "evidence_status" "verification_status" NOT NULL,
    "verification_notes" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "source" "project_source" NOT NULL,
    "github_url" TEXT,
    "demo_url" TEXT,
    "display_order" INTEGER NOT NULL,
    "publication_status" "publication_status" NOT NULL DEFAULT 'published',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_alternate_names" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_alternate_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_metrics" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "kind" "metric_status" NOT NULL,
    "note" TEXT,
    "source" TEXT,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_implementation_notes" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "implementation_status" NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_implementation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_relationships" (
    "id" SERIAL NOT NULL,
    "source_project_id" INTEGER NOT NULL,
    "related_project_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_content_list_items" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "list_type" "content_list_type" NOT NULL,
    "body" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_content_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_technologies" (
    "project_id" INTEGER NOT NULL,
    "technology_id" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_technologies_pkey" PRIMARY KEY ("project_id","technology_id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "github_url" TEXT NOT NULL,
    "linkedin_url" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "detail" TEXT,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_highlights" (
    "id" SERIAL NOT NULL,
    "experience_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "experience_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "source" "skill_source" NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_areas" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "finance_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_finance_areas" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "technology_finance_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_category_display_order_idx" ON "projects"("category", "display_order");

-- CreateIndex
CREATE INDEX "projects_featured_display_order_idx" ON "projects"("featured", "display_order");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_publication_status_idx" ON "projects"("publication_status");

-- CreateIndex
CREATE INDEX "project_alternate_names_project_id_idx" ON "project_alternate_names"("project_id");

-- CreateIndex
CREATE INDEX "project_metrics_project_id_idx" ON "project_metrics"("project_id");

-- CreateIndex
CREATE INDEX "project_implementation_notes_project_id_idx" ON "project_implementation_notes"("project_id");

-- CreateIndex
CREATE INDEX "project_relationships_related_project_id_idx" ON "project_relationships"("related_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_relationships_source_project_id_related_project_id_key" ON "project_relationships"("source_project_id", "related_project_id");

-- CreateIndex
CREATE INDEX "project_content_list_items_project_id_list_type_idx" ON "project_content_list_items"("project_id", "list_type");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_name_key" ON "technologies"("name");

-- CreateIndex
CREATE INDEX "project_technologies_technology_id_idx" ON "project_technologies"("technology_id");

-- CreateIndex
CREATE INDEX "education_profile_id_idx" ON "education"("profile_id");

-- CreateIndex
CREATE INDEX "experience_profile_id_idx" ON "experience"("profile_id");

-- CreateIndex
CREATE INDEX "experience_highlights_experience_id_idx" ON "experience_highlights"("experience_id");

-- CreateIndex
CREATE INDEX "achievements_profile_id_idx" ON "achievements"("profile_id");

-- CreateIndex
CREATE INDEX "skills_profile_id_idx" ON "skills"("profile_id");

-- CreateIndex
CREATE INDEX "finance_areas_profile_id_idx" ON "finance_areas"("profile_id");

-- CreateIndex
CREATE INDEX "technology_finance_areas_profile_id_idx" ON "technology_finance_areas"("profile_id");

-- AddForeignKey
ALTER TABLE "project_alternate_names" ADD CONSTRAINT "project_alternate_names_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_metrics" ADD CONSTRAINT "project_metrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_implementation_notes" ADD CONSTRAINT "project_implementation_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_relationships" ADD CONSTRAINT "project_relationships_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_relationships" ADD CONSTRAINT "project_relationships_related_project_id_fkey" FOREIGN KEY ("related_project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_content_list_items" ADD CONSTRAINT "project_content_list_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience" ADD CONSTRAINT "experience_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_highlights" ADD CONSTRAINT "experience_highlights_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_areas" ADD CONSTRAINT "finance_areas_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_finance_areas" ADD CONSTRAINT "technology_finance_areas_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- HAND-ADDED CHECK CONSTRAINTS
--
-- The two constraints below are NOT generated by Prisma. They were added
-- manually because **Prisma 7.10.0 has no schema-level mechanism for CHECK
-- constraints**, verified three ways before writing them:
--   1. No `@@check` string exists anywhere in the installed prisma/@prisma
--      packages (`CheckConstraint` appears only in Prisma Studio's display code).
--   2. `prisma validate` rejects `@@check(...)` with P1012:
--      "This line is not a valid field or attribute definition."
--   3. The CLI enumerates every valid 7.10.0 preview feature —
--      fullTextSearchPostgres, nativeDistinct, partialIndexes,
--      postgresqlExtensions, relationJoins, schemaEngineDriverAdapters,
--      shardKeys, strictUndefinedChecks, typedSql, views — none of which
--      relate to check constraints.
--
-- Both constraints are part of the approved design (docs/DATABASE_DESIGN.md
-- §23) and were explicitly approved for hand-addition in Phase 7B-1.
--
-- ⚠ MAINTENANCE WARNING: because these are not expressible in
-- prisma/schema.prisma, regenerating this migration from the schema (e.g. via
-- `prisma migrate diff --from-empty --to-schema=...`) WILL SILENTLY DROP THEM.
-- If this file is ever regenerated, re-append this entire block.
-- ===========================================================================

-- Constraint A (DATABASE_DESIGN.md §10, §23): a project must not declare a
-- relationship to itself. Complements the UNIQUE(source, related) index, which
-- prevents duplicate pairs but not self-reference.
ALTER TABLE "project_relationships"
  ADD CONSTRAINT "project_relationships_no_self_reference"
  CHECK ("source_project_id" <> "related_project_id");

-- Constraint B (DATABASE_DESIGN.md §12, §23): the profile table is a singleton.
-- "id" is the primary key (therefore unique) and this CHECK admits only the
-- value 1, so at most one profile row can ever exist. Note precisely what this
-- does and does not guarantee: it makes a second row impossible, but it cannot
-- force a row to exist — an empty profile table still satisfies it. Row
-- existence is guaranteed by the import process, not by this constraint.
ALTER TABLE "profile"
  ADD CONSTRAINT "profile_singleton"
  CHECK ("id" = 1);
