

\# ADMIN\_DASHBOARD\_SPECIFICATION.md

\> This document defines the functional and UX requirements for the portfolio's protected administrative dashboard.  
\>  
\> The dashboard is intended for authorized users to manage portfolio content without directly editing application source code.  
\>  
\> This document defines the admin experience and workflows.  
\>  
\> The underlying content/data architecture is defined in \`CMS\_SPECIFICATION.md\`.  
\>  
\> Security requirements are defined in \`SECURITY\_AND\_QUALITY.md\`.  
\>  
\> The public visual system is defined in \`DESIGN\_SYSTEM.md\`.

\---

\# 1\. PURPOSE

The admin dashboard should provide a secure control center for managing the portfolio.

The dashboard should eventually allow the authorized user to:

\- view portfolio status  
\- create projects  
\- edit projects  
\- delete/archive projects  
\- reorder projects  
\- feature projects  
\- manage project sections  
\- manage metrics  
\- manage technologies  
\- manage tags  
\- manage media  
\- manage profile  
\- manage experience  
\- manage education  
\- manage skills  
\- manage achievements  
\- manage certifications  
\- manage navigation  
\- manage SEO  
\- manage publication state  
\- preview drafts  
\- publish changes  
\- unpublish content  
\- view revision history  
\- restore previous revisions  
\- inspect audit activity  
\- manage site settings

\---

\# 2\. ADMIN PRINCIPLE

The dashboard should optimize for:

\`\`\`text  
Control  
\+  
Clarity  
\+  
Speed  
\+  
Safety  
\+  
Predictability

It should not optimize for visual decoration.

The admin interface is a management tool.

---

# **3\. PUBLIC VS ADMIN**

The system should have a clear separation:

PUBLIC WEBSITE  
     ↓  
Visitors  
     ↓  
Read-only experience

and:

ADMIN DASHBOARD  
     ↓  
Authenticated users  
     ↓  
Content management

Public visitors must never receive administrative capabilities.

---

# **4\. ADMIN ROUTING**

The exact route may be decided during implementation.

A protected namespace such as:

/admin

is appropriate unless the existing application has a better convention.

Potential areas:

/admin  
/admin/projects  
/admin/projects/new  
/admin/projects/\[id\]  
/admin/profile  
/admin/experience  
/admin/education  
/admin/skills  
/admin/media  
/admin/navigation  
/admin/seo  
/admin/settings  
/admin/revisions  
/admin/audit

Do not expose administrative pages without authentication and authorization.

---

# **5\. DASHBOARD LAYOUT**

The preferred structure is:

┌───────────────────────────────────────────────┐  
│ Header                                        │  
├──────────────┬────────────────────────────────┤  
│              │                                │  
│ Sidebar      │ Main Content                   │  
│              │                                │  
│ Dashboard    │                                │  
│ Projects     │                                │  
│ Profile      │                                │  
│ Experience   │                                │  
│ Education    │                                │  
│ Skills       │                                │  
│ Achievements │                                │  
│ Media        │                                │  
│ Navigation   │                                │  
│ SEO          │                                │  
│ Revisions    │                                │  
│ Audit Log    │                                │  
│ Settings     │                                │  
│              │                                │  
└──────────────┴────────────────────────────────┘

The exact layout may change during implementation.

---

# **6\. ADMIN SIDEBAR**

The sidebar should provide access to major management areas.

Potential navigation:

Dashboard  
Projects  
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

The sidebar should clearly indicate the current section.

---

# **7\. ADMIN HEADER**

The admin header may contain:

* current section  
* user information  
* preview action  
* public-site link  
* logout  
* contextual actions

Avoid unnecessary controls.

---

# **8\. DASHBOARD OVERVIEW**

The dashboard homepage should provide a useful overview.

Potential information:

Projects  
Published Projects  
Draft Projects  
Featured Projects  
Recent Changes  
Recent Media  
Pending Verification  
Recent Activity

Do not create vanity metrics unless they provide useful information.

---

# **9\. PROJECT SUMMARY**

The overview may show:

Total Projects  
Published  
Draft  
In Development  
Archived  
Featured

These should be calculated from actual content state.

---

# **10\. RECENT ACTIVITY**

The dashboard may show recent activity such as:

Project updated  
Project published  
Media uploaded  
Profile updated  
Draft created  
Revision restored

Activity should link to the relevant entity where useful.

---

# **11\. PROJECT MANAGEMENT**

The Projects section is the primary CMS management area.

It should provide:

* project list  
* search  
* filtering  
* sorting  
* status  
* featured state  
* visibility  
* ordering  
* create  
* edit  
* archive  
* publish  
* unpublish

---

# **12\. PROJECT LIST**

A project list should display useful metadata.

Potential columns:

Project  
Category  
Status  
Visibility  
Featured  
Updated  
Published  
Actions

Do not overload the table with unnecessary fields.

---

# **13\. PROJECT SEARCH**

Search should support useful project fields such as:

* title  
* slug  
* description  
* technology  
* tag

Search should be added after the basic project-management workflow is stable.

---

# **14\. PROJECT FILTERS**

Potential filters:

Status  
Category  
Featured  
Visibility  
Evidence State  
Updated Date

Filters should be combinable where useful.

---

# **15\. PROJECT SORTING**

Potential sorting:

Display Order  
Updated Date  
Created Date  
Title  
Published Date

Default sorting should reflect the public portfolio ordering.

---

# **16\. PROJECT CREATION**

The Create Project workflow should collect the minimum required information first.

Suggested initial fields:

Title  
Slug  
Positioning / Subtitle  
Description  
Category  
Status  
Visibility  
Featured

Additional content can be added after creation.

---

# **17\. PROJECT EDITOR**

The project editor should be structured rather than one enormous form.

Conceptual layout:

Project  
├── Identity  
├── Classification  
├── Content  
├── Sections  
├── Metrics  
├── Technologies  
├── Tags  
├── Media  
├── Links  
├── Evidence  
├── SEO  
└── Publication  
---

# **18\. PROJECT IDENTITY**

Identity fields:

Title  
Slug  
Short Description  
Positioning Statement  
Project Year

Only include fields actually supported by the domain model.

---

# **19\. PROJECT CLASSIFICATION**

Classification controls may include:

Category  
Tags  
Technologies  
Status  
Featured  
Display Order  
---

# **20\. PROJECT CONTENT EDITOR**

The editor should support flexible sections.

Example:

Overview  
Problem  
Approach  
Architecture  
Dataset  
Model  
Experiment  
Results  
Limitations  
Future Work

The available section types should come from the CMS section registry.

---

# **21\. SECTION MANAGEMENT**

Each section should support:

Title  
Type  
Content  
Visibility  
Display Order  
Evidence Status

Where relevant, additional structured fields should appear.

---

# **22\. SECTION REORDERING**

Sections should be reorderable.

Possible interaction:

Drag  
↓  
Move  
↓  
Save

If drag-and-drop is implemented, provide a keyboard-accessible alternative.

---

# **23\. SECTION VISIBILITY**

Editors should be able to:

Show  
Hide  
Draft  
Archive

without deleting the underlying content.

---

# **24\. RICH TEXT EDITOR**

Where rich text is appropriate, the editor may support:

* headings  
* paragraphs  
* lists  
* bold  
* italic  
* links  
* inline code  
* code blocks

Avoid unrestricted HTML.

Content should be sanitized appropriately.

---

# **25\. METRIC EDITOR**

Metrics should be editable as structured records.

Potential fields:

Metric Name  
Value  
Unit  
Context  
Dataset  
Configuration  
Evidence Status  
Source  
Display Order  
---

# **26\. METRIC VALIDATION**

The editor should prevent obvious invalid states.

Examples:

Missing metric name  
Invalid numeric value  
Missing unit where required  
Missing context for important metrics  
Invalid evidence status  
---

# **27\. EVIDENCE STATUS IN EDITOR**

The editor should make evidence state visible.

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

The vocabulary must remain synchronized with:

CONTENT\_EVIDENCE\_RULES.md  
---

# **28\. VERIFICATION FLAGS**

The dashboard should make unresolved content easy to identify.

Example:

⚠ Needs Verification

Potential dashboard view:

Content Requiring Verification  
\--------------------------------  
Kaynes FY2025 metric  
Diabetes performance metric  
Project implementation status

Do not automatically publish unresolved claims.

---

# **29\. TECHNOLOGY MANAGEMENT**

Projects should be able to select technologies from reusable values.

Example:

Python  
TypeScript  
PyTorch  
Next.js  
FastAPI  
Streamlit  
PostgreSQL  
FAISS

Avoid creating duplicate technology names.

---

# **30\. TAG MANAGEMENT**

Editors should be able to:

* add tags  
* remove tags  
* reuse existing tags  
* create new tags where authorized

Tags should remain controlled and meaningful.

---

# **31\. LINK MANAGEMENT**

The project editor should support:

GitHub  
Demo  
Documentation  
Paper  
Dataset  
Deployment  
External Reference

Each URL should be validated before publication.

---

# **32\. MEDIA MANAGEMENT**

Projects should be able to reference media from the media library.

The editor should allow:

Select Media  
Upload Media  
Replace Media  
Remove Reference

Removing a reference must not necessarily delete the underlying media asset.

---

# **33\. MEDIA LIBRARY**

The Media page should provide:

* asset grid/list  
* search  
* filtering  
* upload  
* metadata editing  
* preview  
* usage information  
* delete/archive where appropriate

---

# **34\. MEDIA SEARCH**

Search may use:

* filename  
* caption  
* alt text  
* type  
* project usage

---

# **35\. MEDIA DETAILS**

A media detail panel may show:

Preview  
Filename  
Type  
Dimensions  
Size  
Alt Text  
Caption  
Created  
Used By  
---

# **36\. MEDIA REPLACEMENT**

When replacing an image:

Existing Asset  
      ↓  
Select Replacement  
      ↓  
Validate  
      ↓  
Preview  
      ↓  
Confirm  
      ↓  
Update Reference

Do not automatically destroy the old asset if it is still referenced elsewhere.

---

# **37\. PROFILE MANAGEMENT**

The Profile editor should manage:

* name  
* headline  
* summary  
* location  
* profile image  
* resume  
* social links  
* contact links

Sensitive data should be intentionally controlled.

---

# **38\. EXPERIENCE MANAGEMENT**

The Experience editor should support:

Organization  
Role  
Location  
Start Date  
End Date  
Description  
Highlights  
Technologies  
Display Order  
Visibility  
---

# **39\. EDUCATION MANAGEMENT**

The Education editor should support:

Institution  
Degree  
Field  
Start Date  
End Date  
Grade  
Description  
Highlights  
Display Order  
Visibility  
---

# **40\. SKILLS MANAGEMENT**

Skills should be grouped logically.

Potential groups:

Programming  
AI / ML  
Generative AI  
Backend  
Data  
Infrastructure  
Tools

The public display should remain concise.

---

# **41\. ACHIEVEMENT MANAGEMENT**

Achievements should support:

Title  
Organization  
Date  
Description  
Link  
Display Order  
Visibility  
---

# **42\. CERTIFICATION MANAGEMENT**

Certifications should support:

Name  
Issuer  
Date  
Credential ID  
Credential URL  
Description  
Display Order  
Visibility  
---

# **43\. NAVIGATION MANAGEMENT**

Navigation should be editable through the dashboard.

Potential controls:

Label  
URL  
Type  
Order  
Visibility  
Open in New Tab

Navigation changes should be previewable before publication where appropriate.

---

# **44\. PAGE MANAGEMENT**

If page-level CMS management is implemented, pages may include:

Home  
Projects  
About  
Contact

The dashboard should avoid exposing unnecessary low-level layout controls.

---

# **45\. SEO MANAGEMENT**

SEO controls may include:

SEO Title  
Meta Description  
Canonical URL  
Open Graph Image  
Robots

Provide useful character guidance where appropriate.

---

# **46\. DRAFT STATE**

Editors should be able to save changes as drafts.

Example:

Edit  
 ↓  
Save Draft  
 ↓  
Continue Editing

Saving a draft must not automatically change the public page.

---

# **47\. UNSAVED CHANGES**

The editor should detect unsaved changes where practical.

Potential behavior:

Unsaved Changes  
     ↓  
Leave Page?  
     ↓  
Save / Discard / Cancel  
---

# **48\. AUTOSAVE**

Autosave may be introduced if it genuinely improves the editing experience.

If implemented:

* avoid creating excessive revisions  
* communicate save state  
* handle network failures  
* never silently lose content

Autosave is optional.

---

# **49\. PREVIEW**

The editor should provide:

Preview Draft

The preview should resemble the actual public page.

Ideally:

Admin Editor  
      ↓  
Draft Content  
      ↓  
Public Renderer  
      ↓  
Preview

This reduces differences between preview and production.

---

# **50\. PUBLISH WORKFLOW**

Publishing should be explicit.

Example:

Draft  
 ↓  
Validate  
 ↓  
Preview  
 ↓  
Publish

The publish action should communicate what is about to become public.

---

# **51\. PUBLISH VALIDATION**

Before publishing, validate:

Required fields  
Valid slug  
Valid links  
Valid section types  
Valid metrics  
Media references  
Evidence states  
SEO  
Publication rules

If validation fails, explain what needs to be fixed.

---

# **52\. PUBLISH CONFIRMATION**

For significant content changes, a confirmation step may display:

You are about to publish:  
Project Name

Changes:  
\- Updated description  
\- Added architecture section  
\- Updated metric

Avoid unnecessary confirmation dialogs for trivial actions.

---

# **53\. UNPUBLISH**

Authorized users should be able to unpublish content.

Example:

Published  
   ↓  
Unpublish  
   ↓  
No longer public

The content should remain recoverable.

---

# **54\. ARCHIVE**

Archiving should remove content from normal public listings while preserving the record.

Example:

Published  
 ↓  
Unpublish  
 ↓  
Archive  
---

# **55\. DELETE**

Permanent deletion should be a protected action.

Before deleting:

* check dependencies  
* check media references  
* check revisions  
* check relationships  
* confirm authorization

Prefer archive over deletion where possible.

---

# **56\. REVISION HISTORY**

Each important content entity should eventually expose revision history.

Example:

Project  
 ├── v1  
 ├── v2  
 ├── v3  
 └── Current  
---

# **57\. REVISION VIEW**

A revision page should show:

Version  
Author  
Date  
Change Summary  
Status

and allow inspection of the previous content.

---

# **58\. REVISION COMPARISON**

Where practical, support:

Previous Version  
       ↕  
Current Version

with changed fields highlighted.

---

# **59\. RESTORE REVISION**

Authorized users may restore a previous version.

Restoring should:

1. create a new revision  
2. preserve existing history  
3. validate the restored content  
4. require publishing if public content should change

Do not silently overwrite history.

---

# **60\. AUDIT LOG**

The Audit Log should show important administrative actions.

Potential fields:

Timestamp  
User  
Action  
Entity  
Entity ID  
Summary

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
---

# **61\. AUDIT FILTERS**

Useful filters:

User  
Action  
Entity Type  
Date

Do not make audit logs unnecessarily complicated.

---

# **62\. SITE SETTINGS**

Settings may include:

Site Name  
Site Description  
Default SEO  
Default Social Image  
Contact Configuration

Sensitive secrets must not be treated as ordinary editable public settings.

---

# **63\. USER MANAGEMENT**

If multiple administrators are required, the dashboard may provide:

Users  
Roles  
Permissions  
Status

A single trusted administrator does not require unnecessary enterprise-style user management.

---

# **64\. ROLE MANAGEMENT**

Potential roles:

Admin  
Editor

Admin may manage:

* users  
* permissions  
* settings  
* publishing

Editor may manage:

* content  
* projects  
* media

The exact permission matrix should be finalized during implementation.

---

# **65\. DASHBOARD SEARCH**

A global search may eventually cover:

Projects  
Profile  
Experience  
Education  
Skills  
Media  
Tags  
Technologies

Do not implement global search before the underlying content model is stable.

---

# **66\. KEYBOARD ACCESSIBILITY**

The admin dashboard should support keyboard navigation.

Important operations must not depend exclusively on drag-and-drop or mouse interaction.

---

# **67\. RESPONSIVE ADMIN**

The admin dashboard should remain usable on:

Desktop  
Laptop  
Tablet  
Mobile

However, complex editing workflows may reasonably prioritize desktop.

Do not make the admin UI unusable on smaller screens.

---

# **68\. ADMIN DESIGN LANGUAGE**

The admin dashboard may be more functional than the public portfolio.

It should prioritize:

Dense Information  
Clear Controls  
Forms  
Tables  
Navigation  
Workflow

It should still share the portfolio's:

* color tokens  
* typography  
* border language  
* spacing principles

where practical.

---

# **69\. ADMIN COMPONENTS**

Potential reusable admin components:

AdminSidebar  
AdminHeader  
DataTable  
SearchInput  
FilterBar  
StatusBadge  
FormField  
RichTextEditor  
SectionEditor  
MetricEditor  
MediaPicker  
MediaUploader  
PreviewPanel  
PublishControls  
RevisionList  
AuditTable  
ConfirmDialog

Only create components that are genuinely reusable.

---

# **70\. FORM DESIGN**

Forms should provide:

* clear labels  
* required indicators  
* validation  
* helpful errors  
* save state  
* keyboard support  
* accessible controls

Do not rely solely on placeholder text as labels.

---

# **71\. FORM VALIDATION**

Validation should happen:

Client  
   \+  
Server

Client validation improves user experience.

Server validation protects the system.

---

# **72\. ERROR STATES**

The dashboard should clearly communicate:

Save Failed  
Upload Failed  
Validation Failed  
Unauthorized  
Not Found  
Publish Failed  
Network Error

Errors should be actionable where possible.

---

# **73\. SUCCESS STATES**

After actions such as:

* save  
* publish  
* upload  
* archive

provide clear confirmation.

Do not require users to infer success from a disappearing button.

---

# **74\. LOADING STATES**

Use clear loading states for:

* database operations  
* uploads  
* previews  
* publishing  
* revision loading

Avoid unnecessary loading animations.

---

# **75\. DRAFT INDICATORS**

Draft content should be visually obvious inside the admin interface.

Example:

DRAFT

The public site must never accidentally expose draft status/content.

---

# **76\. PUBLIC PREVIEW**

Preview should clearly indicate:

DRAFT PREVIEW

to prevent confusion between preview and public content.

---

# **77\. CONTENT STATUS**

Project status and publication status should remain separate.

For example:

Project Status:  
In Development

Publication:  
Published

These are different concepts.

---

# **78\. EVIDENCE STATUS**

Evidence state is also separate.

Example:

Project:  
Completed

Publication:  
Published

Metric:  
Needs Verification

This allows the CMS to represent nuanced content states.

---

# **79\. CONTENT WARNINGS**

The dashboard should surface important warnings.

Examples:

Metric needs verification  
Broken link  
Missing alt text  
Missing SEO description  
Draft not published  
Referenced media missing  
Conflicting source

Warnings should help the editor maintain quality.

---

# **80\. CONTENT HEALTH**

A future dashboard may show a content-health summary:

Content Health  
\--------------  
Missing SEO: 2  
Missing Alt Text: 3  
Broken Links: 1  
Needs Verification: 4  
Drafts: 2

This is useful because the portfolio is evidence-aware.

---

# **81\. BULK ACTIONS**

Bulk actions may eventually include:

Archive  
Publish  
Unpublish  
Change Category  
Change Tags

Bulk publishing should be used carefully.

Do not introduce bulk operations before individual operations are reliable.

---

# **82\. REORDERING PROJECTS**

The dashboard should eventually allow project ordering.

Possible interface:

Featured Projects  
──────────────────  
1\. The Inevitable  
2\. Cortex Lab  
3\. CIFAR-10 Ternary ResNet

The ordering should control public presentation.

---

# **83\. FEATURED PROJECT MANAGEMENT**

The dashboard should allow:

Feature  
Unfeature  
Reorder Featured Projects

The public page should use this configuration.

Do not hard-code featured projects into React components.

---

# **84\. VISIBILITY MANAGEMENT**

Editors should be able to control whether content is:

Visible  
Hidden  
Draft  
Archived

Visibility must be enforced server-side.

---

# **85\. PROJECT DUPLICATION**

A future duplicate-project feature may be useful.

If implemented:

* generate a new identity  
* generate a unique slug  
* duplicate content intentionally  
* do not duplicate revision history  
* clearly indicate the new draft

This is optional.

---

# **86\. IMPORT**

The dashboard may eventually support importing structured project data.

Import must:

* validate data  
* preview changes  
* report conflicts  
* avoid overwriting existing content silently

---

# **87\. EXPORT**

The dashboard may eventually support content export.

Possible formats:

JSON  
Markdown  
CSV

Export should respect permissions.

---

# **88\. MOBILE ADMIN PRIORITY**

Mobile admin should prioritize:

* status checks  
* quick edits  
* publishing  
* visibility  
* simple content updates

Complex rich editing may remain desktop-first.

---

# **89\. SECURITY BOUNDARY**

The dashboard must assume:

> The browser is untrusted.

Every sensitive action must be validated server-side.

Never trust:

* hidden fields  
* client-side roles  
* client-side status  
* client-side permissions

---

# **90\. ADMIN SESSION**

Authenticated sessions should:

* expire appropriately  
* be protected  
* support logout  
* avoid exposing credentials  
* follow secure cookie/session practices

Detailed security requirements belong in:

SECURITY\_AND\_QUALITY.md  
---

# **91\. NO SECRETS IN CMS**

The CMS must never expose:

* API keys  
* database passwords  
* private tokens  
* secret environment variables

Sensitive configuration belongs in secure server-side configuration.

---

# **92\. PUBLIC CONTENT SAFETY**

Before publishing, the CMS should ideally detect obvious issues such as:

* secret-like strings  
* invalid URLs  
* missing required metadata  
* suspicious raw HTML  
* missing evidence context

Automated detection is a safety layer, not a replacement for human review.

---

# **93\. ADMIN ANALYTICS**

If analytics are available, the dashboard may eventually show:

Project Views  
Popular Projects  
Traffic Trends

Analytics should remain separate from core content editing.

Do not let analytics complexity dominate the CMS.

---

# **94\. DASHBOARD PERFORMANCE**

The dashboard should remain responsive.

Prioritize:

* paginated tables where necessary  
* efficient queries  
* lazy loading for large media libraries  
* optimized previews  
* avoiding unnecessary requests

---

# **95\. ADMIN ERROR RECOVERY**

If an operation fails:

Do not lose user input.

Where possible:

* preserve form state  
* explain the error  
* allow retry  
* avoid silent failure

---

# **96\. ADMIN NAVIGATION SAFETY**

When leaving an editor with unsaved changes:

Save  
Discard  
Cancel

should be available where practical.

---

# **97\. ADMIN ACCESSIBILITY**

The dashboard must support:

* keyboard navigation  
* screen readers  
* visible focus states  
* semantic controls  
* accessible labels  
* adequate contrast  
* reduced motion

---

# **98\. ADMIN TESTING**

Critical admin flows should eventually be tested.

Priority:

Login  
 ↓  
Authorization  
 ↓  
Create Project  
 ↓  
Edit Project  
 ↓  
Save Draft  
 ↓  
Preview  
 ↓  
Publish  
 ↓  
Unpublish  
 ↓  
Restore Revision

Also test:

* invalid content  
* unauthorized access  
* media upload  
* media deletion  
* slug conflicts

---

# **99\. ADMIN UX PRINCIPLE**

The dashboard should minimize the number of steps required for common tasks.

Example:

Create Project  
↓  
Add Content  
↓  
Preview  
↓  
Publish

should be straightforward.

But dangerous actions such as permanent deletion should require additional protection.

---

# **100\. ADMIN VS CODE**

Normal content changes should eventually be possible without editing:

React components  
TypeScript files  
CSS

Developers should still use code for:

* new components  
* new section types  
* architecture changes  
* validation rules  
* database schema  
* security  
* system behavior

---

# **101\. CONTENT EDITORIAL WORKFLOW**

Recommended workflow:

Create / Edit  
      ↓  
Save Draft  
      ↓  
Validation  
      ↓  
Preview  
      ↓  
Review  
      ↓  
Publish  
---

# **102\. CONTENT QUALITY WORKFLOW**

Before publishing a major project update:

Content  
 ↓  
Evidence Check  
 ↓  
Technical Check  
 ↓  
Link Check  
 ↓  
Media Check  
 ↓  
SEO Check  
 ↓  
Preview  
 ↓  
Publish  
---

# **103\. DASHBOARD ROADMAP**

Initial dashboard:

Authentication  
Dashboard  
Projects  
Project Editor  
Draft / Publish  
Media

Next:

Profile  
Experience  
Education  
Skills  
Achievements  
Certifications  
Navigation

Then:

Revisions  
Audit Log  
SEO  
Settings  
Search  
Content Health  
Analytics

Do not build all layers simultaneously.

---

# **104\. WHAT NOT TO BUILD PREMATURELY**

Avoid unnecessary:

* complex page builders  
* arbitrary drag-and-drop layout systems  
* visual CSS editors  
* plugin marketplaces  
* multi-tenant architecture  
* complex workflow engines  
* enterprise permission systems  
* advanced analytics platforms

The portfolio is a personal CMS.

Keep it appropriately scoped.

---

# **105\. PUBLIC DESIGN PRESERVATION**

The dashboard must not force redesign of the public website.

The public design remains governed by:

DESIGN\_SYSTEM.md

The admin dashboard may be more utilitarian.

---

# **106\. ADMIN DESIGN PRINCIPLE**

The ideal admin dashboard should feel like:

> A calm, efficient control center for managing a technical portfolio.

Not:

> A generic enterprise SaaS administration template.

---

# **107\. FINAL DASHBOARD GOAL**

The final dashboard should allow the portfolio owner to manage:

CONTENT  
   ↓  
PROJECTS  
PROFILE  
EXPERIENCE  
EDUCATION  
SKILLS  
ACHIEVEMENTS  
CERTIFICATIONS  
MEDIA  
NAVIGATION  
SEO  
   ↓  
QUALITY  
   ↓  
EVIDENCE  
   ↓  
DRAFT  
   ↓  
PREVIEW  
   ↓  
PUBLISH  
   ↓  
REVISIONS  
   ↓  
AUDIT

while the public portfolio remains:

Fast  
Accessible  
Editorial  
Technical  
Warm  
Minimal  
Consistent  
---

# **108\. GOLDEN RULE**

The admin dashboard exists to make maintaining the portfolio easier.

It should never make the public portfolio more complicated.

The ideal outcome is:

> **Powerful administration behind a simple, polished public experience.**

---

