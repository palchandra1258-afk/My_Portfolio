import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/repositories/content-repository.server";

const siteUrl = "https://chandrapal.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/projects", "/about", "/contact"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));

  const allProjects = await getAllProjects();

  const projectRoutes = allProjects.map((p) => ({
    url: `${siteUrl}/projects/${p.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...projectRoutes];
}
