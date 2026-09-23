

\# SECURITY\_AND\_QUALITY.md

\> This document defines the security, reliability, accessibility, performance, testing, and quality requirements for the portfolio.  
\>  
\> These requirements apply to both the public portfolio and the administrative CMS.  
\>  
\> Security-sensitive functionality must be implemented server-side and validated independently of the client.  
\>  
\> The portfolio must prioritize correctness, maintainability, accessibility, and data safety over unnecessary complexity.

\---

\# 1\. PURPOSE

The portfolio is intended to evolve into a database-backed application with a protected administrative CMS.

As the system becomes more capable, the security and quality requirements become more important.

This document establishes the minimum engineering standards for:

\- authentication  
\- authorization  
\- sessions  
\- database access  
\- input validation  
\- file uploads  
\- secrets  
\- content publishing  
\- audit logging  
\- error handling  
\- accessibility  
\- performance  
\- testing  
\- dependency management  
\- deployment quality

\---

\# 2\. CORE PRINCIPLE

Use the following principle:

\> Never trust input simply because it came from the portfolio's own UI.

All important operations must assume that the client can be manipulated.

Security boundaries must exist on the server.

\---

\# 3\. SECURITY PRIORITY

Security decisions should prioritize:

\`\`\`text  
1\. Protect credentials and secrets  
2\. Protect administrative access  
3\. Protect database integrity  
4\. Protect unpublished content  
5\. Validate external input  
6\. Protect uploaded files  
7\. Minimize sensitive data exposure  
8\. Maintain useful auditability  
---

# **4\. PUBLIC VS ADMIN SECURITY**

The application has two fundamentally different security contexts.

PUBLIC  
  ↓  
Untrusted visitor  
  ↓  
Read-only content

and:

ADMIN  
  ↓  
Authenticated user  
  ↓  
Authorized operations  
  ↓  
Content mutation

Do not mix these boundaries.

---

# **5\. AUTHENTICATION**

The admin dashboard must require authentication.

Authentication must be implemented using an established, secure mechanism appropriate for the selected stack.

Do not create custom authentication cryptography.

Do not store plaintext passwords.

Do not implement authentication only through client-side state.

---

# **6\. SERVER-SIDE AUTHENTICATION**

Every protected admin request must be authenticated on the server.

The server must determine:

Who is the user?

before allowing sensitive operations.

Do not trust:

* client-side user objects  
* hidden fields  
* localStorage flags  
* UI state  
* query parameters

as proof of authentication.

---

# **7\. AUTHORIZATION**

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this action?

Both are required.

For example:

Authenticated  
      ↓  
Authorized?  
      ↓  
Allow / Reject  
---

# **8\. SERVER-SIDE AUTHORIZATION**

Sensitive operations must enforce authorization server-side.

Examples:

* publishing  
* deleting  
* restoring revisions  
* uploading media  
* changing navigation  
* changing settings  
* managing users

Hiding a button is not authorization.

---

# **9\. LEAST PRIVILEGE**

Users should receive only the permissions they need.

If the system has multiple roles:

Admin  
Editor

permissions should be explicitly defined.

Do not grant unrestricted access by default.

---

# **10\. ADMIN ROUTE PROTECTION**

All administrative routes must be protected.

Example:

/admin  
/admin/projects  
/admin/media  
/admin/settings

must not expose sensitive content or actions to unauthenticated users.

Protection should apply to:

* page rendering  
* server actions  
* route handlers  
* database mutations

---

# **11\. DIRECT API ACCESS**

Assume an attacker may call an endpoint directly without using the UI.

Therefore:

UI validation  
\+  
Server validation  
\+  
Authorization

are all required.

---

# **12\. SESSION SECURITY**

Administrative sessions should use secure session mechanisms.

Where applicable:

* secure cookies  
* HttpOnly cookies  
* appropriate SameSite policy  
* reasonable expiration  
* logout support  
* session invalidation

Do not expose session secrets to client-side JavaScript unnecessarily.

---

# **13\. SESSION EXPIRATION**

Sessions should not remain valid indefinitely without justification.

The exact expiration strategy should depend on the authentication system.

Avoid overly aggressive expiration that makes normal administration frustrating.

---

# **14\. LOGOUT**

The admin dashboard must provide a clear logout mechanism.

Logout should invalidate the appropriate session.

Do not simply redirect the user while leaving a valid session active.

---

# **15\. PASSWORD SECURITY**

If passwords are used:

* never store plaintext passwords  
* use a modern password hashing mechanism  
* use appropriate password policies  
* protect reset flows  
* protect authentication endpoints from abuse

Prefer established authentication providers/libraries over custom implementations.

---

# **16\. RATE LIMITING**

Rate limiting should be considered for operations that can be abused.

Examples:

* login  
* password reset  
* preview-token generation  
* public contact submission  
* expensive search  
* file uploads  
* sensitive API endpoints

Do not add rate limiting everywhere without identifying an actual need.

---

# **17\. BRUTE-FORCE PROTECTION**

Authentication endpoints should have appropriate protection against repeated failed attempts.

Possible mechanisms:

* rate limiting  
* temporary delays  
* lockout strategies  
* provider-level protection

Avoid permanent lockouts that can create denial-of-service problems for the administrator.

---

# **18\. CSRF PROTECTION**

State-changing operations must be protected according to the chosen framework/authentication architecture.

Do not assume that a same-origin application is automatically protected in every configuration.

Follow current Next.js and authentication-library guidance.

---

# **19\. XSS PROTECTION**

Never render untrusted HTML directly.

Potentially dangerous sources include:

* rich text  
* imported content  
* user input  
* external data  
* CMS content

Prefer structured content.

If HTML rendering is required:

Input  
 ↓  
Sanitization  
 ↓  
Validated HTML  
 ↓  
Rendering  
---

# **20\. RAW HTML**

Do not allow arbitrary HTML in CMS fields by default.

If raw HTML is ever required:

* document why  
* sanitize it  
* restrict allowed elements/attributes  
* test it  
* treat it as a security-sensitive feature

---

# **21\. SCRIPT INJECTION**

Never allow project content, descriptions, labels, or metadata to execute arbitrary JavaScript.

Do not provide a CMS feature that allows arbitrary script injection into public pages.

---

# **22\. SQL INJECTION**

Database queries must use parameterized queries or the safe query mechanisms provided by the chosen database library/ORM.

Never construct SQL using unchecked user input.

Bad pattern:

"SELECT \* FROM projects WHERE slug \= '" \+ slug \+ "'"

Use the appropriate parameterized mechanism instead.

---

# **23\. DATABASE ACCESS**

Database credentials must remain server-side.

The browser must never receive:

* database passwords  
* database connection strings  
* privileged database credentials

---

# **24\. DATABASE USER PERMISSIONS**

The application's database credentials should have only the permissions required by the application.

Avoid using unrestricted database administrator credentials for normal application traffic.

---

# **25\. DATABASE VALIDATION**

Database constraints should complement application validation.

Useful constraints may include:

* unique slugs  
* required fields  
* valid relationships  
* foreign keys  
* non-null fields where appropriate

Do not rely solely on client-side validation.

---

# **26\. TRANSACTIONS**

Use database transactions when multiple related changes must succeed or fail together.

Examples:

Publish Project  
\+  
Create Revision  
\+  
Create Audit Event

If these operations must remain consistent, use an appropriate transactional strategy.

---

# **27\. DATA INTEGRITY**

The CMS should prevent states such as:

Project references missing section  
Project references deleted media  
Published project has invalid slug  
Duplicate project slug

Relationships should be validated.

---

# **28\. INPUT VALIDATION**

Validate all externally supplied data.

Examples:

* form fields  
* query parameters  
* route parameters  
* JSON payloads  
* imported content  
* URLs  
* uploaded files

---

# **29\. VALIDATION LAYERS**

Use multiple validation layers where appropriate:

User Interface  
      ↓  
Server Validation  
      ↓  
Database Constraints

Client validation is for usability.

Server validation is the security boundary.

Database constraints protect integrity.

---

# **30\. SCHEMA VALIDATION**

Structured content should use schemas where appropriate.

Potentially use a validation library already compatible with the project.

Do not introduce a validation dependency without evaluating whether the existing stack already provides a suitable solution.

---

# **31\. URL VALIDATION**

CMS-managed URLs should be validated.

Check:

* valid URL structure  
* allowed protocols  
* appropriate external/internal handling

Avoid accepting dangerous protocols such as arbitrary JavaScript URLs.

---

# **32\. SLUG VALIDATION**

Project slugs should be:

* unique  
* URL-safe  
* predictable  
* validated

Published slug changes should be treated carefully.

---

# **33\. FILE UPLOAD SECURITY**

File uploads are security-sensitive.

Validate:

* file size  
* MIME type  
* extension  
* filename  
* dimensions where relevant  
* storage destination

Never trust the browser-provided MIME type alone.

---

# **34\. UPLOAD SIZE LIMITS**

Uploads should have explicit limits.

Different limits may be used for:

Images  
Documents  
Videos  
Other assets

The exact limits should be chosen based on actual portfolio requirements.

---

# **35\. FILENAME SECURITY**

Do not use user-provided filenames directly as storage paths.

Normalize or generate safe storage keys.

Avoid path traversal.

Example dangerous input:

../../secret-file

must never be able to influence storage paths directly.

---

# **36\. FILE TYPE RESTRICTION**

Only allow file types that the portfolio actually needs.

Do not allow arbitrary executable file uploads.

The initial media system should generally prioritize:

* images  
* diagrams  
* PDFs  
* approved documents

Additional formats should be introduced only when necessary.

---

# **37\. IMAGE PROCESSING**

If image transformations are introduced:

* validate source files  
* limit dimensions  
* prevent decompression/resource exhaustion where relevant  
* generate safe output formats  
* avoid processing untrusted files without limits

---

# **38\. MEDIA STORAGE**

Uploaded media should ideally use dedicated storage rather than arbitrary application directories when the architecture requires scalable or persistent storage.

The exact provider may be decided later.

Do not commit uploaded production media into source control unless intentionally required.

---

# **39\. MEDIA ACCESS**

Determine whether media should be:

Public  
Private  
Authenticated

based on its intended use.

Public portfolio images may be publicly accessible.

Private administrative assets must not be exposed accidentally.

---

# **40\. MEDIA DELETION**

Before deleting media:

1. check references  
2. identify dependent projects/pages  
3. protect published content  
4. require authorization

Do not delete an asset that is still required by a published page.

---

# **41\. SECRETS**

Never commit secrets.

Examples:

* API keys  
* database credentials  
* session secrets  
* private tokens  
* service credentials  
* cloud credentials

---

# **42\. ENVIRONMENT VARIABLES**

Use environment variables or an appropriate secret manager for sensitive configuration.

Publicly exposed environment variables must never contain server secrets.

---

# **43\. CLIENT VS SERVER ENVIRONMENT VARIABLES**

Be careful with framework conventions that expose selected environment variables to the browser.

Only intentionally public values should be exposed client-side.

---

# **44\. EXISTING SECRET EXPOSURE**

If an existing project contains an exposed API credential:

1. revoke the credential  
2. rotate it  
3. remove it from source  
4. move it to secure configuration  
5. inspect relevant history if necessary

Do not merely hide the key in the UI.

---

# **45\. HEALTHCARE PROJECT SECURITY**

The Healthcare AI Assistant currently requires particular caution because its implementation includes an AI API credential directly in client-side JavaScript.

This must NOT remain in a public production implementation.

Preferred architecture:

Browser  
   ↓  
Server / API Route  
   ↓  
Secure Environment Variable  
   ↓  
AI Provider

The browser should never receive the secret API credential.

---

# **46\. PERSONAL DATA**

Only store personal information that is necessary.

Potentially sensitive information should not automatically become publicly visible simply because it exists in the CMS.

Examples:

* phone number  
* private email  
* internal identifiers  
* credentials  
* private notes

---

# **47\. CONTACT FORM**

If the contact form is connected to a backend:

Protect it against:

* spam  
* abuse  
* oversized payloads  
* malicious input  
* email injection

Validate and sanitize all fields.

---

# **48\. EMAIL SECURITY**

If contact submissions are sent by email:

* never allow arbitrary email headers  
* validate sender addresses  
* sanitize subject/content  
* avoid direct user-controlled header construction

---

# **49\. PUBLISHING SECURITY**

Publishing is a privileged action.

Before publishing:

Authentication  
      ↓  
Authorization  
      ↓  
Validation  
      ↓  
Content Check  
      ↓  
Publish  
---

# **50\. DRAFT PROTECTION**

Draft content must not accidentally become public.

Check:

* public queries  
* static generation  
* caching  
* search  
* sitemap generation  
* metadata generation  
* API responses

Drafts must remain excluded from public surfaces.

---

# **51\. PREVIEW SECURITY**

Draft previews must be protected.

Do not use publicly guessable preview URLs.

If preview tokens are used:

* make them difficult to guess  
* give them appropriate expiration  
* validate them server-side  
* avoid exposing unnecessary draft data

---

# **52\. CACHE AND DRAFT LEAKAGE**

When using caching/revalidation, verify that:

Draft

cannot become a cached public response.

Publishing and unpublishing must correctly invalidate or revalidate affected content.

---

# **53\. REVISION SECURITY**

Revision history is administrative data.

It should not be publicly accessible.

Only authorized users should be able to:

* inspect revisions  
* compare revisions  
* restore revisions

---

# **54\. AUDIT LOG SECURITY**

Audit logs may contain sensitive operational information.

Protect them from public access.

Do not include secrets in audit events.

---

# **55\. AUDIT LOG DATA MINIMIZATION**

Audit logs should record:

* who  
* what  
* when  
* which entity  
* relevant summary

Avoid storing complete sensitive payloads unnecessarily.

---

# **56\. ERROR HANDLING**

Public errors should be safe.

Do not expose:

* stack traces  
* SQL queries  
* environment variables  
* internal filesystem paths  
* secret values  
* authentication internals

---

# **57\. ERROR MESSAGES**

Errors should be useful without leaking sensitive implementation details.

Bad:

PostgreSQL connection failed:  
password=...  
host=...

Better:

Unable to complete the request. Please try again.

Detailed diagnostics should remain in secure server logs.

---

# **58\. LOGGING**

Logs should be useful for debugging and monitoring.

Do not log:

* passwords  
* API keys  
* session tokens  
* private credentials  
* unnecessary personal data

---

# **59\. LOG LEVELS**

Use appropriate logging levels where supported:

Debug  
Info  
Warn  
Error

Avoid excessive production debug logging.

---

# **60\. DEPENDENCY SECURITY**

Before adding a dependency:

* evaluate necessity  
* check maintenance  
* check compatibility  
* check security history  
* check license compatibility where relevant  
* avoid unnecessary packages

---

# **61\. DEPENDENCY UPDATES**

Do not blindly upgrade every dependency.

For important updates:

1. inspect changelog  
2. check breaking changes  
3. update  
4. run tests  
5. run build  
6. inspect UI  
7. verify critical flows

---

# **62\. NEXT.JS SECURITY / COMPATIBILITY**

The project uses a current Next.js version.

Before modifying framework-sensitive functionality:

1. inspect existing implementation  
2. read relevant local Next.js documentation  
3. use current supported patterns  
4. avoid deprecated APIs  
5. test affected routes

Follow the requirements in `CLAUDE.md`.

---

# **63\. ACCESSIBILITY**

Accessibility is a quality requirement, not an optional enhancement.

The public portfolio and admin dashboard should support:

* semantic HTML  
* keyboard navigation  
* visible focus states  
* accessible labels  
* meaningful headings  
* sufficient contrast  
* alt text  
* reduced motion

---

# **64\. SEMANTIC HTML**

Prefer semantic elements such as:

header  
nav  
main  
section  
article  
footer  
button  
form  
label

Do not replace semantic controls with clickable generic `<div>` elements unnecessarily.

---

# **65\. KEYBOARD NAVIGATION**

Important functionality must be usable with a keyboard.

Test:

* navigation  
* links  
* buttons  
* forms  
* modals  
* editors  
* menus  
* publish controls

---

# **66\. FOCUS MANAGEMENT**

Interactive elements must have visible focus states.

When opening dialogs or modals:

* move focus appropriately  
* trap focus where necessary  
* restore focus when closed

Do not remove focus outlines without providing an accessible alternative.

---

# **67\. SCREEN READERS**

Important content should be understandable through semantic structure.

Use:

* meaningful headings  
* labels  
* ARIA only where appropriate  
* descriptive button text  
* alt text

Do not overuse ARIA when semantic HTML already provides the correct behavior.

---

# **68\. COLOR ACCESSIBILITY**

The established warm palette should remain accessible.

If muted text becomes difficult to read at small sizes:

* increase contrast  
* adjust typography  
* change size  
* preserve the overall design language

Do not sacrifice readability for exact color matching.

---

# **69\. REDUCED MOTION**

Respect `prefers-reduced-motion`.

When reduced motion is enabled:

* minimize animation  
* avoid unnecessary transitions  
* ensure content remains visible

---

# **70\. IMAGE ACCESSIBILITY**

Images should have meaningful alt text when they communicate information.

Decorative images should be treated appropriately.

Do not use filenames such as:

IMG\_4839.jpg

as the only accessible description.

---

# **71\. FORM ACCESSIBILITY**

Forms should provide:

* labels  
* clear errors  
* required indicators  
* focus states  
* keyboard navigation

Do not rely solely on placeholder text.

---

# **72\. PERFORMANCE PRINCIPLE**

Performance should be measured and improved where necessary.

Prioritize:

* server rendering where appropriate  
* efficient data access  
* optimized images  
* minimal client JavaScript  
* caching where useful  
* avoiding unnecessary dependencies

---

# **73\. IMAGE PERFORMANCE**

Use appropriate image optimization.

Avoid serving unnecessarily large images.

Prefer responsive image behavior where appropriate.

---

# **74\. CLIENT JAVASCRIPT**

Do not make components client-side unnecessarily.

Use client components when they genuinely require:

* browser APIs  
* stateful interaction  
* event handling  
* animation  
* client-only behavior

Prefer server-rendered content where practical.

---

# **75\. DATABASE PERFORMANCE**

Avoid unnecessary database queries.

Prefer:

* selecting only required fields  
* appropriate indexes  
* batching where appropriate  
* pagination for large datasets  
* caching when justified

---

# **76\. ADMIN PERFORMANCE**

The admin dashboard may contain larger datasets.

Use:

* pagination  
* search  
* filtering  
* lazy loading  
* optimized media previews

where appropriate.

Do not load the entire media library if only a small subset is visible.

---

# **77\. PUBLIC PERFORMANCE**

The public portfolio should remain fast.

Pay particular attention to:

* home page  
* project listing  
* project detail pages  
* images  
* fonts  
* client JavaScript

---

# **78\. SEO QUALITY**

Public pages should maintain:

* meaningful titles  
* descriptions  
* canonical URLs where needed  
* semantic headings  
* crawlable content  
* appropriate metadata

SEO must not expose drafts or private content.

---

# **79\. ACCESSIBLE URL STRUCTURE**

Public URLs should be:

* stable  
* readable  
* predictable

Existing project slugs should be preserved where possible.

---

# **80\. TESTING PRINCIPLE**

Testing should protect critical functionality.

Testing is especially important after:

* database migration  
* authentication changes  
* publishing changes  
* content model changes  
* UI refactors  
* dependency upgrades

---

# **81\. TESTING LEVELS**

Use the appropriate testing level:

Unit  
 ↓  
Integration  
 ↓  
Component  
 ↓  
End-to-End

Not every feature requires all levels.

---

# **82\. UNIT TESTS**

Useful unit-test targets include:

* validation functions  
* data transformations  
* metric calculations  
* utility functions  
* content normalization  
* permission checks

---

# **83\. INTEGRATION TESTS**

Useful integration tests include:

* database operations  
* content repository  
* publishing workflow  
* media references  
* authentication boundaries

---

# **84\. COMPONENT TESTS**

Where useful, test:

* forms  
* editors  
* project cards  
* status badges  
* navigation  
* interactive controls

Do not test implementation details unnecessarily.

---

# **85\. END-TO-END TESTS**

Important end-to-end flow:

Login  
 ↓  
Open Dashboard  
 ↓  
Create Project  
 ↓  
Edit Content  
 ↓  
Save Draft  
 ↓  
Preview  
 ↓  
Publish  
 ↓  
Visit Public Page  
 ↓  
Verify Published Content  
---

# **86\. SECURITY TESTS**

Test:

Unauthenticated Admin Access  
Unauthorized Mutation  
Invalid Input  
Invalid Slug  
Invalid URL  
Unsafe Upload  
Draft Exposure  
Revision Access  
---

# **87\. REGRESSION TESTING**

Before completing major changes, verify existing routes:

/  
 /projects  
 /projects/\[slug\]  
 /about  
 /contact

Also verify existing project cards and project pages.

---

# **88\. VISUAL REGRESSION**

After UI changes, inspect:

* desktop  
* mobile  
* project detail pages  
* navigation  
* cards  
* typography  
* animations  
* forms

The current visual identity must remain intact.

---

# **89\. BUILD VERIFICATION**

Before considering a significant change complete:

Lint  
 ↓  
Type Check  
 ↓  
Build  
 ↓  
Relevant Tests  
 ↓  
Manual / Visual Verification

Use the project's actual scripts.

Do not claim success if a required check was not run.

---

# **90\. TEST DATA**

Development/test data should be clearly separated from production content.

Do not accidentally populate production with fake placeholder content.

---

# **91\. SEED DATA**

If database seeding is introduced:

* keep seed data explicit  
* make it reproducible  
* prevent accidental production execution  
* document it

---

# **92\. MIGRATION TESTING**

Before migrating real content:

1. back up content  
2. test migration on a copy  
3. compare source and destination  
4. validate rendering  
5. inspect metrics  
6. inspect links  
7. inspect media  
8. verify publication state

---

# **93\. CONTENT PRESERVATION**

Migration must not silently change factual project content.

Especially preserve:

* measured results  
* evidence status  
* project status  
* links  
* technologies  
* project ordering  
* featured state

---

# **94\. BACKUP**

Before significant database migrations or content transformations:

* create a backup/export  
* verify that the backup exists  
* know how to restore it

Do not assume Git can restore database content.

---

# **95\. ROLLBACK**

Important deployments should have a rollback strategy.

Examples:

Application rollback  
Database migration rollback  
Content restoration  
Revision restore

The exact strategy depends on the deployment architecture.

---

# **96\. DEPLOYMENT**

Production deployment should verify:

* environment variables  
* database connectivity  
* authentication  
* public routes  
* admin routes  
* media storage  
* caching  
* SEO  
* error handling

---

# **97\. ENVIRONMENT SEPARATION**

Where practical:

Development  
Staging  
Production

should use separate resources and secrets.

Do not accidentally point local development at production data.

---

# **98\. PRODUCTION DEBUGGING**

Do not enable verbose debugging or development-only behavior in production unless explicitly required for a controlled diagnostic.

---

# **99\. CONTENT SECURITY**

The public portfolio should expose only intended published content.

Verify that:

* drafts are hidden  
* archived content is hidden  
* private media is protected  
* admin metadata is hidden  
* audit logs are hidden  
* revision history is hidden

---

# **100\. FINANCIAL CONTENT SAFETY**

Financial project pages should clearly represent historical analysis, calculations, forecasts, and assumptions.

Do not present mathematical outputs as guaranteed future investment results.

The Portfolio Optimization project is particularly important:

100% Kaynes

must be described as the unconstrained mathematical optimum under the specified historical assumptions—not as guaranteed investment advice.

---

# **101\. HEALTHCARE CONTENT SAFETY**

Healthcare projects must not claim:

* clinical validation  
* medical diagnosis  
* medical-grade reliability  
* professional replacement  
* clinically proven performance

unless appropriate evidence exists.

Use appropriate prototype/research/decision-support framing.

---

# **102\. EVIDENCE SAFETY**

Follow:

CONTENT\_EVIDENCE\_RULES.md

for:

* measured metrics  
* targets  
* assumptions  
* implementation status  
* future work  
* verification  
* conflicting sources

Do not publish unsupported claims.

---

# **103\. DATA SOURCE CONFLICTS**

If project artifacts contain conflicting information:

Source A  
   ≠  
Source B

do not silently choose one.

Investigate and resolve the conflict.

If unresolved:

Needs Verification

or omit the disputed information.

---

# **104\. ACCESS CONTROL TEST**

For every protected admin operation, ask:

> What happens if an unauthenticated user calls this directly?

Then:

> What happens if an authenticated but unauthorized user calls it directly?

Both cases must be handled safely.

---

# **105\. FAILURE SAFETY**

When an operation fails:

* do not partially corrupt data  
* preserve user input where practical  
* provide a useful error  
* log secure diagnostic information  
* allow retry where appropriate

---

# **106\. USER EXPERIENCE QUALITY**

Security should not make the dashboard unnecessarily difficult to use.

Aim for:

Secure  
\+  
Predictable  
\+  
Fast  
\+  
Understandable  
---

# **107\. DOCUMENTATION QUALITY**

Important architectural/security decisions should be documented.

Examples:

* authentication choice  
* database choice  
* storage choice  
* publishing model  
* revision strategy  
* permission model

Do not rely on undocumented assumptions.

---

# **108\. CODE QUALITY**

Prefer code that is:

* readable  
* typed  
* modular  
* testable  
* explicit

Avoid:

* unnecessary abstraction  
* duplicate logic  
* hidden side effects  
* excessive global state  
* giant components

---

# **109\. CHANGE DISCIPLINE**

For significant changes:

Inspect  
 ↓  
Plan  
 ↓  
Implement  
 ↓  
Test  
 ↓  
Review  
 ↓  
Verify

Do not make large speculative changes without understanding the existing implementation.

---

# **110\. GIT SAFETY**

Do not:

* rewrite history unnecessarily  
* delete unrelated work  
* overwrite user changes  
* commit secrets  
* make destructive repository changes without explicit instruction

Keep changes focused.

---

# **111\. SMALL CHANGES**

Prefer small, reversible implementation steps.

A migration should ideally allow:

Change  
 ↓  
Test  
 ↓  
Verify  
 ↓  
Next Change

rather than one massive rewrite.

---

# **112\. NO SILENT FAILURES**

Important operations should not silently fail.

Examples:

Save  
Publish  
Upload  
Delete  
Restore  
Migration

The user should know whether the operation succeeded.

---

# **113\. NO SILENT DATA LOSS**

Never overwrite content or revisions without appropriate protection.

Dangerous operations should require confirmation where appropriate.

---

# **114\. QUALITY GATES**

Before major milestones, verify:

### **Code**

* TypeScript passes  
* Lint passes  
* Build succeeds  
* Relevant tests pass

### **Security**

* Admin routes protected  
* Authorization enforced  
* Secrets protected  
* Upload validation implemented  
* Drafts protected

### **Content**

* Existing content preserved  
* Evidence rules preserved  
* Metrics verified  
* Links verified

### **UI**

* Public design preserved  
* Responsive behavior verified  
* Accessibility checked  
* Visual regressions checked

---

# **115\. PRE-PRODUCTION CHECKLIST**

Before production CMS launch:

* Authentication tested  
* Authorization tested  
* Session security reviewed  
* Database permissions reviewed  
* Environment variables reviewed  
* Secrets removed from source  
* Upload restrictions tested  
* Draft visibility tested  
* Preview security tested  
* Publishing tested  
* Unpublishing tested  
* Revision restore tested  
* Audit logging tested  
* Backup verified  
* Recovery strategy documented  
* Public routes verified  
* Admin routes verified  
* Mobile UI checked  
* Accessibility checked  
* Production build verified

---

# **116\. GOLDEN RULE**

The portfolio should be:

Secure  
\+  
Accurate  
\+  
Accessible  
\+  
Fast  
\+  
Maintainable  
\+  
Recoverable

A feature is not complete merely because it works in the happy path.

It should also behave safely when:

* input is invalid  
* users are unauthorized  
* files are malicious  
* databases fail  
* content conflicts  
* publishing fails  
* networks fail  
* users make mistakes

---

# **117\. FINAL QUALITY PRINCIPLE**

The portfolio should demonstrate engineering maturity through the system itself.

The goal is not:

> Maximum features.

The goal is:

> **A reliable, secure, evidence-aware, maintainable portfolio platform that can evolve without sacrificing the existing public experience.**

---

