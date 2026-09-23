# Portfolio Project — Claude Code Instructions

## 1. Project Context

This is an existing personal portfolio project built with Next.js.

The goal is to improve and evolve the existing portfolio into a polished, production-quality portfolio while preserving working functionality and existing valuable content.

Do NOT rewrite the project from scratch.

Before making implementation changes, inspect the existing codebase, architecture, components, routes, content, styling, configuration, and dependencies.

---

## 2. Required Context Documents

The following documents in `docs/` are the project source of truth.

Read and use the relevant documents before making changes:

- `docs/PROJECT_INVENTORY.md`
  - Existing project structure, files, components, routes, and current implementation.

- `docs/PROJECT_CONTENT_GUIDELINES.md`
  - Rules for portfolio content, tone, presentation, and factual accuracy.

- `docs/CONTENT_EVIDENCE_RULES.md`
  - Rules governing claims, evidence, achievements, metrics, and factual statements.

- `docs/PORTFOLIO_ARCHITECTURE.md`
  - Overall portfolio architecture, information architecture, pages, sections, and technical structure.

- `docs/DESIGN_SYSTEM.md`
  - Visual design system, typography, spacing, colors, components, interactions, and responsive behavior.

- `docs/CMS_SPECIFICATION.md`
  - CMS/content-management requirements and implementation expectations.

- `docs/ADMIN_DASHBOARD_SPECIFICATION.md`
  - Admin dashboard requirements and functionality.

- `docs/SECURITY_AND_QUALITY.md`
  - Security, reliability, accessibility, performance, code-quality, and production requirements.

- `docs/IMPLEMENTATION_ROADMAP.md`
  - Implementation phases, priorities, dependencies, and order of execution.

When a task concerns a specific area, read the corresponding document before implementing it.

If multiple documents apply, consider all of them together.

---

## 3. Existing Next.js Guidance

The repository contains `AGENTS.md`.

Follow the instructions in `AGENTS.md`.

Before making Next.js-related implementation decisions, also consult the applicable Next.js documentation available in the project when required by `AGENTS.md`.

Do not ignore existing framework-specific instructions.

---

## 4. Source of Truth Hierarchy

When making decisions, use this priority:

1. Existing working code and actual project behavior
2. Relevant specification in `docs/`
3. `AGENTS.md` and applicable framework documentation
4. Existing project conventions
5. General engineering best practices

Do not invent requirements that are not supported by the project documentation or the existing application.

If two specifications appear to conflict, identify the conflict before making a significant architectural change.

---

## 5. Preserve Existing Work

This is an existing portfolio.

Do NOT:

- rewrite the entire application unnecessarily
- replace working components without a reason
- delete existing content without justification
- change routes unnecessarily
- introduce a new framework unnecessarily
- replace the existing architecture simply because another approach is preferred
- remove useful functionality during redesign
- fabricate portfolio information
- fabricate achievements, metrics, experience, education, projects, or technologies

Prefer incremental improvements over large destructive rewrites.

Reuse existing components, utilities, data structures, and patterns when they are appropriate.

---

## 6. Content Accuracy

Portfolio content must be factual.

Never invent:

- achievements
- awards
- statistics
- project results
- employment history
- education details
- technologies used
- responsibilities
- dates
- performance metrics
- users/customers
- links
- certifications
- publications

If information is missing, do not guess.

Use the existing project content and the evidence rules in:

`docs/CONTENT_EVIDENCE_RULES.md`

When uncertain, leave the information unchanged or clearly identify what information is required.

---

## 7. Before Implementation

Before modifying code:

1. Inspect the existing project structure.
2. Inspect the relevant existing files.
3. Understand how the current implementation works.
4. Read the relevant specification documents.
5. Identify dependencies between the requested change and existing functionality.
6. Determine the smallest safe implementation approach.
7. Check whether the requested feature already exists partially.
8. Avoid duplicating existing functionality.

Do not start coding immediately when the task requires architectural understanding.

---

## 8. Implementation Process

Follow `docs/IMPLEMENTATION_ROADMAP.md` for implementation order.

Implement changes incrementally.

For each meaningful phase:

1. Understand the requirement.
2. Inspect the existing implementation.
3. Plan the change.
4. Implement the smallest coherent change.
5. Run relevant checks/tests.
6. Fix errors.
7. Verify responsive behavior where applicable.
8. Review the result against the relevant specification.
9. Only then continue to the next phase.

Do not skip verification simply because the code compiles.

---

## 9. Design

Follow:

`docs/DESIGN_SYSTEM.md`

and:

`docs/PORTFOLIO_ARCHITECTURE.md`

Do not introduce arbitrary visual styles that conflict with the established design system.

Maintain consistency across:

- typography
- spacing
- colors
- layout
- components
- buttons
- cards
- navigation
- forms
- animations
- responsive behavior
- accessibility

Prefer reusable design-system components over one-off implementations.

---

## 10. Responsive Design

All portfolio features must work across:

- mobile
- tablet
- laptop
- desktop
- large desktop screens

Do not design only for the current viewport.

Check responsive behavior whenever modifying UI.

---

## 11. Accessibility

Follow the accessibility requirements defined in:

`docs/SECURITY_AND_QUALITY.md`

Use semantic HTML where appropriate.

Ensure:

- keyboard accessibility
- visible focus states
- appropriate labels
- meaningful alt text
- sufficient contrast
- accessible interactive elements
- logical heading hierarchy
- reduced-motion considerations where applicable

Do not sacrifice accessibility for visual effects.

---

## 12. Performance

Keep the portfolio fast and production-ready.

Avoid unnecessary:

- client components
- JavaScript
- dependencies
- network requests
- large assets
- expensive animations
- unnecessary re-renders

Prefer the appropriate Next.js rendering strategy for each feature.

Follow the existing project architecture and applicable Next.js guidance.

---

## 13. Security

Follow:

`docs/SECURITY_AND_QUALITY.md`

Never expose:

- API keys
- secrets
- private credentials
- tokens
- environment secrets
- sensitive personal information

Do not hardcode secrets into source code.

Validate and sanitize user-controlled data where applicable.

---

## 14. CMS and Admin

For CMS-related work, follow:

`docs/CMS_SPECIFICATION.md`

For admin-dashboard work, follow:

`docs/ADMIN_DASHBOARD_SPECIFICATION.md`

Do not implement CMS or admin behavior based only on assumptions.

Understand the existing data flow and authentication/authorization model before modifying it.

---

## 15. Code Quality

Write maintainable production-quality code.

Prefer:

- clear naming
- small focused components
- reusable utilities
- strong typing
- minimal duplication
- consistent project conventions
- simple solutions over unnecessary abstraction

Do not over-engineer.

Do not introduce abstractions unless they provide clear value.

---

## 16. Dependencies

Before adding a dependency:

1. Check whether the functionality already exists in the project.
2. Check whether an existing dependency can solve the problem.
3. Consider whether the dependency is necessary.
4. Prefer lightweight and well-maintained solutions.

Do not add packages unnecessarily.

---

## 17. Verification

After implementation, run the relevant project checks.

At minimum, when applicable:

- TypeScript/type checking
- ESLint
- build
- relevant tests

Resolve errors introduced by the implementation.

Do not claim a feature is complete without verifying it.

---

## 18. Change Discipline

Keep changes focused on the requested task.

Do not modify unrelated files simply for cleanup.

If unrelated issues are discovered:

- do not silently rewrite them
- mention them separately
- fix them only when necessary for the requested task or when explicitly asked

Keep the git diff understandable.

---

## 19. Decision Making

When several implementation approaches are possible:

Prefer the approach that:

1. preserves the existing architecture
2. follows the project specifications
3. minimizes unnecessary changes
4. is maintainable
5. is secure
6. is accessible
7. performs well
8. is consistent with the existing codebase

Do not choose a solution merely because it is newer or more fashionable.

---

## 20. Communication

Before a significant implementation:

Briefly state:

- what you found
- what you plan to change
- which specification documents apply

During implementation, explain important architectural decisions when necessary.

After implementation, summarize:

- what changed
- files changed
- verification performed
- any remaining issues or decisions

Do not hide errors or failed checks.

---

## 21. Important Rule

When in doubt:

DO NOT GUESS.

Inspect the existing code and consult the relevant documentation in `docs/`.

The objective is to evolve the existing portfolio carefully into the target architecture described by the project specifications, while preserving factual accuracy, existing functionality, quality, security, accessibility, and maintainability.