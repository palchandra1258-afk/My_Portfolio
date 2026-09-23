// Access boundary between UI code and the current project-content source.
// Delegates entirely to content/projects.ts — no transformation, no new
// data model. See docs/PORTFOLIO_ARCHITECTURE.md §11 (Content Source
// Abstraction) and §17 (Repository Abstraction, Phase 2).
export { projects, getProject, featuredProjects } from "@/content/projects";
