

\# PORTFOLIO\_ARCHITECTURE.md

\> This document defines the technical architecture and evolution strategy for the portfolio application.  
\>  
\> The current public portfolio is already functional and visually established.  
\>  
\> Future development must improve the architecture without unnecessarily rewriting or degrading the existing public experience.  
\>  
\> The long-term goal is to evolve the portfolio into a database-backed, CMS-ready application with a secure administrative dashboard while preserving the public visual identity.

\---

\# 1\. ARCHITECTURAL GOAL

The portfolio should evolve from a primarily file-based content system into a structured, database-backed content platform.

The intended evolution is:

\`\`\`text  
CURRENT  
TypeScript Content Files  
        ↓  
CLEAN DOMAIN / CONTENT LAYER  
        ↓  
DATABASE-BACKED CONTENT  
        ↓  
CMS / ADMIN DASHBOARD  
        ↓  
DRAFT / PREVIEW / PUBLISH WORKFLOW

This migration must be incremental.

Do not replace the current architecture all at once.

---

# **2\. CURRENT APPLICATION**

The current application is based on:

* Next.js  
* App Router  
* TypeScript  
* React  
* Tailwind CSS  
* Framer Motion  
* Lucide React

Current major areas include:

app/  
components/  
content/  
lib/  
public/

The existing public routes include:

/  
 /projects  
 /projects/\[slug\]  
 /about  
 /contact

The current project pages use dynamic routes based on project slugs.

---

# **3\. CURRENT CONTENT ARCHITECTURE**

The current portfolio stores important content in TypeScript modules.

Primary content areas include:

content/  
├── projects.ts  
└── resume-data.ts

The existing project system already supports structured project data.

Project information includes concepts such as:

* slug  
* title  
* alternate names  
* category  
* status  
* featured state  
* description  
* problem  
* approach  
* architecture  
* technologies  
* results  
* metrics  
* GitHub  
* demo  
* evidence status  
* verification notes  
* working features  
* development status  
* related projects  
* source provenance

This existing structure should be preserved and evolved rather than discarded without analysis.

---

# **4\. ARCHITECTURAL PRINCIPLE**

Separate:

CONTENT

from:

PRESENTATION

Content should describe what the portfolio says.

Presentation should describe how the portfolio displays it.

For example:

Project Data  
      ↓  
Domain Model  
      ↓  
Content Renderer  
      ↓  
Project Page UI

The UI should not contain large amounts of project-specific factual content.

---

# **5\. DOMAIN LAYER**

The application should gradually establish clear domain models.

Potential domain entities include:

Project  
ProjectSection  
ProjectMetric  
ProjectLink  
ProjectTechnology  
ProjectTag  
ProjectMedia  
ProjectRevision

Profile  
Experience  
Education  
Skill  
Achievement  
Certification

NavigationItem  
Page  
PageSection  
SiteSetting

MediaAsset  
SEOData  
AuditLog  
User  
Role

Do not implement every entity immediately.

Introduce entities according to the implementation roadmap.

---

# **6\. PROJECT DOMAIN MODEL**

Projects should remain flexible.

A project should not be forced into a rigid structure where every project must contain exactly the same fields.

Conceptually:

Project  
│  
├── Identity  
├── Summary  
├── Classification  
├── Status  
├── Evidence  
├── Content Sections  
├── Metrics  
├── Technologies  
├── Media  
├── Links  
├── Related Projects  
└── Metadata  
---

# **7\. FLEXIBLE PROJECT SECTIONS**

The project system should support optional sections/modules.

Conceptually:

Project  
   ↓  
Sections\[\]  
   ├── Overview  
   ├── Problem  
   ├── Architecture  
   ├── Dataset  
   ├── Experiment  
   ├── Results  
   ├── Financial Analysis  
   ├── Memory  
   ├── Agents  
   ├── Evaluation  
   ├── Limitations  
   └── Future Work

The exact section types should evolve from the projects rather than being over-engineered upfront.

See:

PROJECT\_CONTENT\_GUIDELINES.md  
PROJECT\_INVENTORY.md

for content rules.

---

# **8\. CONTENT RENDERING**

The long-term project rendering architecture should support:

Project Data  
      ↓  
Section Data  
      ↓  
Section Type  
      ↓  
Renderer  
      ↓  
Reusable UI Component

For example:

section.type \= "architecture"

may map to:

ArchitectureSection

while:

section.type \= "metrics"

may map to:

MetricsSection

This allows project pages to remain flexible without duplicating page code.

---

# **9\. COMPONENT ARCHITECTURE**

Reusable UI components should remain separate from content data.

Examples include:

ProjectCard  
MetricStat  
StatusBadge  
Reveal  
EducationTimeline  
Portrait  
Navigation  
Footer

New components should be created only when a genuine reusable UI concept exists.

Do not create unnecessary abstractions.

---

# **10\. PUBLIC WEBSITE ARCHITECTURE**

The public application should conceptually remain:

                   PUBLIC PORTFOLIO  
                           │  
          ┌────────────────┼────────────────┐  
          │                │                │  
         Home           Projects          About  
                           │  
                           ↓  
                    Project Detail  
                           │  
                           ↓  
                       Contact

Public pages should consume content through a stable content/domain interface.

They should not need to know whether content comes from:

TypeScript

or:

Database  
---

# **11\. CONTENT SOURCE ABSTRACTION**

A key architectural goal is to prevent the public UI from becoming tightly coupled to the current TypeScript files.

Preferred future structure:

Public UI  
   ↓  
Content Service / Repository  
   ↓  
Content Interface  
   ↓  
┌───────────────────────┐  
│                       │  
│ TypeScript Source     │  
│ Database              │  
│                       │  
└───────────────────────┘

This makes migration possible without rewriting the entire UI.

---

# **12\. MIGRATION STRATEGY**

Do not immediately migrate all content to a database.

Use staged migration.

### **Stage 1**

Keep the existing TypeScript content.

Clean and normalize the domain models.

### **Stage 2**

Introduce a content abstraction/repository layer.

### **Stage 3**

Make the public UI consume the abstraction layer.

### **Stage 4**

Introduce database models.

### **Stage 5**

Migrate selected content.

### **Stage 6**

Validate database-backed rendering.

### **Stage 7**

Add administrative editing.

### **Stage 8**

Introduce draft/publish/revision workflows.

---

# **13\. DUAL-SOURCE TRANSITION**

During migration, the system may temporarily support:

TypeScript Content  
       \+  
Database Content

However, there must be a clearly defined source-of-truth strategy.

Do not allow two sources to silently disagree.

If both systems contain the same project:

Source A  
   ≠  
Source B

the conflict must be explicitly resolved.

---

# **14\. DATABASE ARCHITECTURE**

The eventual database should support structured content.

Conceptual relationships:

User  
 │  
 └── Roles / Permissions

Project  
 ├── Sections  
 ├── Metrics  
 ├── Technologies  
 ├── Tags  
 ├── Media  
 ├── Links  
 └── Revisions

Profile  
 ├── Experience  
 ├── Education  
 ├── Skills  
 ├── Achievements  
 └── Certifications

Site  
 ├── Navigation  
 ├── Pages  
 ├── SEO  
 └── Settings

Media  
 └── Assets

Audit  
 └── Audit Logs

The exact schema should be designed during the CMS implementation phase.

Do not introduce unnecessary tables before their requirements are understood.

---

# **15\. DATABASE PRINCIPLES**

The database design should prioritize:

* clear relationships  
* predictable identifiers  
* timestamps  
* versioning where required  
* validation  
* referential integrity  
* safe migrations  
* indexing for real queries  
* minimal duplication  
* extensibility

Avoid designing a generic CMS database that contains dozens of unnecessary tables.

---

# **16\. PROJECT STATUS**

Projects should have structured status information.

Potential statuses:

Draft  
In Development  
Completed  
Research  
Prototype  
Archived

The exact status vocabulary should remain centralized.

Do not hard-code status strings throughout the application.

---

# **17\. PUBLISHING MODEL**

The long-term content lifecycle should support:

Draft  
  ↓  
Preview  
  ↓  
Review  
  ↓  
Published  
  ↓  
Unpublished / Archived

A draft should not automatically become publicly visible.

The public site should display only content that satisfies the publication rules.

---

# **18\. PREVIEW MODEL**

Administrators should eventually be able to preview unpublished changes.

Conceptually:

Admin Editor  
     ↓  
Draft  
     ↓  
Preview  
     ↓  
Approval  
     ↓  
Publish

Preview should not require permanently publishing the content.

---

# **19\. REVISION MODEL**

Important content should support revision history.

Conceptually:

Project  
  │  
  ├── Revision 1  
  ├── Revision 2  
  ├── Revision 3  
  └── Current Revision

Revision history should make it possible to understand:

* what changed  
* when it changed  
* who changed it  
* previous content  
* current content

The exact implementation should be decided during CMS development.

---

# **20\. AUDIT MODEL**

Administrative actions should eventually be auditable.

Potential audit events:

Project Created  
Project Updated  
Project Published  
Project Unpublished  
Project Archived  
Media Uploaded  
Media Replaced  
Profile Updated  
Navigation Updated  
SEO Updated  
User Permission Changed

Do not log sensitive values unnecessarily.

Audit records should focus on action metadata rather than storing secrets.

---

# **21\. ADMIN ARCHITECTURE**

The administrative system should be logically separate from the public presentation.

Conceptually:

                   APPLICATION  
                         │  
             ┌───────────┴───────────┐  
             │                       │  
          PUBLIC                   ADMIN  
             │                       │  
         Visitors              Authenticated User  
             │                       │  
         Read Content            Manage Content

The public site should never depend on admin UI components.

---

# **22\. AUTHENTICATION**

The future admin system requires authentication.

Authentication should be:

* server-side  
* secure  
* session-aware  
* protected against unauthorized access

Do not implement authentication only through client-side hiding.

For example:

if user is not authorized

must be enforced on the server/backend boundary.

---

# **23\. AUTHORIZATION**

Authentication and authorization are different.

The system should eventually support roles/permissions such as:

Admin  
Editor

if the project requires multiple administrative roles.

Authorization should control operations such as:

* create  
* read  
* update  
* delete  
* publish  
* manage users  
* manage settings

Do not assume that being logged in grants every permission.

---

# **24\. ADMIN API / SERVER ACTIONS**

Administrative mutations should use appropriate server-side mechanisms.

Possible approaches include:

* Server Actions  
* Route Handlers  
* backend APIs

The chosen approach should follow current Next.js guidance and the project's actual requirements.

Before implementing framework-sensitive functionality, consult the relevant local Next.js documentation specified by `CLAUDE.md`.

---

# **25\. PUBLIC READ PATH**

The public website should optimize for:

* fast reads  
* predictable rendering  
* SEO  
* caching  
* minimal unnecessary database queries  
* stable content

The public site should not perform unnecessary administrative operations.

---

# **26\. CONTENT CACHING**

When database-backed content is introduced, caching should be designed intentionally.

Potential strategies include:

Static Generation  
Revalidation  
Request Caching  
Application Cache  
Database Query Optimization

Do not add caching layers prematurely.

Measure actual requirements first.

---

# **27\. SEO ARCHITECTURE**

SEO data should eventually be part of structured content.

Potential fields:

SEO Title  
Meta Description  
Canonical URL  
Open Graph Image  
Robots Directive  
Structured Data

SEO should be generated from content where appropriate.

Do not duplicate SEO metadata across many unrelated components.

---

# **28\. MEDIA ARCHITECTURE**

Media should eventually be managed separately from page content.

Conceptually:

Media Library  
     ↓  
Media Asset  
     ├── File  
     ├── Type  
     ├── Dimensions  
     ├── Alt Text  
     ├── Metadata  
     └── Usage

Projects can reference media assets rather than embedding arbitrary file paths everywhere.

---

# **29\. PROFILE IMAGE**

The current profile image is served through the public assets.

The architecture should eventually make media replacement possible without requiring a code change.

However, do not introduce a complex media CMS solely to replace one image during the early phases.

---

# **30\. NAVIGATION**

Navigation should eventually be configurable.

Conceptually:

Navigation  
 ├── Label  
 ├── URL  
 ├── Order  
 ├── Visibility  
 └── External/Internal

Do not hard-code navigation throughout multiple components.

---

# **31\. PAGE / SECTION VISIBILITY**

The future CMS should support visibility controls where useful.

Examples:

Visible  
Hidden  
Draft  
Published  
Archived

Visibility should be controlled through structured content rather than scattered conditional statements.

---

# **32\. SEARCH**

The future architecture may support portfolio-wide search.

Searchable entities may include:

* projects  
* skills  
* experience  
* technologies  
* tags  
* project sections

Search should be added only after the content model is stable.

Do not introduce a search engine unnecessarily early.

---

# **33\. TAXONOMY**

Projects should support structured classification.

Potential taxonomy:

Category  
Tag  
Technology  
Domain  
Status

Examples:

Category:  
Research  
Application  
AI System  
Finance

Tags:  
RAG  
Agents  
Computer Vision  
Quantization  
Optimization

Taxonomy should remain manageable.

---

# **34\. RELATED PROJECTS**

Projects may reference related projects.

Relationships should be explicit rather than based only on text matching.

Example:

Cortex Lab  
   ↔  
The Inevitable

if the relationship is meaningful and supported.

---

# **35\. RESUME ARCHITECTURE**

Resume information should eventually use structured data.

Potential entities:

Profile  
Experience  
Education  
Skill  
Achievement  
Certification

The existing resume data should be preserved during migration.

The current resume PDF should remain available as an artifact when appropriate.

---

# **36\. ANALYTICS**

Analytics should be separated from portfolio content.

Conceptually:

Public Site  
     ↓  
Analytics Events  
     ↓  
Analytics Provider / Storage  
     ↓  
Dashboard

Analytics must not become tightly coupled to project rendering.

Only collect information that is necessary and appropriate.

---

# **37\. ERROR HANDLING**

The architecture should provide clear handling for:

* missing projects  
* invalid slugs  
* missing media  
* failed database queries  
* unauthorized admin requests  
* invalid content  
* upload failures  
* publishing failures

Public users should receive useful but non-sensitive error states.

Never expose:

* database credentials  
* stack traces  
* internal paths  
* secrets  
* internal system details

in public error responses.

---

# **38\. VALIDATION**

Content should be validated before publication.

Validation should cover:

* required fields  
* valid URLs  
* supported section types  
* metric structure  
* status values  
* media references  
* SEO fields  
* relationships

Invalid content should not silently reach the public site.

---

# **39\. TYPE SAFETY**

TypeScript types should remain aligned with the actual content/domain model.

Avoid:

any

unless genuinely necessary.

When the domain model changes:

1. update the type  
2. update validation  
3. update data access  
4. update renderers  
5. update tests

Do not create parallel definitions of the same entity unnecessarily.

---

# **40\. SECURITY BOUNDARIES**

Important security boundaries:

Public Browser  
      ↓  
Public Application  
      ↓  
Server  
      ↓  
Database

and:

Admin Browser  
      ↓  
Authentication  
      ↓  
Authorization  
      ↓  
Admin Server Operations  
      ↓  
Database

Sensitive operations must remain server-side.

See:

SECURITY\_AND\_QUALITY.md

for detailed security rules.

---

# **41\. SECRETS**

Secrets must never be stored in:

* public content  
* project data  
* React components  
* client-side JavaScript  
* committed configuration  
* public environment files

Use appropriate server-side secret management.

---

# **42\. DATABASE MIGRATIONS**

Database schema changes must use controlled migrations.

Never modify production schema manually without a migration strategy.

Every schema change should consider:

* backward compatibility  
* existing content  
* migration safety  
* rollback strategy  
* data validation

---

# **43\. BACKWARD COMPATIBILITY**

When changing project content models:

Do not immediately break every existing project.

Prefer:

Old Model  
   ↓  
Compatibility Layer  
   ↓  
New Model

when a staged migration is appropriate.

Remove compatibility code only after migration is complete and verified.

---

# **44\. PERFORMANCE**

Performance improvements should be evidence-driven.

Prioritize:

* server rendering  
* appropriate caching  
* optimized images  
* minimal client JavaScript  
* component reuse  
* efficient database queries  
* avoiding unnecessary re-renders

Do not optimize prematurely.

---

# **45\. ANIMATION**

The existing portfolio uses Framer Motion and a deliberate reveal-animation approach.

Preserve the current philosophy:

* animations should enhance the interface  
* content must remain accessible  
* important content must not depend on animation to appear  
* reduced-motion preferences should be respected

Do not replace the existing animation system without a clear reason.

---

# **46\. COMPONENT REUSE**

Before creating a new component:

1. inspect existing components  
2. determine whether an existing component can be reused  
3. extend it if appropriate  
4. create a new component only when the concept is genuinely different

Avoid duplicate components that perform nearly identical roles.

---

# **47\. DESIGN PRESERVATION**

The existing public design is considered established.

Architecture work must not automatically trigger:

* redesign  
* color changes  
* typography replacement  
* layout replacement  
* generic SaaS dashboard styling  
* excessive gradients  
* excessive glassmorphism  
* unnecessary animations

See:

DESIGN\_SYSTEM.md

for the locked visual rules.

---

# **48\. ADMIN DESIGN VS PUBLIC DESIGN**

The admin dashboard may use a more utilitarian interface.

It should optimize for:

* information density  
* editing efficiency  
* navigation  
* forms  
* tables  
* filters  
* previews  
* publishing controls

The public site should preserve the editorial/technical visual identity.

Therefore:

Public UI  
\=  
Brand / Editorial / Technical

Admin UI  
\=  
Functional / Efficient / CMS-oriented

They may share design tokens but do not need identical layouts.

---

# **49\. DATA FLOW**

Preferred long-term flow:

Admin  
  ↓  
Authentication  
  ↓  
Authorization  
  ↓  
Content Editor  
  ↓  
Validation  
  ↓  
Database  
  ↓  
Publication State  
  ↓  
Content Repository  
  ↓  
Public Renderer  
  ↓  
Portfolio Visitor  
---

# **50\. PUBLISHING FLOW**

Preferred publishing lifecycle:

Editor  
  ↓  
Create / Edit  
  ↓  
Draft  
  ↓  
Validate  
  ↓  
Preview  
  ↓  
Review  
  ↓  
Publish  
  ↓  
Public Site

Unpublishing should reverse the publication state without necessarily deleting the content.

---

# **51\. DELETE VS ARCHIVE**

Do not permanently delete content when archiving is sufficient.

Preferred lifecycle:

Published  
   ↓  
Unpublished  
   ↓  
Archived

Permanent deletion should be deliberate and protected.

---

# **52\. CONTENT BACKUP**

Important content should have a recovery strategy.

Potential mechanisms:

* database backups  
* revision history  
* exported content  
* source control

The exact backup strategy should be defined before production deployment.

---

# **53\. GIT / SOURCE CONTROL**

Source control remains important even after introducing a CMS.

The CMS database is not a replacement for source control.

Use Git for:

* application code  
* schema definitions  
* migrations  
* configuration templates  
* documentation

Do not commit secrets.

---

# **54\. ENVIRONMENT SEPARATION**

The application should eventually distinguish:

Development  
Staging  
Production

where appropriate.

Database credentials, API keys and other secrets must not be shared across environments unnecessarily.

---

# **55\. TESTING ARCHITECTURE**

Testing should cover multiple layers:

Unit Tests  
     ↓  
Domain / Validation Tests  
     ↓  
Component Tests  
     ↓  
Integration Tests  
     ↓  
End-to-End Tests

Not every feature requires every level.

Prioritize critical flows such as:

* project rendering  
* content validation  
* authentication  
* authorization  
* publishing  
* media handling  
* database operations

---

# **56\. OBSERVABILITY**

The application should eventually provide appropriate visibility into:

* server errors  
* failed database operations  
* publishing failures  
* authentication failures  
* upload failures  
* important admin operations

Do not log sensitive information.

---

# **57\. LOGGING**

Logs should be:

* structured where useful  
* meaningful  
* privacy-aware  
* environment-appropriate

Avoid logging:

* passwords  
* API keys  
* tokens  
* full sensitive form submissions  
* unnecessary personal data

---

# **58\. NEXT.JS COMPATIBILITY**

The project uses a current Next.js version.

Before changing framework-sensitive functionality:

1. inspect the existing implementation  
2. inspect relevant local Next.js documentation  
3. identify current recommended patterns  
4. avoid deprecated APIs  
5. make the smallest compatible change

Do not assume older Next.js tutorials remain valid.

---

# **59\. ARCHITECTURAL DECISION PROCESS**

For significant architectural changes:

Current Problem  
      ↓  
Existing Architecture  
      ↓  
Options  
      ↓  
Trade-offs  
      ↓  
Decision  
      ↓  
Implementation  
      ↓  
Validation

Do not introduce a new technology simply because it is popular.

---

# **60\. DEPENDENCY DISCIPLINE**

Before adding a dependency:

Ask:

1. Is it necessary?  
2. Does the existing stack already solve this?  
3. Is it actively maintained?  
4. Does it introduce significant complexity?  
5. Does it improve the architecture enough to justify itself?

Avoid dependency accumulation.

---

# **61\. NO PREMATURE OVER-ENGINEERING**

Do not implement all future CMS capabilities immediately.

Examples of features that should not be added without need:

* complex search infrastructure  
* advanced workflow engines  
* distributed queues  
* elaborate plugin systems  
* unnecessary microservices  
* complex event buses  
* generic CMS abstractions for every possible content type

The architecture should be extensible without being unnecessarily complex.

---

# **62\. MONOLITH FIRST**

The portfolio should generally remain a well-structured Next.js application unless there is a demonstrated reason to split services.

Preferred initial architecture:

Next.js Application  
│  
├── Public UI  
├── Admin UI  
├── Server Logic  
├── Content Layer  
├── Validation  
├── Database Access  
└── Authentication

Do not introduce microservices merely for architectural appearance.

---

# **63\. FUTURE ARCHITECTURE**

The intended long-term system can be visualized as:

                        PORTFOLIO APPLICATION  
                                  │  
                 ┌────────────────┴────────────────┐  
                 │                                 │  
              PUBLIC                            ADMIN  
                 │                                 │  
          Visitor Interface                Authenticated Editor  
                 │                                 │  
                 │                          Dashboard / CMS  
                 │                                 │  
                 └──────────────┬──────────────────┘  
                                ↓  
                         DOMAIN / CONTENT LAYER  
                                ↓  
                    ┌───────────┴───────────┐  
                    │                       │  
              Content Repository       Validation  
                    │                       │  
                    └───────────┬───────────┘  
                                ↓  
                            DATABASE  
                                │  
             ┌──────────────────┼──────────────────┐  
             │                  │                  │  
          Projects            Profile           Media  
             │                  │                  │  
          Revisions         Experience         Assets  
          Metrics           Education  
          Sections          Skills  
          Tags              Achievements

This is the target architecture, not a statement that all of these systems currently exist.

---

# **64\. MIGRATION PRINCIPLE**

The safest architectural evolution is:

Understand  
   ↓  
Normalize  
   ↓  
Abstract  
   ↓  
Migrate  
   ↓  
Validate  
   ↓  
Admin  
   ↓  
Publish  
   ↓  
Optimize

Never:

Rewrite Everything  
---

# **65\. CURRENT → TARGET MAPPING**

| Current | Target |
| ----- | ----- |
| `content/projects.ts` | Project repository / database |
| `content/resume-data.ts` | Structured profile entities |
| Hard-coded page content | Structured content |
| Project TypeScript model | Domain model |
| Static project sections | Flexible project sections |
| Public-only editing | Admin CMS |
| No publication workflow | Draft / preview / publish |
| File-based media | Media library |
| Hard-coded navigation | Navigation management |
| Static metadata | SEO management |
| No revision workflow | Revision history |
| Limited administration | Protected dashboard |

This mapping should guide migration decisions.

---

# **66\. WHAT MUST BE PRESERVED**

During architectural evolution, preserve:

* current public routes  
* current project URLs/slugs where possible  
* existing project content  
* verified project results  
* current visual identity  
* responsive behavior  
* accessibility behavior  
* existing useful components  
* current working functionality

Do not break working functionality simply to make the architecture look newer.

---

# **67\. WHAT SHOULD BE IMPROVED**

Prioritize improvements such as:

* separation of content and UI  
* consistent domain models  
* reusable content renderers  
* validation  
* content provenance  
* database readiness  
* authentication  
* authorization  
* admin editing  
* publishing  
* revision history  
* media management  
* SEO  
* testing

---

# **68\. WHAT SHOULD NOT BE DONE**

Do not:

* rewrite the entire application without an audit  
* replace Next.js without a strong reason  
* replace the current design unnecessarily  
* move everything to a database immediately  
* create a generic CMS framework from scratch  
* add microservices prematurely  
* duplicate content across multiple files  
* hard-code project-specific content into components  
* expose secrets  
* publish unsupported claims

---

# **69\. ARCHITECTURAL QUALITY BAR**

A good architecture should be:

Simple enough to understand  
\+  
Flexible enough to evolve  
\+  
Strict enough to protect data  
\+  
Modular enough to maintain  
\+  
Evidence-aware enough to protect credibility

Do not optimize for architectural complexity.

Optimize for maintainability and controlled evolution.

---

# **70\. FINAL ARCHITECTURAL RULE**

The portfolio should evolve from:

> A polished personal website with structured TypeScript content

into:

> A polished personal website powered by a structured content platform with a secure administrative CMS.

The public visitor experience remains the priority.

The CMS exists to make the content easier to manage—not to force the public website into a generic CMS design.

---

