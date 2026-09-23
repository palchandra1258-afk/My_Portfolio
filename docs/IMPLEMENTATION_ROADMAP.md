Yes. You have now completed **9 documentation files** shown in your screenshot. The only remaining documentation file from our planned structure is:

docs/IMPLEMENTATION\_ROADMAP.md

This is the **most important execution document for Claude Code** because it tells Claude **how to actually implement everything without breaking your existing portfolio**.

Create:

docs/IMPLEMENTATION\_ROADMAP.md

and paste this entire file:

\# IMPLEMENTATION\_ROADMAP.md

\> This document defines the phased implementation roadmap for evolving the existing portfolio into a secure, database-backed, CMS-enabled portfolio platform.  
\>  
\> The current public portfolio is already functional and visually established.  
\>  
\> Implementation must therefore be incremental, auditable, reversible, and evidence-driven.  
\>  
\> Do not rewrite the entire application at once.  
\>  
\> Do not redesign the public website unless explicitly requested.

\---

\# 1\. PURPOSE

The goal is to evolve the existing portfolio from:

\`\`\`text  
Existing Next.js Portfolio  
\+  
TypeScript Content

into:

Production-Quality Portfolio Platform  
\+  
Structured Content  
\+  
Database  
\+  
Secure Admin Dashboard  
\+  
CMS  
\+  
Draft / Preview / Publish  
\+  
Revision History  
\+  
Audit Logging

while preserving the existing public experience.

---

# **2\. PRIMARY IMPLEMENTATION PRINCIPLE**

The implementation must follow:

Audit  
   ↓  
Understand  
   ↓  
Plan  
   ↓  
Normalize  
   ↓  
Refactor  
   ↓  
Validate  
   ↓  
Migrate  
   ↓  
Admin  
   ↓  
Publish  
   ↓  
Optimize

Never begin with:

Rewrite Everything  
---

# **3\. SOURCE DOCUMENTS**

Before making significant changes, Claude must read:

CLAUDE.md

docs/PROJECT\_CONTENT\_GUIDELINES.md  
docs/PROJECT\_INVENTORY.md  
docs/CONTENT\_EVIDENCE\_RULES.md  
docs/PORTFOLIO\_ARCHITECTURE.md  
docs/DESIGN\_SYSTEM.md  
docs/CMS\_SPECIFICATION.md  
docs/ADMIN\_DASHBOARD\_SPECIFICATION.md  
docs/SECURITY\_AND\_QUALITY.md  
docs/IMPLEMENTATION\_ROADMAP.md

These documents collectively define:

Behavior  
\+  
Content  
\+  
Evidence  
\+  
Architecture  
\+  
Design  
\+  
CMS  
\+  
Admin  
\+  
Security  
\+  
Implementation Order  
---

# **4\. EXISTING APPLICATION MUST BE AUDITED FIRST**

Before changing architecture, inspect the complete existing application.

At minimum inspect:

app/  
components/  
content/  
lib/  
public/  
package.json  
tsconfig.json  
next.config.\*  
tailwind configuration  
ESLint configuration  
README  
AGENTS.md  
CLAUDE.md

Also inspect:

* existing routes  
* existing components  
* existing project data  
* existing resume data  
* existing assets  
* existing dependencies  
* existing scripts  
* existing tests  
* existing configuration

---

# **5\. NO CODE CHANGES DURING INITIAL AUDIT**

The first audit should be read-only.

Do not modify code simply because something could be improved.

The audit should identify:

Already Working  
Needs Refactoring  
Needs Migration  
Missing  
Potential Risk  
Potential Duplication  
Future Requirement  
---

# **6\. INITIAL AUDIT OUTPUT**

After auditing, produce a structured report.

Recommended format:

Current Architecture  
Current Content System  
Current UI Components  
Current Routes  
Current Data Models  
Current Dependencies  
Current Testing  
Current Security  
Current Media  
Current Deployment  
Architecture Gaps  
CMS Gaps  
Migration Risks  
Recommended Next Steps

Do not implement changes before the audit is understood.

---

# **7\. BASELINE VERIFICATION**

Before significant changes, establish a baseline.

Verify:

npm / pnpm install  
Lint  
Type Check  
Build  
Existing Tests

Use the package manager actually configured by the repository.

Do not assume commands.

Record which checks currently pass and which already fail.

---

# **8\. BASELINE PUBLIC ROUTES**

Verify the current public routes:

/  
 /projects  
 /projects/\[slug\]  
 /about  
 /contact

Verify:

* pages render  
* project links work  
* images load  
* navigation works  
* responsive layout works  
* animations work  
* contact form works where applicable

---

# **9\. BASELINE PROJECTS**

Verify all current projects against:

docs/PROJECT\_INVENTORY.md

> **STALE LIST — updated Phase 7B-1.** The eight-project list below is historical. The current portfolio is the **13 projects in `content/projects.ts`** (see `PROJECT_INVENTORY.md` §0). "Portfolio Optimization & MPT" (#7 below) does **not** exist in the current portfolio and has deliberately not been added.

The portfolio originally contained:

1\. The Inevitable  
2\. Diabetes Prediction  
3\. Cortex Lab  
4\. Healthcare AI Assistant  
5\. CIFAR-10 Ternary ResNet  
6\. Kaynes Technology Financial Dashboard  
7\. Portfolio Optimization & MPT — *no longer applicable; not present in `content/projects.ts`*  
8\. Image Captioning & Segmentation

Do not remove or rewrite project content merely to fit a new schema.

---

# **10\. PHASE 0 — REPOSITORY AUDIT**

### **Goal**

Understand the existing application before architectural changes.

### **Tasks**

Inspect repository  
Inspect routes  
Inspect components  
Inspect content  
Inspect types  
Inspect public assets  
Inspect dependencies  
Inspect configuration  
Inspect tests  
Inspect build process  
Inspect deployment configuration

### **Output**

Create an internal architecture map.

Do not add unnecessary code.

---

# **11\. PHASE 0 EXIT CRITERIA**

Phase 0 is complete when:

* Existing architecture is understood  
* Existing routes are documented  
* Existing content sources are identified  
* Existing project model is understood  
* Existing components are mapped  
* Existing dependencies are known  
* Existing tests are known  
* Existing build state is known  
* Security risks are identified  
* No unnecessary code changes were made

---

# **12\. PHASE 1 — CONTENT NORMALIZATION**

### **Goal**

Prepare the current TypeScript content for future database migration.

Primary files:

content/projects.ts  
content/resume-data.ts  
lib/types.ts

### **Tasks**

* inspect current types  
* identify inconsistent fields  
* identify hard-coded content  
* identify duplicate structures  
* identify missing metadata  
* identify project-specific fields  
* preserve existing content  
* improve type safety where necessary

---

# **13\. PROJECT MODEL NORMALIZATION**

The project model should support concepts such as:

Identity  
Classification  
Status  
Evidence  
Sections  
Metrics  
Technologies  
Tags  
Links  
Media  
Relationships  
Publication  
Metadata

Do not force all eight projects into identical content.

---

# **14\. CONTENT / UI SEPARATION**

Move project-specific factual content out of React components where practical.

Preferred:

Project Data  
   ↓  
Content / Domain Layer  
   ↓  
Renderer  
   ↓  
UI

Avoid:

React Component  
   ↓  
Large Hard-Coded Project Content  
---

# **15\. HARD-CODED CONTENT AUDIT**

Inspect:

app/page.tsx  
app/about/\*  
app/contact/\*  
components/\*

for factual content that should eventually belong in structured data.

Do not blindly move every string into the CMS.

Static UI labels can remain in code.

---

# **16\. PHASE 1 EXIT CRITERIA**

* Content model is clearer  
* Project data remains intact  
* No unsupported facts were added  
* UI/content separation improved  
* TypeScript remains valid  
* Public routes still work  
* Existing design remains unchanged

---

# **17\. PHASE 2 — CONTENT REPOSITORY ABSTRACTION**

### **Goal**

Make the public application independent from the physical location of content.

Introduce a stable interface concept such as:

ProjectRepository  
ContentRepository  
ProfileRepository

The exact implementation is determined during development.

---

# **18\. REPOSITORY PRINCIPLE**

Public UI should ask for:

Get Projects  
Get Project By Slug  
Get Profile  
Get Experience

rather than knowing whether the data comes from:

TypeScript  
Database  
API  
---

# **19\. INITIAL DATA SOURCE**

During this phase, the repository may still read:

content/projects.ts  
content/resume-data.ts

This is intentional.

The goal is abstraction first.

Database migration comes later.

---

# **20\. PHASE 2 EXIT CRITERIA**

* Public UI consumes repository/content interfaces  
* TypeScript remains the current source of data  
* Public output remains equivalent  
* No unnecessary database dependency yet  
* Existing project URLs remain stable  
* Tests cover important repository behavior

---

# **21\. PHASE 3 — DATABASE DESIGN**

### **Goal**

Design the database based on actual normalized content.

Do not design the database before understanding the current content.

Potential entities:

Project  
ProjectSection  
ProjectMetric  
ProjectLink  
Technology  
Tag  
MediaAsset

Profile  
Experience  
Education  
Skill  
Achievement  
Certification

NavigationItem  
Page  
SEOData  
SiteSetting

Revision  
AuditLog

User  
Role  
Permission  
---

# **22\. DATABASE DESIGN PRINCIPLE**

Start with the smallest schema that supports the real requirements.

Do not create dozens of tables simply because a CMS could theoretically need them.

Prefer:

Simple  
Typed  
Relational  
Validated  
Extensible  
---

# **23\. DATABASE MIGRATION PLAN**

Before migrating production content:

Existing TS  
    ↓  
Import Script  
    ↓  
Development Database  
    ↓  
Validation  
    ↓  
Comparison  
    ↓  
Correction  
    ↓  
Staging  
    ↓  
Production  
---

# **24\. PHASE 3 EXIT CRITERIA**

* Database schema documented  
* Migration strategy documented  
* Relationships understood  
* Constraints defined  
* Slug uniqueness defined  
* Publication state defined  
* Revision strategy defined  
* Backup strategy defined  
* Development database tested

---

# **25\. PHASE 4 — DATABASE CONTENT REPOSITORY**

### **Goal**

Allow the existing repository interface to read database content.

Target:

Public UI  
   ↓  
Repository  
   ↓  
Database

instead of:

Public UI  
   ↓  
TypeScript File  
---

# **26\. DUAL-SOURCE PERIOD**

During migration, temporary dual-source support may exist:

TypeScript  
\+  
Database

This period must be controlled.

Never allow:

TypeScript ≠ Database

without detection.

---

# **27\. CONTENT COMPARISON**

For each migrated project compare:

Title  
Slug  
Description  
Sections  
Metrics  
Technologies  
Tags  
Links  
Status  
Featured  
Visibility  
Media  
Evidence  
---

# **28\. PHASE 4 EXIT CRITERIA**

* Database reads work  
* Public UI can render database content  
* Existing pages remain visually/functionally equivalent  
* All migrated content is validated  
* No project data was silently lost  
* TypeScript fallback remains available if needed

---

# **29\. PHASE 5 — AUTHENTICATION**

### **Goal**

Establish secure administrative access before building sensitive CMS operations.

Implement:

Authentication  
\+  
Session Management  
\+  
Server-Side Protection  
---

# **30\. AUTHENTICATION RULE**

Do not build custom authentication cryptography.

Use an established, appropriate authentication solution.

The implementation must follow current framework and library guidance.

---

# **31\. ADMIN ROUTE PROTECTION**

Protect:

/admin  
/admin/\*

and all associated mutations.

Protection must exist on the server.

---

# **32\. PHASE 5 EXIT CRITERIA**

* Login works  
* Logout works  
* Sessions are secure  
* Unauthenticated admin access is blocked  
* Direct protected requests are blocked  
* No credentials are exposed client-side  
* Authorization boundary is established

---

# **33\. PHASE 6 — ADMIN SHELL**

### **Goal**

Build the basic dashboard framework.

Initial areas:

Dashboard  
Projects  
Media  
Profile

Do not build every CMS feature immediately.

---

# **34\. ADMIN SHELL COMPONENTS**

Potential components:

AdminSidebar  
AdminHeader  
AdminLayout  
AdminNavigation

Reuse existing design tokens where appropriate.

---

# **35\. ADMIN DESIGN RULE**

The admin dashboard may be more functional and dense than the public portfolio.

However:

Do not redesign the public website.  
---

# **36\. PHASE 6 EXIT CRITERIA**

* Admin layout works  
* Authentication works  
* Sidebar works  
* Navigation works  
* Public site remains unaffected  
* Responsive behavior is acceptable  
* Accessibility basics are implemented

---

# **37\. PHASE 7 — PROJECT CMS**

### **Goal**

Build the first complete CMS workflow around projects.

Priority:

Project List  
      ↓  
Create  
      ↓  
Edit  
      ↓  
Sections  
      ↓  
Metrics  
      ↓  
Links  
      ↓  
Technologies  
      ↓  
Tags  
---

# **38\. PROJECT LIST FEATURES**

Implement:

* search where useful  
* status filter  
* category filter  
* featured filter  
* visibility  
* ordering  
* edit  
* archive

Do not overbuild global search yet.

---

# **39\. PROJECT EDITOR**

The editor should support:

Identity  
Classification  
Sections  
Metrics  
Technologies  
Tags  
Links  
Media  
Evidence  
SEO  
Publication  
---

# **40\. FLEXIBLE SECTIONS**

Implement a section registry.

Conceptually:

Section Type  
    ↓  
Schema  
    ↓  
Editor  
    ↓  
Renderer

Initial section types should be chosen from actual project requirements.

---

# **41\. PROJECT-SPECIFIC MODULES**

Support different projects appropriately.

Examples:

The Inevitable  
→ Architecture / Protocols / Agents / Governance

Cortex Lab  
→ Memory / Retrieval / Agents / Reasoning

CIFAR-10  
→ Experiment / Quantization / QAT / Results

Financial Dashboard  
→ Financial Analysis / Ratios / Forecast

Portfolio Optimization  
→ Covariance / Optimization / Allocation

Computer Vision  
→ Captioning / Segmentation / Evaluation

Do not force all projects into one identical template.

---

# **42\. PHASE 7 EXIT CRITERIA**

* Projects can be created  
* Projects can be edited  
* Sections work  
* Metrics work  
* Technologies work  
* Tags work  
* Links work  
* Media references work  
* Existing projects can be represented  
* Public pages render correctly

---

# **43\. PHASE 8 — MEDIA LIBRARY**

### **Goal**

Allow image/media management without source-code changes.

Implement:

Upload  
Browse  
Search  
Preview  
Edit Metadata  
Reference  
Replace  
Archive/Delete Safely  
---

# **44\. MEDIA SECURITY**

Validate:

File Type  
File Size  
Extension  
MIME  
Filename  
Dimensions

where applicable.

Never trust client-provided file metadata blindly.

---

# **45\. MEDIA REFERENCES**

Do not delete an asset that is still required by published content.

Before deletion:

Find References  
     ↓  
Confirm Dependencies  
     ↓  
Delete / Archive  
---

# **46\. PHASE 8 EXIT CRITERIA**

* Upload works  
* Invalid files are rejected  
* Media metadata works  
* Projects can reference media  
* Profile image can be replaced  
* Deletion checks references  
* Public media remains functional

---

# **47\. PHASE 9 — DRAFT / PREVIEW / PUBLISH**

### **Goal**

Introduce controlled publication.

Workflow:

Edit  
 ↓  
Draft  
 ↓  
Validate  
 ↓  
Preview  
 ↓  
Publish  
---

# **48\. DRAFT RULE**

Saving a draft must not automatically change the public website.

---

# **49\. PREVIEW RULE**

Preview should use the actual public renderer where possible.

Conceptually:

Draft Data  
   ↓  
Public Renderer  
   ↓  
Preview

This minimizes preview/public differences.

---

# **50\. PUBLISH VALIDATION**

Before publishing:

Required Fields  
Valid Slug  
Valid URLs  
Valid Sections  
Valid Metrics  
Valid Media  
Evidence State  
SEO

must be checked.

---

# **51\. PHASE 9 EXIT CRITERIA**

* Drafts work  
* Drafts remain private  
* Preview works  
* Publish works  
* Unpublish works  
* Archived content stays hidden  
* Public cache/revalidation works correctly

---

# **52\. PHASE 10 — REVISIONS**

### **Goal**

Protect content history.

Implement:

Revision Creation  
Revision List  
Revision Inspection  
Revision Comparison  
Revision Restore  
---

# **53\. REVISION RULE**

Restoring an old version should create a new revision.

Never destroy history silently.

---

# **54\. PHASE 10 EXIT CRITERIA**

* Revisions are created  
* History is viewable  
* Previous content can be inspected  
* Restore works  
* Restore preserves history  
* Revision access is protected

---

# **55\. PHASE 11 — AUDIT LOG**

### **Goal**

Make administrative actions traceable.

Log important actions such as:

CREATE  
UPDATE  
PUBLISH  
UNPUBLISH  
ARCHIVE  
DELETE  
RESTORE  
UPLOAD  
REPLACE\_MEDIA  
LOGIN  
PERMISSION\_CHANGE  
---

# **56\. AUDIT LOG PRINCIPLE**

Audit logs should record:

Who  
What  
When  
Which Entity  
Summary

Do not log secrets.

---

# **57\. PHASE 11 EXIT CRITERIA**

* Important mutations create audit records  
* Audit records are protected  
* Sensitive values are not logged  
* Audit history is searchable/filterable where useful

---

# **58\. PHASE 12 — PROFILE / RESUME CMS**

After projects are stable, implement:

Profile  
Experience  
Education  
Skills  
Achievements  
Certifications  
Resume  
---

# **59\. RESUME MIGRATION**

Existing resume information should be mapped carefully.

Do not invent missing information.

Preserve verified facts.

---

# **60\. PHASE 12 EXIT CRITERIA**

* Profile editable  
* Experience editable  
* Education editable  
* Skills editable  
* Achievements editable  
* Certifications editable  
* Resume asset manageable  
* Public pages remain accurate

---

# **61\. PHASE 13 — NAVIGATION / SEO / SETTINGS**

Implement:

Navigation  
SEO  
Site Settings

only after the core CMS is stable.

---

# **62\. NAVIGATION MANAGEMENT**

Allow:

Create  
Edit  
Reorder  
Hide  
Show

for navigation items.

---

# **63\. SEO MANAGEMENT**

Support:

SEO Title  
Meta Description  
Canonical  
Open Graph Image  
Robots

where appropriate.

---

# **64\. SITE SETTINGS**

Keep site-wide settings limited to genuine requirements.

Do not turn the dashboard into a giant configuration panel.

---

# **65\. PHASE 13 EXIT CRITERIA**

* Navigation is manageable  
* SEO metadata works  
* Settings work  
* Public output remains correct  
* No sensitive configuration is exposed

---

# **66\. PHASE 14 — CONTENT HEALTH**

Introduce useful content-quality checks.

Potential checks:

Missing SEO  
Missing Alt Text  
Broken Links  
Needs Verification  
Missing Required Fields  
Drafts  
Unpublished Content  
---

# **67\. CONTENT HEALTH PRINCIPLE**

Content health should help maintain accuracy.

It should not become a vanity dashboard.

---

# **68\. PHASE 15 — SEARCH**

Only after the content model is stable, introduce search.

Potential searchable content:

Projects  
Technologies  
Tags  
Skills  
Experience  
Media

Start with database/application search.

Introduce a dedicated search engine only if justified.

---

# **69\. PHASE 16 — ANALYTICS**

Analytics may be introduced after core CMS functionality is stable.

Potential information:

Project Views  
Popular Projects  
Traffic Trends

Do not allow analytics complexity to dominate the application.

---

# **70\. PHASE 17 — POLISH**

After functionality is stable:

Review:

Accessibility  
Performance  
Responsive Design  
Error Handling  
Loading States  
Empty States  
Visual Consistency  
SEO  
Security  
---

# **71\. PUBLIC DESIGN REGRESSION**

After every major admin/CMS phase, verify that the public portfolio still preserves:

Background  
Typography  
Cards  
Borders  
Spacing  
Navigation  
Animations  
Project Pages  
Responsive Layout  
---

# **72\. DESIGN REGRESSION RULE**

If an administrative change unintentionally changes the public visual identity:

Stop  
Investigate  
Restore  
Fix Architecture  
Continue

Do not accept visual regressions as a normal side effect.

---

# **73\. PERFORMANCE REVIEW**

Review:

Initial Page Load  
Project Listing  
Project Detail  
Images  
Fonts  
Database Queries  
Client JavaScript  
Admin Tables  
Media Library

Optimize only where evidence indicates a problem.

---

# **74\. SECURITY REVIEW**

Before production CMS launch, review:

Authentication  
Authorization  
Sessions  
Database Access  
Uploads  
Secrets  
Draft Protection  
Preview Security  
Publishing  
Audit Logs  
Error Handling  
---

# **75\. TESTING STRATEGY**

Critical workflows should have automated coverage.

Priority:

Authentication  
Authorization  
Content Validation  
Project CRUD  
Draft / Publish  
Preview  
Media  
Revisions  
Public Rendering  
---

# **76\. END-TO-END CRITICAL FLOW**

The final system should support:

Login  
 ↓  
Dashboard  
 ↓  
Create / Edit Project  
 ↓  
Save Draft  
 ↓  
Preview  
 ↓  
Validate  
 ↓  
Publish  
 ↓  
Visit Public Page  
 ↓  
Verify Content  
 ↓  
Edit Again  
 ↓  
Create Revision  
 ↓  
Publish  
---

# **77\. MIGRATION SAFETY**

Never migrate all content blindly.

Use:

One Project  
 ↓  
Validate  
 ↓  
Render  
 ↓  
Compare  
 ↓  
Approve  
 ↓  
Next Project

where practical.

---

# **78\. CONTENT MIGRATION ORDER**

> **STALE ORDER — updated Phase 7B-1.** This order covers only the original eight and names one project ("Portfolio Optimization & MPT") that does not exist in `content/projects.ts`. The migration actually performed in Phase 7B-1 covers the **13 current projects**, piloting `the-inevitable` first (consistent with #1 below) and then proceeding in `content/projects.ts` array order.

Recommended order (historical):

1\. The Inevitable  
2\. Cortex Lab  
3\. CIFAR-10 Ternary ResNet  
4\. Diabetes Prediction  
5\. Healthcare AI Assistant  
6\. Kaynes Technology Financial Dashboard  
7\. Portfolio Optimization & MPT  
8\. Image Captioning & Segmentation

This order is a working recommendation, not a requirement.

Projects may be migrated in another order if technical dependencies make that preferable.

---

# **79\. HIGH-COMPLEXITY PROJECTS**

Pay particular attention to:

The Inevitable  
Cortex Lab  
CIFAR-10 Ternary ResNet

because they require more nuanced technical sections and evidence handling.

Do not simplify their architecture merely to make CMS modeling easier.

---

# **80\. EVIDENCE-AWARE MIGRATION**

When migrating content:

Preserve:

Evidence Status  
Source  
Verification Notes  
Measured Results  
Targets  
Assumptions  
Implementation Status  
Future Work

Do not collapse these concepts into one generic description field.

---

# **81\. CONFLICT HANDLING**

If source content conflicts:

Source A  
   ≠  
Source B

do not automatically choose one.

Investigate.

If unresolved:

Needs Verification

or omit the disputed claim from public output.

---

# **82\. KAYNES DATA CONFLICT**

The Kaynes project contains conflicting values across project artifacts.

Before migrating those values:

Identify Source  
 ↓  
Identify Period  
 ↓  
Identify Definition  
 ↓  
Verify  
 ↓  
Choose Authoritative Value

If unresolved, preserve the uncertainty.

Do not silently merge values.

---

# **83\. HEALTHCARE SECURITY**

Before publishing the Healthcare AI Assistant:

Verify that any AI API credential previously present in client-side code has been:

Revoked  
Rotated  
Removed  
Moved Server-Side

Never expose active API credentials.

---

# **84\. FINANCIAL SAFETY**

The Portfolio Optimization project must remain framed as historical mathematical analysis.

The result:

100% Kaynes

must not become an investment recommendation.

---

# **85\. ML RESULT SAFETY**

For ML projects:

Measured Result  
≠  
Target  
≠  
Expected Result

Do not upgrade targets into achievements during migration.

---

# **86\. FUTURE FEATURES**

Do not implement future CMS features merely because they appear in this roadmap.

The roadmap describes intended evolution.

Each phase should be implemented only when:

Current Phase Stable  
\+  
Requirement Confirmed  
\+  
Architecture Ready  
---

# **87\. PHASE DEPENDENCY**

The preferred dependency chain is:

Audit  
 ↓  
Content Normalization  
 ↓  
Repository Abstraction  
 ↓  
Database  
 ↓  
Database Repository  
 ↓  
Authentication  
 ↓  
Admin Shell  
 ↓  
Project CMS  
 ↓  
Media  
 ↓  
Draft / Preview / Publish  
 ↓  
Revisions  
 ↓  
Audit  
 ↓  
Profile CMS  
 ↓  
Navigation / SEO / Settings  
 ↓  
Content Health  
 ↓  
Search  
 ↓  
Analytics  
 ↓  
Polish  
---

# **88\. DO NOT SKIP FOUNDATIONAL PHASES**

Do not jump directly from:

TypeScript Content

to:

Full CMS

without establishing:

Domain Model  
Repository  
Validation  
Database  
Authentication  
---

# **89\. DO NOT OVER-ENGINEER**

If a simple solution satisfies the requirement:

> Prefer the simple solution.

Avoid premature:

* microservices  
* event buses  
* complex queues  
* plugin architectures  
* distributed systems  
* enterprise workflow engines

---

# **90\. MONOLITH-FIRST STRATEGY**

The initial CMS should generally remain within the existing Next.js application.

Conceptually:

Next.js  
│  
├── Public  
├── Admin  
├── Server Logic  
├── Content Layer  
├── Validation  
├── Database  
└── Authentication

Split services only when a real requirement emerges.

---

# **91\. CHANGE SIZE**

Prefer changes that can be:

Implemented  
 ↓  
Tested  
 ↓  
Reviewed  
 ↓  
Reverted

Avoid massive changes that are difficult to diagnose.

---

# **92\. GIT CHECKPOINTS**

After major phases, create logical Git checkpoints/commits where appropriate.

Suggested milestones:

Baseline Audit  
Content Normalization  
Repository Abstraction  
Database Integration  
Authentication  
Admin Shell  
Project CMS  
Media  
Publishing  
Revisions  
Audit  
Profile CMS  
Final Polish

Do not rewrite Git history unnecessarily.

---

# **93\. ROLLBACK**

Every major migration phase should have a rollback strategy.

Examples:

Git rollback  
Database rollback  
Content restore  
Revision restore  
Feature rollback  
---

# **94\. DOCUMENTATION UPDATES**

When implementation decisions differ from the planned architecture:

Update the appropriate documentation.

For example:

Architecture change  
→ PORTFOLIO\_ARCHITECTURE.md

Design change  
→ DESIGN\_SYSTEM.md

CMS change  
→ CMS\_SPECIFICATION.md

Admin workflow change  
→ ADMIN\_DASHBOARD\_SPECIFICATION.md

Security change  
→ SECURITY\_AND\_QUALITY.md

Do not let documentation become permanently outdated.

---

# **95\. IMPLEMENTATION STATUS**

The roadmap itself does not mean a feature is implemented.

Always distinguish:

Planned  
In Progress  
Implemented  
Tested  
Verified  
Production  
---

# **96\. COMPLETION DEFINITION**

A phase is not complete merely because code exists.

A phase is complete when:

Implementation  
\+  
Validation  
\+  
Testing  
\+  
Documentation  
\+  
Regression Check

are satisfied.

---

# **97\. FINAL PRODUCTION TARGET**

The final architecture should resemble:

                        PORTFOLIO  
                             │  
              ┌──────────────┴──────────────┐  
              │                             │  
           PUBLIC                          ADMIN  
              │                             │  
        Visitor UI                    Authenticated UI  
              │                             │  
              │                       CMS / Dashboard  
              │                             │  
              └──────────────┬──────────────┘  
                             ↓  
                       CONTENT LAYER  
                             ↓  
                     VALIDATION / DOMAIN  
                             ↓  
                          DATABASE  
                             │  
          ┌──────────────────┼──────────────────┐  
          │                  │                  │  
       Projects            Profile            Media  
          │                  │                  │  
       Sections          Experience          Assets  
       Metrics            Education  
       Tags               Skills  
       Links              Achievements  
       Revisions          Certifications

with:

Authentication  
Authorization  
Publishing  
Preview  
Revisions  
Audit  
SEO  
Validation  
Backups

supporting the system.

---

# **98\. PUBLIC EXPERIENCE TARGET**

The final public website should remain:

Fast  
Accessible  
Responsive  
Editorial  
Technical  
Warm  
Minimal  
Evidence-Aware

The CMS should operate behind it.

---

# **99\. ADMIN EXPERIENCE TARGET**

The final admin dashboard should provide:

Dashboard  
Projects  
Project Editor  
Profile  
Experience  
Education  
Skills  
Achievements  
Certifications  
Media  
Navigation  
SEO  
Revisions  
Audit Log  
Settings

with:

Draft  
Preview  
Publish  
Unpublish  
Archive  
Restore

workflows.

---

# **100\. FINAL QUALITY GATE**

Before declaring the portfolio transformation complete:

### **Architecture**

* Public UI is separated from content/data  
* Database architecture is stable  
* Repository abstraction is stable  
* CMS architecture is documented

### **Content**

* All projects preserved  
* Evidence states preserved  
* Metrics verified  
* Conflicting values resolved or flagged  
* No unsupported claims introduced

### **CMS**

* Projects editable  
* Sections editable  
* Metrics editable  
* Media manageable  
* Profile manageable  
* Publishing works  
* Revisions work  
* Audit works

### **Security**

* Authentication secure  
* Authorization enforced server-side  
* Secrets protected  
* Uploads validated  
* Drafts protected  
* Preview protected  
* Admin routes protected

### **Public Website**

* Existing routes work  
* Existing project URLs work  
* Design preserved  
* Responsive layout preserved  
* Accessibility preserved  
* Performance acceptable  
* SEO preserved

### **Engineering**

* TypeScript passes  
* Lint passes  
* Build succeeds  
* Critical tests pass  
* Database migrations tested  
* Backup/recovery strategy exists  
* Documentation reflects implementation

---

# **101\. FINAL IMPLEMENTATION PRINCIPLE**

The transformation should feel like:

Existing Portfolio  
        ↓  
Better Architecture  
        ↓  
Structured Content  
        ↓  
Database  
        ↓  
Secure CMS  
        ↓  
Powerful Administration

while the visitor experiences:

The Same Portfolio  
        \+  
Better Content  
        \+  
Better Reliability  
        \+  
Better Maintainability  
---

# **102\. GOLDEN RULE**

> **Do not sacrifice a working, distinctive portfolio for architectural ambition.**

Build the system gradually.

Preserve what already works.

Improve what actually needs improvement.

Verify every migration.

Protect every sensitive operation.

Never invent portfolio content.

Never silently change measured results.

Never expose secrets.

Never redesign the public site unless explicitly requested.

