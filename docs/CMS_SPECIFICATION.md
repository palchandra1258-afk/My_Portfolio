

\# CMS\_SPECIFICATION.md

\> This document defines the content-management architecture and functional requirements for the portfolio CMS.  
\>  
\> The CMS must make portfolio content manageable without requiring code changes for normal content operations.  
\>  
\> The CMS is a future target architecture. Do not assume that all functionality described here currently exists.  
\>  
\> The existing public portfolio and visual identity must remain stable while CMS functionality is introduced incrementally.

\---

\# 1\. PURPOSE

The CMS should eventually allow authorized users to manage the portfolio through a secure administrative interface.

The primary goal is:

\> Manage structured portfolio content without modifying application code for every content update.

The CMS should support:

\- projects  
\- project sections  
\- metrics  
\- technologies  
\- tags  
\- media  
\- profile  
\- experience  
\- education  
\- skills  
\- achievements  
\- certifications  
\- navigation  
\- page visibility  
\- SEO  
\- publishing  
\- revisions  
\- audit history  
\- site settings

\---

\# 2\. CORE PRINCIPLE

The CMS is a content-management system, not a replacement for the application architecture.

The application remains responsible for:

\- rendering  
\- business rules  
\- validation  
\- authorization  
\- presentation  
\- interaction  
\- performance  
\- security

The CMS manages structured content.

\---

\# 3\. CONTENT FLOW

The intended flow is:

\`\`\`text  
Admin  
  ↓  
CMS Editor  
  ↓  
Validation  
  ↓  
Draft  
  ↓  
Preview  
  ↓  
Publish  
  ↓  
Database  
  ↓  
Content Repository  
  ↓  
Public Portfolio  
---

# **4\. CONTENT ENTITIES**

The initial CMS should support these major entities:

Project  
Project Section  
Project Metric  
Project Link  
Project Technology  
Project Tag  
Project Media

Profile  
Experience  
Education  
Skill  
Achievement  
Certification

Navigation Item  
Page  
Page Section

Media Asset  
SEO Metadata  
Site Setting

Revision  
Audit Log

User  
Role  
Permission

Do not implement all entities simultaneously.

Prioritize based on the roadmap.

---

# **5\. PROJECT ENTITY**

A project should contain structured identity information.

Conceptual fields:

id  
slug  
title  
subtitle / positioning  
description  
category  
status  
featured  
displayOrder  
visibility  
createdAt  
updatedAt  
publishedAt

Optional fields may include:

alternateNames  
shortDescription  
year  
featuredImage  
githubUrl  
demoUrl  
documentationUrl

Only include fields that are actually required.

---

# **6\. PROJECT CONTENT**

Project content should not be limited to one large rich-text field.

A project should support structured sections.

Conceptually:

Project  
   ↓  
Project Sections\[\]

Each section should have:

id  
projectId  
type  
title  
content  
displayOrder  
visibility

Additional structured fields may exist depending on section type.

---

# **7\. FLEXIBLE SECTION SYSTEM**

Projects require different technical structures.

Therefore, the CMS should support flexible section types.

Potential types include:

overview  
problem  
approach  
architecture  
dataset  
pipeline  
model  
experiment  
ablation  
metrics  
results  
technology  
memory  
retrieval  
agents  
reasoning  
financial-analysis  
portfolio-analysis  
comparison  
visualization  
evaluation  
testing  
reproducibility  
limitations  
future-work  
links

The final type registry should remain centralized.

Do not scatter section type strings throughout the application.

---

# **8\. SECTION TYPE REGISTRY**

Conceptually:

Section Type  
     ↓  
Schema  
     ↓  
Editor  
     ↓  
Renderer

For example:

architecture

may define:

title  
description  
diagram  
components  
status

while:

metrics

may define:

title  
metrics\[\]

The implementation should use typed validation.

---

# **9\. SECTION ORDER**

Each project section should have an explicit order.

Example:

1\. Overview  
2\. Problem  
3\. Architecture  
4\. Implementation  
5\. Results  
6\. Limitations  
7\. Future Work

The order should be editable through the CMS.

Do not rely on database insertion order.

---

# **10\. SECTION VISIBILITY**

Sections should support visibility states.

Possible states:

Visible  
Hidden  
Draft  
Archived

Publication rules should determine whether the section appears publicly.

---

# **11\. RICH TEXT**

The CMS may support rich text for appropriate content.

Potential formatting:

* headings  
* paragraphs  
* lists  
* emphasis  
* links  
* inline code  
* code blocks  
* quotes

Do not allow arbitrary HTML unless there is a clear security and sanitization strategy.

---

# **12\. STRUCTURED CONTENT OVER RAW HTML**

Prefer structured content where possible.

For example:

Metric

should be represented as structured data rather than:

\<div\>95.20%\</div\>

This enables:

* validation  
* consistent rendering  
* search  
* filtering  
* accessibility  
* future redesigns  
* analytics

---

# **13\. PROJECT METRICS**

Metrics should be first-class structured entities where useful.

Potential fields:

id  
projectId  
name  
value  
unit  
context  
dataset  
configuration  
status  
source  
displayOrder

Potential status:

Measured  
Verified  
Derived  
Target  
Benchmark  
Documented  
---

# **14\. METRIC VALUE TYPES**

The CMS should support values such as:

number  
percentage  
currency  
ratio  
multiplier  
text  
range  
boolean

The actual schema should prevent invalid combinations where possible.

---

# **15\. METRIC CONTEXT**

A metric should support context.

For example:

Metric:  
Test Accuracy

Value:  
93.86%

Dataset:  
CIFAR-10

Model:  
T=2 Ternary KD \+ QAT

Status:  
Measured

This prevents orphan numbers from appearing on the public page.

---

# **16\. EVIDENCE STATUS**

Important content should support evidence status.

Possible values:

Verified  
Measured  
Derived  
Documented  
Implemented  
Experimental  
Specified  
Target  
Assumption  
Planned  
Future  
Needs Verification

The CMS should use the centralized evidence vocabulary defined by:

CONTENT\_EVIDENCE\_RULES.md

Do not create competing evidence systems.

---

# **17\. PROJECT LINKS**

Links should be structured.

Potential link types:

GitHub  
Demo  
Documentation  
Paper  
Dataset  
Deployment  
External Reference

Each link should support:

label  
url  
type  
displayOrder  
visibility

URLs should be validated.

---

# **18\. PROJECT TECHNOLOGIES**

Technologies should ideally be reusable entities or controlled values.

Example:

Python  
TypeScript  
PyTorch  
FastAPI  
Next.js  
Streamlit  
PostgreSQL  
FAISS

Projects can reference technologies.

This avoids inconsistent naming such as:

Python  
python  
PYTHON  
---

# **19\. TAGS**

Tags should be reusable.

Example:

AI Systems  
Machine Learning  
Computer Vision  
RAG  
Agents  
Memory  
Quantization  
Optimization  
Finance

Projects may have multiple tags.

Do not create unnecessary duplicate tags.

---

# **20\. CATEGORIES**

Categories represent broader project types.

Examples:

Featured  
Supporting  
Research  
Coming Soon

or more specific domain categories if required.

Category definitions should be centralized.

---

# **21\. PROJECT STATUS**

Project status is different from evidence status.

Example:

Project Status:  
Completed

does not mean:

Every claim:  
Verified

Keep these concepts separate.

---

# **22\. FEATURED STATE**

Projects should support a featured flag.

Example:

featured \= true

The public website can use this to determine featured projects.

Do not hard-code featured projects into page components.

---

# **23\. DISPLAY ORDER**

Projects should support explicit ordering.

Potential fields:

featuredOrder  
displayOrder

The exact model should be decided based on actual UI requirements.

---

# **24\. ARCHIVING**

Projects should be archivable without immediate permanent deletion.

Preferred state:

Published  
   ↓  
Unpublished  
   ↓  
Archived

Archived content should not appear in public project listings unless explicitly requested.

---

# **25\. SOFT DELETE**

Where appropriate, use soft deletion or archival.

Permanent deletion should be restricted.

Before permanent deletion:

* check dependencies  
* preserve revisions where required  
* protect related media  
* protect audit history  
* confirm authorization

---

# **26\. PROFILE**

The CMS should eventually support structured profile information.

Potential fields:

name  
headline  
location  
summary  
profileImage  
resume  
socialLinks  
contactLinks

Sensitive personal information should not automatically become publicly visible.

---

# **27\. EXPERIENCE**

Experience should support:

organization  
role  
location  
startDate  
endDate  
description  
highlights  
technologies  
displayOrder  
visibility

The public site should control how much information is displayed.

---

# **28\. EDUCATION**

Education should support:

institution  
degree  
field  
startDate  
endDate  
grade  
description  
highlights  
displayOrder  
visibility

Do not invent education information.

---

# **29\. SKILLS**

Skills should support grouping.

Example:

Programming  
AI / ML  
Generative AI  
Backend  
Data  
Infrastructure  
Tools

Skills should optionally reference technology entities.

---

# **30\. ACHIEVEMENTS**

Achievements should support:

title  
organization  
date  
description  
link  
displayOrder  
visibility

Only publish achievements supported by evidence.

---

# **31\. CERTIFICATIONS**

Certifications should support:

name  
issuer  
date  
credentialId  
credentialUrl  
description  
displayOrder  
visibility

Do not fabricate credentials.

---

# **32\. MEDIA LIBRARY**

Media should be managed independently from project content.

Potential media types:

Image  
Diagram  
Screenshot  
PDF  
Document  
Video  
Other  
---

# **33\. MEDIA ASSET**

Potential fields:

id  
filename  
storageKey  
mimeType  
size  
width  
height  
altText  
caption  
createdAt  
updatedAt

Additional metadata may be added when required.

---

# **34\. MEDIA REFERENCES**

Projects and pages should reference media assets.

Avoid scattering raw file paths throughout the application.

Preferred:

Project  
   ↓  
Media Reference  
   ↓  
Media Asset  
---

# **35\. IMAGE REPLACEMENT**

The CMS should eventually allow authorized users to replace images without modifying source code.

For example:

Current Profile Image  
        ↓  
Replace  
        ↓  
New Media Asset

The system should validate the uploaded file before replacing the reference.

---

# **36\. ALT TEXT**

Images intended for public display should support alt text.

Alt text should describe meaningful content.

Do not automatically use filenames as alt text.

Decorative images may use an appropriate empty alt strategy where applicable.

---

# **37\. FILE UPLOAD SECURITY**

Uploads must be validated.

Validate:

* MIME type  
* file extension  
* file size  
* dimensions where appropriate  
* storage path  
* filename handling

Do not trust browser-provided metadata blindly.

---

# **38\. NAVIGATION**

Navigation items should support:

label  
href  
type  
displayOrder  
visibility  
openInNewTab

Potential types:

Internal  
External

Do not allow invalid navigation links to be published.

---

# **39\. PAGE MANAGEMENT**

The CMS may eventually support page-level configuration.

Potential pages:

Home  
Projects  
About  
Contact

Pages may support:

title  
slug  
description  
visibility  
sections  
SEO

Do not turn every visual element into a CMS field.

---

# **40\. PAGE SECTIONS**

Pages may contain configurable sections.

Example:

Home  
 ├── Hero  
 ├── Featured Projects  
 ├── About Preview  
 └── Contact CTA

Only introduce editable page sections where they provide meaningful value.

---

# **41\. SEO**

Each public page/project should optionally support:

seoTitle  
metaDescription  
canonicalUrl  
ogImage  
robots

SEO metadata should be validated.

Avoid duplicate metadata definitions.

---

# **42\. SITE SETTINGS**

Site-wide settings may include:

siteName  
siteDescription  
defaultOgImage  
defaultSeoTitle  
contactEmail  
socialLinks  
analyticsConfiguration

Sensitive configuration should NOT be stored as normal public CMS content.

---

# **43\. DRAFTS**

Content editing should normally begin as a draft.

Draft content should not automatically become public.

Example:

Create  
 ↓  
Draft  
 ↓  
Preview  
 ↓  
Publish  
---

# **44\. PREVIEW**

Authorized users should be able to preview draft content.

Preview should:

* render the actual public component structure  
* use draft content  
* avoid permanently publishing  
* be access-controlled

---

# **45\. PUBLISH**

Publishing should be an explicit action.

Publishing should validate content first.

Potential validation:

Required fields  
Valid URLs  
Valid section types  
Valid metrics  
Valid media  
SEO requirements  
Publication state

If validation fails, publishing should be blocked or clearly report the failure.

---

# **46\. UNPUBLISH**

Authorized users should be able to remove content from the public site without deleting it.

Example:

Published  
   ↓  
Unpublished

The content should remain recoverable.

---

# **47\. REVISION HISTORY**

Content changes should eventually create revisions.

A revision should conceptually include:

id  
entityType  
entityId  
version  
snapshot  
createdBy  
createdAt  
changeSummary

The exact storage representation may differ.

---

# **48\. REVISION COMPARISON**

Where practical, the CMS should allow comparing revisions.

Useful information:

Previous  
Current  
Changed fields  
Author  
Timestamp

Do not expose internal revision details publicly.

---

# **49\. RESTORE**

Authorized users should eventually be able to restore an earlier revision.

Restore should:

* create a new revision  
* preserve the old revision  
* validate restored content  
* not silently destroy history

---

# **50\. AUDIT LOG**

Audit logs should record important administrative actions.

Potential actions:

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

Audit logs should include appropriate actor and timestamp information.

---

# **51\. AUDIT DATA MINIMIZATION**

Do not store sensitive content unnecessarily in audit logs.

Never store:

* passwords  
* API keys  
* tokens  
* secret credentials

Audit logs should describe the action rather than capture sensitive values.

---

# **52\. USER MANAGEMENT**

The CMS should eventually support authenticated users.

Potential fields:

id  
email  
name  
role  
status  
createdAt  
updatedAt  
lastLoginAt

Only collect information that is necessary.

---

# **53\. ROLES**

A minimal initial role model may be:

Admin  
Editor

Do not create complex role hierarchies unless actual requirements justify them.

---

# **54\. PERMISSIONS**

Potential permissions:

projects.read  
projects.create  
projects.update  
projects.delete  
projects.publish

profile.update

media.upload  
media.delete

navigation.update

settings.update

users.manage

audit.read

The exact permission system can remain simpler if only one trusted administrator exists initially.

---

# **55\. AUTHORIZATION**

Every sensitive CMS operation must verify authorization server-side.

Do not rely on:

* hidden UI controls  
* client-side checks  
* route visibility  
* JavaScript conditions

A user who cannot perform an action must be rejected by the server.

---

# **56\. CONTENT VALIDATION**

Validation should exist at multiple levels:

Editor Validation  
       ↓  
Server Validation  
       ↓  
Database Constraints

Client-side validation improves UX.

Server-side validation provides the security boundary.

---

# **57\. SLUGS**

Project slugs should be:

* unique  
* URL-safe  
* stable where possible  
* validated

Changing a published slug should be treated carefully.

If slug changes are supported, consider redirects.

---

# **58\. URL STABILITY**

Existing public project URLs should be preserved where possible.

Do not change existing slugs unnecessarily during CMS migration.

If a slug must change:

Old URL  
   ↓  
Redirect  
   ↓  
New URL

should be considered.

---

# **59\. PUBLIC CONTENT QUERY**

The public site should query only content eligible for publication.

Conceptually:

Project  
\+  
Published  
\+  
Visible

before rendering publicly.

Drafts and archived content must not leak into public queries.

---

# **60\. DATABASE SOURCE OF TRUTH**

Once a project is fully migrated to the CMS, the database should become its authoritative content source.

During migration, the application may temporarily support both:

TypeScript  
\+  
Database

but the precedence must be explicit.

---

# **61\. MIGRATION**

Migration should be staged.

Preferred process:

Existing TS Content  
      ↓  
Normalize  
      ↓  
Validate  
      ↓  
Import  
      ↓  
Compare  
      ↓  
Verify  
      ↓  
Switch Read Path  
      ↓  
Enable CMS Editing

Do not migrate content without verification.

---

# **62\. MIGRATION VALIDATION**

Before switching a project from TypeScript to database content, compare:

* title  
* description  
* sections  
* metrics  
* links  
* technologies  
* status  
* featured state  
* media  
* evidence information

The rendered public page should remain functionally equivalent unless a deliberate improvement is intended.

---

# **63\. CONTENT PROVENANCE**

Important project content should be able to record its source.

Possible source types:

Repository  
README  
Experiment Artifact  
Resume  
Documentation  
Manual Entry  
External Source

This supports future verification.

---

# **64\. EVIDENCE-AWARE CMS**

The CMS should make it difficult to accidentally publish unsupported claims.

Where practical:

Claim  
 ↓  
Evidence Status  
 ↓  
Source  
 ↓  
Publication

Important metrics should not be publishable without required context.

---

# **65\. PROJECT-SPECIFIC STRUCTURE**

The CMS must support project-specific modules.

Examples:

The Inevitable  
→ Architecture / Protocols / Agents / Governance

Cortex Lab  
→ Memory / Retrieval / Agents / Reasoning

CIFAR-10 Ternary ResNet  
→ Experiments / Quantization / QAT / Results

Financial Dashboard  
→ Financial Metrics / Ratios / Forecasts

Portfolio Optimization  
→ Covariance / Optimization / Portfolio Allocation

Computer Vision  
→ Captioning / Segmentation / Evaluation

Do not force every project into one rigid schema.

---

# **66\. CONTENT COMPONENT MAPPING**

Structured content should map to reusable renderers.

Conceptually:

Section Type  
     ↓  
Renderer Registry  
     ↓  
React Component

Example:

metrics  
   ↓  
MetricsSection

architecture  
   ↓  
ArchitectureSection

comparison  
   ↓  
ComparisonSection

This allows CMS content to drive the public UI without creating a custom page implementation for every project.

---

# **67\. VERSIONED CONTENT**

The system should distinguish:

Current Draft  
Current Published Version  
Previous Versions

The public site should use the published version.

Admin users should be able to work on a draft without changing public content.

---

# **68\. PREVIEW SECURITY**

Draft previews must be protected.

Do not expose draft content through publicly guessable URLs.

Preview access should require appropriate authorization or secure preview tokens.

---

# **69\. CACHE INVALIDATION**

Publishing content may require invalidating or revalidating relevant cached pages.

Examples:

Publish Project  
      ↓  
Invalidate Project Page  
      ↓  
Invalidate Project Listing if needed

The exact mechanism should follow current Next.js patterns.

---

# **70\. DATABASE PERFORMANCE**

Public queries should remain efficient.

Potential indexes may be needed for:

slug  
status  
visibility  
publishedAt  
featured  
displayOrder  
tags

Indexes should be introduced based on actual query patterns.

---

# **71\. SEARCHABILITY**

Structured CMS content should make future search possible.

Potential searchable fields:

* project title  
* description  
* section text  
* technologies  
* tags  
* skills

Do not introduce a dedicated search engine until search requirements justify it.

---

# **72\. ANALYTICS**

CMS analytics should remain separate from content storage.

Content may optionally expose:

viewCount

but analytics should not automatically be stored inside project content unless there is a clear reason.

---

# **73\. CONTENT EXPORT**

The CMS should eventually support exporting important content.

Possible formats:

JSON  
CSV  
Markdown

The exact formats can be decided later.

Export is useful for:

* backup  
* migration  
* recovery  
* portability

---

# **74\. CONTENT IMPORT**

Import may eventually support structured migration from the existing TypeScript content.

Import should validate before writing to the database.

Never blindly import arbitrary content.

---

# **75\. BACKUP AND RECOVERY**

Database-backed content should have a recovery strategy.

Potential mechanisms:

* database backups  
* revision history  
* exports  
* source control for schema/migrations

The CMS must not become a single point of irreversible content loss.

---

# **76\. CONTENT DELETION**

Before deleting a project or asset:

Check:

* references  
* related projects  
* media usage  
* revisions  
* links  
* public routes

Deletion should be deliberate and authorized.

---

# **77\. MEDIA DELETION**

Do not delete a media asset if another published page still references it.

The CMS should ideally detect references before deletion.

---

# **78\. CONTENT DEPENDENCIES**

Examples:

Project  
 ├── Sections  
 ├── Metrics  
 ├── Technologies  
 ├── Tags  
 ├── Media  
 ├── Links  
 └── Revisions

Deletion or modification must respect these relationships.

---

# **79\. CMS ERROR HANDLING**

The CMS should clearly handle:

* invalid content  
* failed saves  
* failed uploads  
* database errors  
* authorization failures  
* validation errors  
* publish failures  
* missing media  
* duplicate slugs

Errors should be understandable without exposing internal system details.

---

# **80\. CMS SECURITY**

The CMS must follow the security requirements in:

SECURITY\_AND\_QUALITY.md

At minimum:

* server-side authorization  
* secure sessions  
* validated inputs  
* safe uploads  
* protected secrets  
* rate limiting where appropriate  
* audit logging  
* secure database access

---

# **81\. CMS DOES NOT CONTROL PRESENTATION ARBITRARILY**

The CMS should control content and selected presentation configuration.

It should NOT allow arbitrary users to destroy the design system by entering arbitrary:

* colors  
* fonts  
* spacing  
* CSS  
* layouts

The public visual identity remains governed by:

DESIGN\_SYSTEM.md  
---

# **82\. CONTENT VS PRESENTATION**

CMS controls:

What the portfolio says

Application/design system controls:

How the portfolio looks

This separation is fundamental.

---

# **83\. CMS EDITORIAL CONTROL**

The CMS should allow editors to control:

* content  
* ordering  
* visibility  
* status  
* evidence labels  
* media  
* links  
* publication

without requiring them to modify React components.

---

# **84\. CMS TECHNICAL CONTROL**

Developers remain responsible for:

* components  
* renderers  
* database schema  
* validation logic  
* security  
* authentication  
* authorization  
* migrations  
* deployment  
* design system

Do not turn the CMS into a code editor.

---

# **85\. INITIAL IMPLEMENTATION PRIORITY**

The first CMS implementation should prioritize:

1\. Authentication  
2\. Projects  
3\. Project editing  
4\. Project sections  
5\. Metrics  
6\. Media  
7\. Draft / Publish  
8\. Preview  
9\. Revisions  
10\. Audit Log

Then expand into:

Profile  
Experience  
Education  
Skills  
Achievements  
Certifications  
Navigation  
SEO  
Settings  
Analytics  
Search  
---

# **86\. DO NOT BUILD EVERYTHING AT ONCE**

The CMS should be delivered incrementally.

A working project editor is more valuable than a partially implemented universal CMS.

---

# **87\. GOLDEN RULE**

The CMS should make this possible:

Change Content  
      ↓  
Validate  
      ↓  
Preview  
      ↓  
Publish  
      ↓  
Public Portfolio Updates

without requiring:

Edit React Code  
      ↓  
Edit TypeScript Data  
      ↓  
Rebuild Manually

for ordinary content changes.

---

# **88\. FINAL CMS PRINCIPLE**

The ideal future system is:

> A secure, structured, evidence-aware content platform that gives the portfolio owner full control over content while keeping the public experience stable, fast, accessible, and visually consistent.

The CMS should increase control without increasing unnecessary complexity.

---

