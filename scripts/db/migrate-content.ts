// Phase 7B-1 — CLI entry point for the content migration pipeline.
//
//     content/*.ts → Normalize → Validate → Import → Compare → Verify
//     (docs/DATABASE_DESIGN.md §25)
//
// Usage:
//   npx tsx scripts/db/migrate-content.ts status
//   npx tsx scripts/db/migrate-content.ts validate
//   npx tsx scripts/db/migrate-content.ts import   [--only=slug,slug] [--no-profile] [--dry-run] [--allow-deletes] [--overwrite-cms]
//   npx tsx scripts/db/migrate-content.ts compare  [--only=slug,slug] [--no-profile]
//   npx tsx scripts/db/migrate-content.ts verify
//   npx tsx scripts/db/migrate-content.ts idempotency --allow-deletes
//
// ── Destructive-write guard ────────────────────────────────────────────────
// `import` replaces child rows wholesale, so a re-run deletes rows that a
// previous run wrote. The command therefore refuses to proceed if its plan
// would delete anything, unless `--allow-deletes` is passed explicitly. A
// first import into an empty database deletes nothing and needs no flag.
//
// Nothing here ever drops a table, drops the database, or writes to
// content/*.ts. The database is a derived replica and can be rebuilt from
// TypeScript at any time (DATABASE_DESIGN.md §25, "Rollback").

import type { PrismaClient } from "@/lib/generated/prisma/client";
import { diffRowCounts, emptyVsAbsentArrayNotes } from "@/lib/content/canonical";
import {
  compareAll,
  contentFingerprint,
  formatComparisonReport,
  readRowCounts,
} from "./compare";
import { cmsOverwriteRefusal, planImport, runImport, type ImportReport } from "./import";
import { normalize, type RowCountManifest } from "./normalize";
import { formatValidationResult, validate } from "./validate";

// `validate` is pure and must run without a database — importing lib/db.ts
// eagerly would open a client (and throw on a missing DATABASE_URL) even for
// the commands that never touch PostgreSQL.
let client: PrismaClient | undefined;
async function db(): Promise<PrismaClient> {
  if (client === undefined) client = (await import("@/lib/db")).prisma;
  return client;
}

interface Flags {
  command: string;
  only?: string[];
  includeProfile: boolean;
  dryRun: boolean;
  allowDeletes: boolean;
  overwriteCms: boolean;
}

function parseArgs(argv: string[]): Flags {
  const [command = "help", ...rest] = argv;
  const flags: Flags = {
    command,
    includeProfile: true,
    dryRun: false,
    allowDeletes: false,
    overwriteCms: false,
  };
  for (const arg of rest) {
    if (arg.startsWith("--only=")) {
      flags.only = arg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--no-profile") {
      flags.includeProfile = false;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--allow-deletes") {
      flags.allowDeletes = true;
    } else if (arg === "--overwrite-cms") {
      flags.overwriteCms = true;
    } else {
      throw new Error(`Unrecognized argument: ${arg}`);
    }
  }
  return flags;
}

function heading(text: string): void {
  console.log(`\n${text}\n${"─".repeat(text.length)}`);
}

function printCounts(label: string, counts: Readonly<Record<string, number>> | RowCountManifest): void {
  heading(label);
  const width = Math.max(...Object.keys(counts).map((k) => k.length));
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(width)}  ${String(n).padStart(5)}`);
  }
}

function totalDeletions(report: ImportReport): number {
  return Object.values(report.deletions).reduce((a, b) => a + b, 0);
}

function printImportReport(report: ImportReport): void {
  heading(`Import (${report.scope}${report.dryRun ? ", dry run" : ""})`);
  console.log(`  projects in scope: ${report.projectSlugs.length}`);
  console.log(`  ${report.projectSlugs.join(", ")}`);
  printCounts("Rows deleted (pre-existing, replaced)", report.deletions);
  if (!report.dryRun) printCounts("Rows written", report.inserts);
  if (report.prunedProjects.length > 0) {
    console.log(`\n  Pruned projects (no longer in source): ${report.prunedProjects.join(", ")}`);
  }
  if (report.prunedTechnologies.length > 0) {
    console.log(`  Pruned technologies (unreferenced): ${report.prunedTechnologies.join(", ")}`);
  }
  if (report.cmsAuthored.length > 0) {
    console.log(
      `\n  ⚠ CMS-edited projects in scope: ${report.cmsAuthored.join(", ")}` +
        "\n    Importing over these discards the admin-UI edits.",
    );
  }
  if (report.deferredRelationships.length > 0) {
    console.log("\n  Deferred relationships (target not imported yet):");
    for (const r of report.deferredRelationships) {
      console.log(`    ${r.source} → ${r.related}`);
    }
  }
}

/** Validation gates every write. An import must never run on invalid content. */
function requireValidContent() {
  const data = normalize();
  const result = validate(data);
  heading("Validate");
  console.log(formatValidationResult(result));
  console.log(`\n  ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  if (!result.ok) {
    throw new Error("Validation failed — nothing was written to the database.");
  }
  return data;
}

async function commandStatus(): Promise<number> {
  const data = normalize();
  const actual = await readRowCounts(await db());
  printCounts("Expected rows (from content/*.ts)", data.manifest);
  printCounts("Actual rows (portfolio_dev)", actual);
  const differences = diffRowCounts(data.manifest, actual);
  heading("Row-count check");
  if (differences.length === 0) {
    console.log("  All 16 tables match the manifest.");
  } else {
    for (const d of differences) {
      console.log(`  ${d.table}: expected ${d.expected}, actual ${d.actual}`);
    }
  }
  return 0;
}

async function commandValidate(): Promise<number> {
  const data = normalize();
  const result = validate(data);
  printCounts("Normalized row manifest", data.manifest);
  heading("Validate");
  console.log(formatValidationResult(result));
  console.log(`\n  ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  return result.ok ? 0 : 1;
}

async function commandImport(flags: Flags): Promise<number> {
  const data = requireValidContent();
  const options = {
    projectSlugs: flags.only,
    includeProfile: flags.includeProfile,
    overwriteCmsAuthored: flags.overwriteCms,
  };

  const plan = await planImport(await db(), data, options);
  const deletions = totalDeletions(plan);

  if (flags.dryRun) {
    printImportReport(plan);
    console.log(`\n  Dry run — nothing was written. Would delete ${deletions} pre-existing row(s).`);
    return 0;
  }

  if (deletions > 0 && !flags.allowDeletes) {
    printImportReport(plan);
    console.log(
      `\n  REFUSED: this import would delete ${deletions} pre-existing row(s) before re-inserting them.` +
        `\n  Re-run with --allow-deletes to confirm.`,
    );
    return 1;
  }
  if (plan.cmsAuthored.length > 0 && !flags.overwriteCms) {
    printImportReport(plan);
    console.log(`\n  REFUSED: ${cmsOverwriteRefusal(plan.cmsAuthored)}`);
    return 1;
  }
  if (plan.prunedProjects.length > 0 && !flags.allowDeletes) {
    console.log(
      `\n  REFUSED: ${plan.prunedProjects.length} project row(s) in the database are no longer in` +
        `\n  content/projects.ts and would be removed: ${plan.prunedProjects.join(", ")}.` +
        `\n  Re-run with --allow-deletes to confirm.`,
    );
    return 1;
  }

  const report = await runImport(await db(), data, options);
  printImportReport(report);
  return 0;
}

/**
 * Print the CMS-authored projects a comparison stepped over.
 *
 * Silence here would be the dangerous option: a reader seeing "12/12 match"
 * must also see that a thirteenth project exists which was deliberately not
 * compared, or the check reads as broader than it is.
 */
function printCmsAuthored(slugs: string[]): void {
  if (slugs.length === 0) return;
  console.log(
    `\n  ${slugs.length} project(s) excluded from the replica check because the CMS wrote them:` +
      `\n    ${slugs.join(", ")}` +
      "\n  These are expected to differ from content/*.ts — that is what editing them means." +
      "\n  Row counts still include their rows, so a count above the manifest is normal here.",
  );
}

async function commandCompare(flags: Flags): Promise<number> {
  const report = await compareAll(await db(), {
    projectSlugs: flags.only,
    includeProfile: flags.includeProfile,
  });
  heading("Compare (database vs content/*.ts)");
  console.log(formatComparisonReport(report));
  console.log(
    `\n  Projects compared: ${report.projectsCompared}/${report.projectsExpected}` +
      `  ·  missing in DB: ${report.missingInDatabase.length}` +
      `  ·  unexpected in DB: ${report.extraInDatabase.length}`,
  );
  if (report.missingInDatabase.length > 0) {
    console.log(`  Missing: ${report.missingInDatabase.join(", ")}`);
  }
  if (report.extraInDatabase.length > 0) {
    console.log(`  Unexpected: ${report.extraInDatabase.join(", ")}`);
  }
  printCmsAuthored(report.cmsAuthored);
  console.log(`  Result: ${report.ok ? "IDENTICAL" : "DIFFERENCES FOUND"}`);
  return report.ok ? 0 : 1;
}

async function commandVerify(): Promise<number> {
  const data = normalize();
  const actual = await readRowCounts(await db());
  const countDifferences = diffRowCounts(data.manifest, actual);

  printCounts("Row counts (portfolio_dev)", actual);
  heading("Row-count check vs manifest");
  if (countDifferences.length === 0) {
    console.log("  All 16 tables match.");
  } else {
    for (const d of countDifferences) {
      console.log(`  MISMATCH ${d.table}: expected ${d.expected}, actual ${d.actual}`);
    }
  }

  const comparison = await compareAll(await db());
  heading("Content comparison");
  console.log(formatComparisonReport(comparison));
  console.log(
    `\n  Projects: ${comparison.projectsCompared}/${comparison.projectsExpected}` +
      `  ·  Profile: ${comparison.profile.every((c) => c.ok) ? "1/1" : "0/1"}`,
  );
  printCmsAuthored(comparison.cmsAuthored);

  // The empty-array-vs-absent distinction is the one representational
  // difference the schema cannot carry. Printed in full so it is on record
  // rather than quietly normalized away (see the header of compare.ts).
  const notes = emptyVsAbsentArrayNotes();
  const explicitEmpty = notes.filter((n) => n.sourceForm === "[]");
  heading("Known representational normalization");
  console.log(
    `  ${explicitEmpty.length} optional array(s) across ${new Set(explicitEmpty.map((n) => n.slug)).size} project(s)` +
      ` are explicitly [] in TypeScript;\n  ${notes.length - explicitEmpty.length} are absent. Both import as zero child rows and` +
      ` compare as [].\n  Rendering is unaffected: app/projects/[slug]/page.tsx gates each list on` +
      ` \`x && x.length > 0\`.`,
  );
  for (const n of explicitEmpty) {
    console.log(`    ${n.slug}.${n.field} = []`);
  }

  const ok = countDifferences.length === 0 && comparison.ok;
  heading("Verify");
  console.log(`  ${ok ? "PASS — database is a faithful replica of content/*.ts" : "FAIL"}`);
  return ok ? 0 : 1;
}

async function commandIdempotency(flags: Flags): Promise<number> {
  const data = requireValidContent();

  const before = {
    counts: await readRowCounts(await db()),
    fingerprint: await contentFingerprint(await db()),
  };

  const plan = await planImport(await db(), data, {});
  if (totalDeletions(plan) > 0 && !flags.allowDeletes) {
    console.log(
      `\n  REFUSED: re-running the import would delete ${totalDeletions(plan)} row(s) before` +
        `\n  re-inserting them. Re-run with --allow-deletes to confirm.`,
    );
    return 1;
  }

  heading("Idempotency — re-running the full import");
  const report = await runImport(await db(), data, {});
  printImportReport(report);

  const after = {
    counts: await readRowCounts(await db()),
    fingerprint: await contentFingerprint(await db()),
  };

  const countDifferences = diffRowCounts(before.counts, after.counts);
  heading("Result");
  console.log(`  Row counts before/after: ${countDifferences.length === 0 ? "identical" : "CHANGED"}`);
  for (const d of countDifferences) {
    console.log(`    ${d.table}: ${d.expected} → ${d.actual}`);
  }
  console.log(`  Content fingerprint before: ${before.fingerprint}`);
  console.log(`  Content fingerprint after:  ${after.fingerprint}`);
  const identical = before.fingerprint === after.fingerprint && countDifferences.length === 0;
  console.log(`  ${identical ? "PASS — the second import changed no content." : "FAIL — content changed."}`);
  return identical ? 0 : 1;
}

async function main(): Promise<number> {
  const flags = parseArgs(process.argv.slice(2));
  switch (flags.command) {
    case "status":
      return commandStatus();
    case "validate":
      return commandValidate();
    case "import":
      return commandImport(flags);
    case "compare":
      return commandCompare(flags);
    case "verify":
      return commandVerify();
    case "idempotency":
      return commandIdempotency(flags);
    default:
      console.log(
        [
          "Phase 7B-1 content migration pipeline.",
          "",
          "  status                          row counts, expected vs actual (read-only)",
          "  validate                        normalize + validate, no database access",
          "  import [--only=a,b] [--dry-run] write content into portfolio_dev",
          "         [--no-profile] [--allow-deletes]",
          "  compare [--only=a,b]            diff database against content/*.ts",
          "  verify                          row counts + full comparison",
          "  idempotency --allow-deletes     re-import and prove nothing changed",
        ].join("\n"),
      );
      return flags.command === "help" ? 0 : 1;
  }
}

async function disconnect(): Promise<void> {
  if (client !== undefined) await client.$disconnect();
}

main()
  .then(async (code) => {
    await disconnect();
    process.exitCode = code;
  })
  .catch(async (error: unknown) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    await disconnect();
    process.exitCode = 1;
  });
