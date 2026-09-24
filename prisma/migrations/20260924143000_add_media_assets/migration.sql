-- Phase 8: managed media assets (CMS_SPECIFICATION.md 32-37,
-- SECURITY_AND_QUALITY.md 33-40, DATABASE_DESIGN.md 5 and 575).
--
-- Purely additive: one new enum, one new table, one unique index. No existing
-- table is altered, renamed or dropped, so no existing row is touched and the
-- two hand-added CHECK constraints in 20260905021148_init (profile_singleton,
-- project_relationships_no_self_reference) are unaffected -- the generated
-- diff proposes no change to them.
--
-- The `data` column is BYTEA: the asset's bytes live in the same row as its
-- metadata so that replace and delete are one atomic operation, there is no
-- second system for a file to be orphaned in, and there is no filesystem path
-- for an attacker to traverse. See the MediaAsset model for the full rationale
-- and for the scale limits this trades away.
--
-- Generated with `prisma migrate diff --from-config-datasource` and applied
-- with `prisma migrate deploy`, NOT `migrate dev`: deploy only applies pending
-- migrations and can never offer to reset the database.
--
-- Reverting, if ever needed:
--   DROP TABLE "media_assets";
--   DROP TYPE "media_slot";

-- CreateEnum
CREATE TYPE "media_slot" AS ENUM ('profile-photo', 'resume');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" SERIAL NOT NULL,
    "slot" "media_slot" NOT NULL,
    "data" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "caption" TEXT,
    "title" TEXT,
    "download_label" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_slot_key" ON "media_assets"("slot");
