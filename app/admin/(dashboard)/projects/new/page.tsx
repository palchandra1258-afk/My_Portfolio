import type { Metadata } from "next";
import Link from "next/link";

import { createProjectAction } from "@/app/admin/(dashboard)/projects/actions";
import { SourceMismatchNotice } from "@/components/admin/cms-notices";
import { DatabaseUnavailableNotice } from "@/components/admin/cms-notices";
import { ProjectForm } from "@/components/admin/project-form";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import { nextDisplayOrder } from "@/lib/repositories/admin-project-repository.server";
import { getActiveSource } from "@/lib/repositories/content-repository.server";
import type { ProjectFormValues } from "@/lib/admin/project-form";

// Auth-gated: must render per request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New project",
  robots: { index: false, follow: false },
};

export default async function NewProjectPage() {
  // This page's own access control. The action it renders re-checks
  // independently, because a server action is its own endpoint.
  await requireAdminAuthorized();

  let order: number;
  try {
    order = await nextDisplayOrder();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">New project</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  const active = await getActiveSource();

  // Blank, except for the two fields where a considered default is safer than
  // an empty one: the new project goes at the end of the list, and it starts
  // as a draft so nothing reaches the public site by the act of creating it
  // (CMS_SPECIFICATION.md §43).
  const defaults: ProjectFormValues = {
    slug: "",
    title: "",
    category: "supporting",
    status: "Completed",
    source: "GitHub",
    featured: false,
    shortDescription: "",
    evidenceStatus: "self-reported",
    verificationNotes: "",
    technologies: [],
    githubUrl: null,
    demoUrl: null,
    displayOrder: order,
    publicationStatus: "draft",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/projects"
          className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          &larr; All projects
        </Link>
        <h1 className="mt-3 font-display text-2xl">New project</h1>
        <p className="mt-1 text-sm text-muted">
          Created as a draft. It stays invisible to visitors until you set it to published.
        </p>
      </div>

      <SourceMismatchNotice activeSource={active.source} />

      <ProjectForm action={createProjectAction} mode="create" defaults={defaults} />
    </div>
  );
}
