\# DESIGN\_SYSTEM.md

\> This document defines the visual and interaction system for the portfolio.  
\>  
\> The current public design is established and intentionally distinctive.  
\>  
\> Future development must preserve this visual identity unless an explicit redesign is requested.  
\>  
\> The CMS/admin dashboard may use a more functional interface, but the public portfolio must remain visually consistent with this document.

\---

\# 1\. DESIGN PHILOSOPHY

The portfolio uses an:

\- editorial  
\- technical  
\- minimal  
\- warm  
\- sophisticated  
\- restrained

visual language.

The design should feel like a combination of:

\`\`\`text  
Editorial Portfolio  
        \+  
Technical Documentation  
        \+  
Modern Product Interface

It should not look like a generic SaaS dashboard or generic developer portfolio.

---

# **2\. DESIGN PRIORITY**

When making UI changes, prioritize in this order:

1\. Preserve existing visual identity  
2\. Maintain usability  
3\. Maintain accessibility  
4\. Maintain responsive behavior  
5\. Improve consistency  
6\. Add functionality  
7\. Add visual enhancement only when justified

Do not sacrifice the established design merely to introduce a new component or framework pattern.

---

# **3\. LOCKED COLOR PALETTE**

The current public palette is intentionally warm and dark.

## **Background**

\#14130f

Primary page background.

---

## **Primary Text**

\#f2eee7

Used for:

* major headings  
* important text  
* primary labels  
* key information

---

## **Secondary / Muted Text**

\#a39a8c

Used for:

* supporting text  
* metadata  
* descriptions  
* secondary information

---

## **Card Background**

\#1b1914

Used for:

* cards  
* panels  
* project blocks  
* contained content

---

## **Border**

\#2b2822

Used for:

* card borders  
* dividers  
* subtle UI boundaries  
* input boundaries where appropriate

---

## **Accent**

\#dd8748

The primary warm orange accent.

Use for:

* links  
* important interactive states  
* selected states  
* small highlights  
* technical metadata accents  
* important visual emphasis

Accent usage should remain restrained.

---

# **4\. COLOR RULE**

Do not replace the current palette with:

* blue SaaS themes  
* purple gradients  
* neon colors  
* excessive green  
* generic black/white themes  
* glassmorphism palettes  
* arbitrary gradients

Do not introduce new primary brand colors without explicit instruction.

Additional neutral shades may be introduced only when necessary for accessibility or UI hierarchy and should remain compatible with the existing palette.

---

# **5\. TYPOGRAPHY**

The established typography uses three primary font roles.

## **Display Font**

Fraunces

Use for:

* major page titles  
* project titles  
* editorial headings  
* major visual statements

---

## **Body Font**

Archivo

Use for:

* body text  
* descriptions  
* navigation  
* UI labels  
* paragraphs

---

## **Technical / Metadata Font**

IBM Plex Mono

Use for:

* metadata  
* technical labels  
* tags  
* project identifiers  
* code-like information  
* small technical annotations

---

# **6\. TYPOGRAPHY PRINCIPLE**

Typography should create hierarchy rather than decoration.

Recommended hierarchy:

Fraunces  
    ↓  
Major heading

Archivo  
    ↓  
Body / UI

IBM Plex Mono  
    ↓  
Technical metadata

Do not use every font everywhere.

Use each family for its intended role.

---

# **7\. HEADING STYLE**

Headings should be:

* confident  
* editorial  
* readable  
* appropriately spaced

Avoid:

* excessive uppercase headings  
* overly condensed typography  
* tiny headings  
* excessive font-weight variation  
* decorative typography that reduces readability

---

# **8\. BODY TEXT**

Body text should be comfortable to read.

Avoid:

* excessively long line lengths  
* tiny font sizes  
* dense paragraphs  
* low contrast  
* large blocks without spacing

Use paragraphs, lists and subheadings to create breathing room.

---

# **9\. TECHNICAL METADATA**

IBM Plex Mono should be used for technical metadata such as:

PROJECT / 01  
AI SYSTEMS  
STATUS: COMPLETED  
2026  
PYTHON  
TYPESCRIPT

Metadata should remain subtle.

It should not overpower the main content.

---

# **10\. CARDS**

Cards use the established warm-dark surface:

\#1b1914

with subtle borders:

\#2b2822

Cards should feel:

* structured  
* calm  
* editorial  
* tactile

Avoid excessive:

* shadows  
* gradients  
* glow effects  
* floating glass panels  
* decorative borders

---

# **11\. BORDER STYLE**

Borders should generally be:

* thin  
* subtle  
* low contrast  
* consistent

The existing border language should be preserved.

Do not add heavy outlines unless required for accessibility or a specific interaction.

---

# **12\. BORDER RADIUS**

The portfolio uses rounded cards and containers.

Preserve the existing radius language.

Do not introduce radically different radius styles across components.

For example, avoid mixing:

sharp rectangles  
\+  
pill-shaped everything  
\+  
extremely rounded cards

without a deliberate reason.

---

# **13\. SPACING**

Spacing should follow a consistent rhythm.

Prefer:

* generous section spacing  
* clear card padding  
* readable text spacing  
* strong separation between major sections

Avoid:

* cramped layouts  
* excessive whitespace that disconnects related information  
* arbitrary margins  
* inconsistent component spacing

---

# **14\. LAYOUT PHILOSOPHY**

The public portfolio should feel:

Structured  
\+  
Editorial  
\+  
Responsive  
\+  
Intentional

Layouts should not become overly dense.

Use whitespace to establish hierarchy.

---

# **15\. GRID SYSTEM**

Project collections and content blocks may use responsive grids.

The grid should:

* adapt to viewport size  
* preserve readable card widths  
* maintain consistent gaps  
* avoid awkward single-card rows where possible

Do not hard-code desktop-only layouts.

---

# **16\. PROJECT CARDS**

Project cards should communicate quickly:

* project name  
* category/domain  
* short description  
* status where relevant  
* important metadata  
* optional featured indicator

They should provide a clear path to the project detail page.

Do not turn cards into miniature full case studies.

---

# **17\. PROJECT DETAIL PAGES**

Project detail pages should prioritize:

Title  
↓  
Positioning  
↓  
Overview  
↓  
Technical Story  
↓  
Architecture  
↓  
Evidence / Results  
↓  
Limitations  
↓  
Future Work

The exact structure varies by project.

See:

PROJECT\_CONTENT\_GUIDELINES.md

for content rules.

---

# **18\. HERO SECTIONS**

Hero sections should be visually strong but restrained.

Avoid:

* giant animated backgrounds  
* excessive gradients  
* particle effects  
* unnecessary 3D scenes  
* constant motion  
* generic AI imagery

The typography and layout should carry the visual identity.

---

# **19\. INTERACTION DESIGN**

Interactions should feel deliberate.

Use interaction to communicate:

* clickability  
* navigation  
* state changes  
* hierarchy  
* feedback

Avoid interaction solely for decoration.

---

# **20\. LINKS**

Links should be visually identifiable.

The orange accent:

\#dd8748

may be used for important links and interactive emphasis.

Do not make every piece of text orange.

---

# **21\. BUTTONS**

Buttons should remain visually consistent with the warm technical aesthetic.

Primary actions may use the accent color.

Secondary actions may use:

* neutral borders  
* card backgrounds  
* muted text

Avoid generic brightly colored SaaS buttons.

---

# **22\. FORM DESIGN**

Public forms such as Contact should use:

* dark warm surfaces  
* subtle borders  
* clear labels  
* strong focus states  
* readable input text  
* appropriate validation feedback

Do not sacrifice accessibility for minimalism.

---

# **23\. INPUT STATES**

Inputs should clearly communicate:

Default  
Focus  
Filled  
Error  
Disabled  
Success

Focus states must be visible.

Do not rely exclusively on subtle color differences.

---

# **24\. STATUS BADGES**

Status badges should be restrained.

Potential statuses include:

Completed  
In Development  
Research  
Prototype  
Planned  
Archived

Do not use large colorful badges that dominate the project card.

---

# **25\. EVIDENCE BADGES**

Evidence labels may include:

Verified  
Measured  
Derived  
Target  
Documented  
Planned  
Needs Verification

These should be visually subordinate to the actual content.

Their purpose is clarity, not decoration.

---

# **26\. TABLES**

Tables should match the existing visual language.

Use:

* subtle borders  
* readable typography  
* sufficient row spacing  
* responsive behavior

For wide technical tables, provide a usable mobile strategy.

Do not allow tables to destroy page layout on small screens.

---

# **27\. DATA VISUALIZATION**

Charts should visually belong to the portfolio.

Use restrained styling.

Charts should prioritize:

* readability  
* labels  
* comparison  
* context

Avoid:

* excessive colors  
* 3D charts  
* decorative chart effects  
* unnecessary animation

The existing warm palette should influence visualization styling.

---

# **28\. ARCHITECTURE DIAGRAMS**

Architecture diagrams should be:

* technically accurate  
* minimal  
* readable  
* consistent  
* responsive

Prefer diagrams that communicate system relationships clearly.

Do not create diagrams merely because a project page "should have a diagram."

---

# **29\. IMAGES**

Images should support the story.

Useful images include:

* project screenshots  
* architecture diagrams  
* model visualizations  
* application interfaces  
* experiment results

Avoid generic stock imagery.

---

# **30\. PROFILE IMAGE**

The current profile image is part of the established portfolio identity.

The implementation currently uses a public profile image asset.

Replacing the image should not require redesigning the surrounding layout.

---

# **31\. ICONOGRAPHY**

The project uses Lucide React.

Prefer the existing icon system.

Icons should:

* be simple  
* support meaning  
* remain visually consistent  
* not replace readable text when text is necessary

Do not introduce multiple unrelated icon libraries without a strong reason.

---

# **32\. ANIMATION PHILOSOPHY**

Animations should be:

* subtle  
* purposeful  
* fast enough to feel responsive  
* respectful of reduced-motion preferences

Avoid:

* constant movement  
* excessive parallax  
* bouncing UI  
* attention-grabbing effects  
* long entrance animations

---

# **33\. REVEAL ANIMATION**

The current Reveal component uses mount-based animation and reduced-motion handling.

This approach should be preserved unless there is a demonstrated reason to change it.

Important principle:

> Content must never become inaccessible simply because an animation fails to execute.

This is particularly important for:

* screenshots  
* automated rendering  
* PDFs  
* accessibility  
* reduced-motion users

---

# **34\. REDUCED MOTION**

Respect user preferences for reduced motion.

When reduced motion is requested:

* minimize animation  
* avoid unnecessary transitions  
* ensure content remains immediately visible

Do not treat animation as required functionality.

---

# **35\. HOVER EFFECTS**

Hover states may be used for:

* cards  
* links  
* buttons  
* navigation

Keep them subtle.

Avoid large movement or dramatic transformations.

---

# **36\. RESPONSIVE DESIGN**

The public portfolio must work across:

Mobile  
Tablet  
Laptop  
Desktop  
Large Desktop

Responsive behavior should preserve:

* hierarchy  
* readability  
* navigation  
* card usability  
* project exploration  
* forms

Do not simply shrink desktop layouts.

---

# **37\. MOBILE NAVIGATION**

Mobile navigation should remain easy to use.

Do not hide essential navigation behind unnecessarily complex interactions.

Touch targets must be sufficiently large.

---

# **38\. ACCESSIBILITY**

Accessibility is part of the design system.

Maintain:

* semantic HTML  
* keyboard navigation  
* visible focus states  
* sufficient contrast  
* alt text  
* accessible labels  
* meaningful headings  
* reduced-motion support

Do not remove semantic elements solely for styling convenience.

---

# **39\. FOCUS STATES**

Every interactive element should have a visible focus state.

Focus indicators should fit the visual system while remaining clearly visible.

Do not use:

outline: none

without providing an accessible replacement.

---

# **40\. CONTRAST**

The warm muted palette must still maintain sufficient contrast.

Do not use:

\#a39a8c

at extremely small sizes if contrast becomes insufficient.

When necessary, use a stronger text value while preserving the overall palette.

---

# **41\. DARK MODE**

The current public design is already a dark theme.

Do not introduce a light theme unless explicitly requested.

Do not create multiple theme systems unnecessarily.

---

# **42\. ADMIN DASHBOARD**

The admin dashboard is allowed to be more functional and information-dense than the public portfolio.

It may use:

* side navigation  
* tables  
* forms  
* filters  
* editors  
* toolbars  
* compact controls  
* dense metadata

However, it should still use compatible:

* typography  
* color tokens  
* spacing principles  
* border language

The admin UI does NOT need to copy the public layout.

---

# **43\. ADMIN VS PUBLIC VISUAL PRIORITY**

Public:

Brand  
Editorial  
Storytelling  
Visual hierarchy  
Exploration

Admin:

Efficiency  
Editing  
Information density  
Workflow  
Control

Both should feel like parts of the same product.

---

# **44\. CMS EDITOR**

The project editor should prioritize usability.

Editors may need:

* title fields  
* descriptions  
* section controls  
* rich text  
* metrics  
* links  
* media  
* status  
* visibility  
* ordering  
* evidence status  
* preview  
* publish controls

Do not make the editor visually complicated merely to make it look sophisticated.

---

# **45\. PUBLIC / ADMIN SEPARATION**

Do not accidentally introduce admin controls into the public UI.

Public visitors should never see:

* edit buttons  
* CMS controls  
* internal IDs  
* draft metadata  
* unpublished content  
* audit information

unless explicitly intended.

---

# **46\. VISUAL HIERARCHY**

Every page should establish:

Primary  
   ↓  
Secondary  
   ↓  
Supporting  
   ↓  
Metadata

Example:

Project Title  
   ↓  
Positioning Statement  
   ↓  
Description  
   ↓  
Technical Details  
   ↓  
Metadata  
---

# **47\. CONTENT DENSITY**

Technical detail is welcome.

Visual density is not.

Break complex information into:

* sections  
* cards  
* tables  
* diagrams  
* lists  
* expandable areas where appropriate

Do not put all technical information into one enormous text block.

---

# **48\. TECHNICAL DEPTH WITHOUT VISUAL CHAOS**

Complex projects such as:

* The Inevitable  
* Cortex Lab  
* CIFAR-10 Ternary ResNet

may require substantial technical content.

Use progressive disclosure where useful.

For example:

High-Level Architecture  
      ↓  
Component Detail  
      ↓  
Implementation Detail  
      ↓  
Experimental Detail

The reader should be able to stop at the level of detail they need.

---

# **49\. EMPTY STATES**

If content is missing:

* explain what is unavailable  
* avoid broken visual areas  
* avoid fake placeholder content

Do not display invented project information to make a page appear complete.

---

# **50\. LOADING STATES**

Loading states should be minimal and consistent.

Do not add complex skeleton systems unless they provide a real UX benefit.

---

# **51\. ERROR STATES**

Error states should:

* be understandable  
* preserve the visual system  
* avoid exposing technical secrets  
* provide recovery where appropriate

---

# **52\. SEO AND VISUAL DESIGN**

SEO improvements must not require sacrificing the established design.

Semantic HTML should be preferred over visually-driven hacks.

---

# **53\. PERFORMANCE**

Visual design must not create unnecessary performance costs.

Avoid:

* oversized images  
* unnecessary client-side JavaScript  
* heavy animation libraries beyond existing requirements  
* large background videos  
* unnecessary third-party widgets

Use optimized assets.

---

# **54\. COMPONENT CONSISTENCY**

Before creating a new UI component:

1. inspect existing components  
2. determine whether an existing component can be reused  
3. preserve established styling  
4. extend rather than duplicate when appropriate

The same interaction should not look completely different in different parts of the portfolio.

---

# **55\. DESIGN TOKENS**

Where practical, centralize reusable values for:

* colors  
* typography  
* spacing  
* radii  
* borders  
* transitions

Do not duplicate raw values throughout dozens of components.

The exact implementation may use Tailwind tokens, CSS variables, or another appropriate mechanism.

---

# **56\. RAW COLOR USAGE**

The following values are the established brand tokens:

Background:       \#14130f  
Primary Text:     \#f2eee7  
Muted Text:       \#a39a8c  
Card:             \#1b1914  
Border:           \#2b2822  
Accent:           \#dd8748

When a component requires one of these semantic roles, use the corresponding design token rather than inventing a visually similar replacement.

---

# **57\. NO GENERIC REDESIGN**

Do not transform the portfolio into:

* generic SaaS  
* generic AI startup landing page  
* generic developer portfolio  
* glassmorphism dashboard  
* neon cyberpunk interface  
* excessive gradient design  
* card-heavy template

The existing design is intentional.

---

# **58\. NO UNNECESSARY VISUAL EXPERIMENTS**

Do not introduce:

* 3D scenes  
* animated backgrounds  
* particle systems  
* cursor effects  
* excessive blur  
* decorative noise  
* giant gradients  
* unnecessary illustrations

unless explicitly requested.

---

# **59\. DESIGN CHANGE RULE**

Before making a significant public visual change, ask:

1. Does this solve an actual UX problem?  
2. Does the current design already solve it?  
3. Does the change preserve the established visual identity?  
4. Can the improvement be made without redesigning the page?  
5. Is the change explicitly requested?

If not, prefer preserving the current design.

---

# **60\. VISUAL REGRESSION**

After significant UI changes, verify:

* desktop layout  
* mobile layout  
* typography  
* colors  
* spacing  
* card styling  
* navigation  
* project pages  
* animations  
* accessibility  
* existing routes

A functional change is not complete if it unintentionally damages the established visual system.

---

# **61\. DESIGN QUALITY CHECKLIST**

Before considering a public UI change complete:

### **Visual**

* Existing palette preserved  
* Typography hierarchy preserved  
* Card language preserved  
* Border language preserved  
* Spacing remains consistent  
* No unnecessary gradients  
* No generic redesign

### **Interaction**

* Hover states work  
* Focus states work  
* Keyboard interaction works  
* Reduced motion is respected

### **Responsive**

* Mobile checked  
* Tablet checked  
* Desktop checked  
* Tables remain usable  
* Navigation remains usable

### **Accessibility**

* Semantic structure preserved  
* Contrast checked  
* Alt text added where needed  
* Form labels present  
* Focus states visible

### **Performance**

* Images optimized  
* No unnecessary client-side code  
* No unnecessary animation  
* No unnecessary dependencies

---

# **62\. GOLDEN RULE**

The portfolio should look like:

> **The same portfolio, only better engineered and more capable.**

It should NOT look like:

> **A completely different website after every architectural change.**

Functionality can evolve dramatically.

The public visual identity should evolve slowly and intentionally.

---

