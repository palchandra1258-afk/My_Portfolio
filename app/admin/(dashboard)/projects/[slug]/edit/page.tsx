import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProjectAction } from "@/app/admin/(dashboard)/projects/actions";
import { DatabaseUnavailableNotice, SourceMismatchNotice } from "@/components/admin/cms-notices";
import { ProjectForm } from "@/components/admin/project-form";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  getProjectForEdit,
  type EditableProject,
} from "@/lib/repositories/admin-project-repository.server";
import { getActiveSource } from "@/lib/repositories/content-repository.server";

// Auth-gated: must render per request, never at build time. No
// generateStaticParams here — the public route has one, this must not.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Guarded in its own right: a project title is content, and it must not
  // reach an unauthenticated request through a <title> tag.
  await requireAdminAuthorized();
  const { slug } = await params;
  return { title: `Edit ${slug}`, robots: { index: false, follow: false } };
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  const { slug } = await params;

  let project: EditableProject | null;
  try {
    project = await getProjectForEdit(slug);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Edit project</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  // An unknown slug is a 404 — never a blank create form, which would invite
  // re-entering a project that already exists under another slug.
  if (project === null) notFound();

  const active = await getActiveSource();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/projects/${slug}`}
          className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          &larr; Back to {slug}
        </Link>
        <h1 className="mt-3 font-display text-2xl">Edit {project.values.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Last changed {project.updatedAt.toISOString().slice(0, 10)} · origin{" "}
          {project.contentOrigin === "cms" ? "CMS" : "TypeScript import"}
        </p>
      </div>

      <SourceMismatchNotice activeSource={active.source} />

      {project.contentOrigin !== "cms" && (
        <p
          role="status"
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted"
        >
          This project was loaded from <code className="font-mono text-xs">content/projects.ts</code>{" "}
          by <code className="font-mono text-xs">db:import</code>. Saving marks it CMS-authored, and{" "}
          <code className="font-mono text-xs">db:import</code> will then refuse to overwrite it
          without an explicit flag — so this edit will not be lost on the next sync, and the
          TypeScript file will no longer match.
        </p>
      )}

      <ProjectForm
        action={updateProjectAction}
        mode="edit"
        defaults={project.values}
        preserved={project.preserved}
      />
    </div>
  );
}
