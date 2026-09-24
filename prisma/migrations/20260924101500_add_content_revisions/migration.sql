-- Phase 10: content revisions (DATABASE_DESIGN.md 20, CMS_SPECIFICATION.md 47-49).
--
-- Purely additive: one new enum, one new table, two new indexes. No existing
-- table is altered, renamed or dropped, so no existing row is touched and the
-- two hand-added CHECK constraints in 20260905021148_init (profile_singleton,
-- project_relationships_no_self_reference) are unaffected -- the generated
-- diff proposes no change to them.
--
-- Generated with `prisma migrate diff --from-config-datasource` and applied
-- with `prisma migrate deploy`, NOT `migrate dev`: deploy only applies pending
-- migrations and can never offer to reset the database.
--
-- Reverting, if ever needed:
--   DROP TABLE "content_revisions";
--   DROP TYPE "revision_entity_type";

-- CreateEnum
CREATE TYPE "revision_entity_type" AS ENUM ('project');

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" SERIAL NOT NULL,
    "entity_type" "revision_entity_type" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "publication_status_at_revision" "publication_status" NOT NULL,
    "change_summary" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_revisions_entity_type_entity_id_created_at_idx" ON "content_revisions"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_revisions_entity_type_entity_id_version_number_key" ON "content_revisions"("entity_type", "entity_id", "version_number");
