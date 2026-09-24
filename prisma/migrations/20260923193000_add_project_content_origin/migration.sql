-- Phase 7: content provenance on projects (CMS_SPECIFICATION.md §63, §60).
--
-- Purely additive. Every existing row takes the default, so the 13 rows
-- written by db:import keep their meaning with no backfill. Nothing is
-- dropped, renamed, or rewritten.
--
-- This migration was generated with `prisma migrate diff --from-config-datasource`
-- and applied with `prisma migrate deploy`, NOT `migrate dev` — deploy only
-- applies pending migrations and can never offer to reset the database. The
-- two CHECK constraints hand-appended to 20260905021148_init/migration.sql
-- (project_relationships_no_self_reference, profile_singleton) are therefore
-- untouched; the generated diff confirmed it proposes no change to them.
--
-- Reverting, if ever needed:
--   ALTER TABLE "projects" DROP COLUMN "content_origin";
--   DROP TYPE "content_origin";

-- CreateEnum
CREATE TYPE "content_origin" AS ENUM ('typescript-import', 'cms');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "content_origin" "content_origin" NOT NULL DEFAULT 'typescript-import';
