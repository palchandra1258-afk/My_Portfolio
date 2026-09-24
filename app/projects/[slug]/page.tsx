import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectArticle, type RelatedProjectLink } from "@/components/project-article";
import { stripRelationships } from "@/lib/content/public-project";
import { getAllProjects, getProject } from "@/lib/repositories/content-repository.server";

// Only published projects are reachable here. `getAllProjects()` — which
// `generateStaticParams`, `generateMetadata` and this page all read through —
// filters on publication status in database mode, so a draft has no static
// path generated, no metadata, and no page. See
// lib/repositories/project-repository.server.ts.
//
// The presentation lives in components/project-article.tsx, shared with the
// admin draft preview so the two cannot drift apart.

export async function generateStaticParams() {
  const allProjects = await getAllProjects();
  return allProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  // A draft resolves to null here just as a nonexistent slug does, so no title
  // or description of unpublished content is ever emitted.
  if (!project) return {};
  return {
    title: project.title,
    description: project.shortDescription,
    alternates: {
      canonical: `/projects/${slug}`,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // getProject() derives from getAllProjects() (React cache() in database mode,
  // a cheap array op in TypeScript mode), so resolving `related` against a
  // second getAllProjects() call here costs no extra database read.
  const [project, allProjects] = await Promise.all([getProject(slug), getAllProjects()]);
  if (!project) notFound();

  // Resolved against the published list, so a relationship pointing at a draft
  // silently drops rather than rendering a link to a 404.
  const related: RelatedProjectLink[] = (project.relatedTo ?? []).flatMap((r) => {
    const target = allProjects.find((p) => p.slug === r.slug);
    return target === undefined ? [] : [{ slug: r.slug, note: r.note, title: target.title }];
  });

  // `relatedTo` is dropped rather than passed: the resolved `related` list
  // above is what renders, and the raw list names every target slug including
  // ones the public cannot see. Leaving it on the object would put an
  // unpublished slug into the serialized page even though nothing displays it.
  return <ProjectArticle project={stripRelationships(project)} related={related} />;
}
