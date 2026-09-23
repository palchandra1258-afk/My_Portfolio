

\# PROJECT\_CONTENT\_GUIDELINES.md

\> This document defines how projects must be presented throughout the portfolio.  
\>  
\> It governs project structure, storytelling, technical depth, writing style, evidence handling, and content selection.  
\>  
\> For the exact facts and approved positioning of each project, read \`PROJECT\_INVENTORY.md\`.  
\>  
\> For evidence classification and claim verification rules, read \`CONTENT\_EVIDENCE\_RULES.md\`.

\---

\# 1\. PURPOSE

The portfolio is not a collection of README files.

Each project should be presented as a polished technical case study that communicates:

1\. what the project is  
2\. why it exists  
3\. what problem it addresses  
4\. how it approaches the problem  
5\. how the system/model is designed  
6\. what was actually implemented  
7\. how it was evaluated  
8\. what results or evidence exist  
9\. what limitations remain  
10\. what could come next

The goal is to demonstrate:

\- technical understanding  
\- engineering ability  
\- architectural thinking  
\- experimentation  
\- evaluation discipline  
\- problem-solving  
\- technical judgment

The writing should be clear enough for a technical recruiter or engineer to understand quickly, while providing enough depth for a technically knowledgeable reader to explore further.

\---

\# 2\. CORE PRINCIPLE

Every project should answer:

\> What did I build or investigate, why did I build it, how does it work, and what evidence demonstrates the quality or outcome of the work?

Do not focus only on the technology stack.

A list such as:

\> Python, PyTorch, FastAPI, FAISS, PostgreSQL

does not explain the project.

Technology should support the story rather than become the story.

\---

\# 3\. PROJECT PAGE PHILOSOPHY

A strong project page should feel like a technical case study.

Preferred narrative:

\`\`\`text  
PROJECT  
   ↓  
CONTEXT  
   ↓  
PROBLEM  
   ↓  
APPROACH  
   ↓  
ARCHITECTURE  
   ↓  
IMPLEMENTATION  
   ↓  
EXPERIMENTS / ANALYSIS  
   ↓  
EVALUATION  
   ↓  
RESULTS  
   ↓  
LIMITATIONS  
   ↓  
CURRENT STATE  
   ↓  
FUTURE WORK

Not every project needs every stage.

The structure should follow the actual project.

---

# **4\. PROJECT STRUCTURE**

Every project should support a common core.

## **Core sections**

Normally include:

1. Project Title  
2. Short Positioning Statement  
3. Introduction / Overview  
4. Problem  
5. Approach  
6. Architecture or System Design  
7. Technologies  
8. Current State / Results  
9. Limitations  
10. Future Work  
11. Links

These are defaults, not mandatory requirements for every project.

---

# **5\. OPTIONAL PROJECT MODULES**

Projects may use any relevant modules.

Possible modules include:

## **General**

* Overview  
* Context  
* Problem  
* Goals  
* Approach  
* Architecture  
* Implementation  
* Technologies  
* Challenges  
* Trade-offs  
* Results  
* Metrics  
* Current Status  
* Limitations  
* Future Work  
* Links  
* Related Projects

## **Machine Learning**

* Dataset  
* Data Pipeline  
* Preprocessing  
* Feature Engineering  
* Model  
* Training  
* Validation  
* Testing  
* Calibration  
* Threshold Selection  
* Explainability  
* Experiments  
* Ablation Study  
* Model Comparison  
* Evaluation  
* Reproducibility  
* Artifacts

## **AI Systems**

* System Architecture  
* Cognitive Architecture  
* Memory  
* Retrieval  
* Knowledge Graph  
* Agents  
* Agent Orchestration  
* Reasoning  
* State Management  
* Protocols  
* Governance  
* Observability  
* Research Architecture  
* Implementation Status

## **Computer Vision**

* Dataset  
* Image Processing  
* Captioning  
* Segmentation  
* Model Comparison  
* Inference Pipeline  
* Visualization  
* Batch Processing  
* Evaluation  
* Deployment

## **Model Optimization / Research**

* Research Question  
* Experimental Setup  
* Teacher Model  
* Student Model  
* Knowledge Distillation  
* Quantization  
* QAT  
* Ablation  
* Compression  
* Model Statistics  
* Results  
* Reproducibility

## **Finance**

* Financial Data  
* Financial Statements  
* Financial Metrics  
* Ratio Analysis  
* Benchmark  
* Scoring Methodology  
* Forecast  
* Comparative Analysis  
* DuPont Analysis  
* Visualization  
* Data Source  
* Methodology

## **Quantitative Finance**

* Investment Question  
* Investment Universe  
* Dataset  
* Return Model  
* Risk Model  
* Covariance Matrix  
* Optimization Problem  
* Constraints  
* Portfolio Allocation  
* Benchmark  
* Risk Analysis  
* Scenario Analysis  
* Limitations

---

# **6\. DO NOT FORCE ALL PROJECTS INTO THE SAME TEMPLATE**

This is a major requirement.

The portfolio contains fundamentally different types of work.

For example:

A cognitive AI system should not look identical to a financial dashboard.

A model-compression experiment should not look identical to a Streamlit application.

A quantitative finance project should not look identical to a computer-vision project.

Use a shared visual language and shared content primitives, but allow different technical structures.

---

# **7\. PROJECT INTRODUCTION**

The introduction should explain the project in approximately 1–3 concise paragraphs.

It should answer:

* What is it?  
* What does it do?  
* What technical area does it belong to?  
* What makes the project interesting?

Avoid beginning with an enormous technology list.

### **Weak**

> This project uses Python, PyTorch, Streamlit, NumPy, Pandas and various machine learning algorithms.

### **Better**

> This project develops an applied machine-learning pipeline for diabetes-risk screening, combining classification, probability calibration, threshold-based risk stratification and model explainability.

The second version explains the system before listing technologies.

---

# **8\. SHORT POSITIONING STATEMENT**

Every project should have a concise positioning statement.

Format:

> A \[type of system/research/application\] that \[main technical purpose\].

Examples of style:

> A specification-driven Cognitive AI platform designed around persistent cognitive state, knowledge construction and specialized AI agents.

> An applied machine-learning pipeline combining calibrated classification, threshold optimization and SHAP-based explanations for diabetes-risk screening.

> A multimodal computer-vision application integrating image caption generation and visual segmentation into a unified inference workflow.

The exact wording for each project belongs in `PROJECT_INVENTORY.md`.

---

# **9\. PROBLEM SECTION**

The problem section should explain the actual technical or practical problem.

Do not manufacture a dramatic problem merely to make the project sound impressive.

Explain:

* what limitation existed  
* what challenge was encountered  
* why the problem required the chosen approach  
* what constraints mattered

The problem should be grounded in the project source material.

---

# **10\. APPROACH SECTION**

Explain the high-level solution before diving into implementation details.

The reader should understand:

Problem  
   ↓  
Design decision  
   ↓  
Technical approach  
   ↓  
System/model

Explain important decisions and why they matter.

Avoid simply repeating:

> I used X because X is popular.

---

# **11\. ARCHITECTURE SECTION**

When architecture is meaningful, it should be one of the most important sections.

Architecture should explain:

* major components  
* data flow  
* system boundaries  
* important interfaces  
* processing stages  
* model boundaries  
* storage/retrieval  
* orchestration  
* deployment boundaries where relevant

Use diagrams where they improve understanding.

Do not create architecture diagrams that imply functionality not supported by evidence.

---

# **12\. IMPLEMENTATION VS ARCHITECTURE**

This distinction is mandatory for projects with extensive specifications or research documentation.

Use clear labels such as:

Implemented  
Experimental  
Specified  
Architected  
Research  
Planned  
Future

A project can contain an ambitious architecture while only some components are implemented.

Do not visually or verbally present all architecture as production implementation.

---

# **13\. TECHNICAL EXPLANATIONS**

Technical sections should explain the important mechanisms.

For example:

Instead of:

> The system uses RAG.

Explain:

* what information is retrieved  
* how retrieval is performed  
* why retrieval is required  
* how retrieved information enters the reasoning/generation process

Instead of:

> The model uses quantization.

Explain:

* what is quantized  
* how quantization is performed  
* what precision is used  
* what trade-off is being investigated

Technical details should be meaningful.

---

# **14\. TECHNOLOGY SECTION**

Technologies should be grouped logically.

Example:

Languages  
Python, TypeScript

Machine Learning  
PyTorch, scikit-learn

AI  
LLMs, RAG, Embeddings

Backend  
FastAPI, PostgreSQL

Deployment  
Docker, ONNX

Do not create a huge unstructured technology wall.

Only include technologies actually used or supported by project evidence.

---

# **15\. RESULTS**

Results should be one of the most evidence-sensitive sections.

Only show an achieved result when the source material supports it.

Examples of valid results:

* measured accuracy  
* measured latency  
* measured compression  
* benchmark score  
* validation result  
* test result  
* experimentally observed behavior  
* verified system capability

Do not turn:

Target

into:

Result  
---

# **16\. METRICS**

Metrics should provide context.

Whenever possible include:

* metric name  
* value  
* unit  
* dataset  
* evaluation period  
* experiment/version  
* evidence status  
* source

Avoid displaying a number without explaining what it represents.

### **Bad**

94.50%

### **Better**

Validation accuracy  
94.50%  
CIFAR-10  
T=2 ternary KD \+ QAT experiment  
Measured result  
---

# **17\. METRIC TYPES**

The portfolio may use metric categories such as:

verified-result  
measured-result  
derived-result  
target  
scope  
dataset-fact  
assumption  
benchmark

The evidence rules are defined separately in:

CONTENT\_EVIDENCE\_RULES.md  
---

# **18\. EXPERIMENTS**

For research and ML projects, experiments should explain:

* question/hypothesis  
* setup  
* variables  
* model/configuration  
* evaluation protocol  
* result  
* interpretation

Do not overstate causal conclusions.

If an experiment compares two configurations but does not establish why the difference occurred, state the comparison without inventing an explanation.

---

# **19\. ABLATION STUDIES**

Ablation sections should answer:

> What changed when a particular component or parameter was changed?

Include:

* baseline  
* changed component  
* configuration  
* result  
* interpretation

Do not claim that a component caused an improvement unless the experiment actually supports that conclusion.

---

# **20\. MODEL COMPARISONS**

When comparing models, make the comparison explicit.

Useful fields:

Model  
Role  
Configuration  
Dataset  
Metric  
Result  
Trade-off

Do not choose a "winner" unless the evaluation criteria justify that conclusion.

---

# **21\. DATASET SECTIONS**

When a dataset is relevant, explain:

* dataset name  
* scope  
* size  
* relevant split  
* preprocessing  
* augmentation  
* evaluation protocol  
* source

Do not imply ownership of public datasets.

Do not invent dataset statistics.

---

# **22\. DATA PIPELINES**

For ML/data projects, explain the transformation:

Raw Data  
   ↓  
Cleaning  
   ↓  
Preprocessing  
   ↓  
Feature/Input Representation  
   ↓  
Model  
   ↓  
Postprocessing  
   ↓  
Evaluation

Use the actual pipeline from the project.

---

# **23\. AI SYSTEM PROJECTS**

For AI-system projects, emphasize architecture and system behavior rather than simply saying "uses AI."

Where supported, explain:

* memory  
* retrieval  
* agents  
* orchestration  
* reasoning  
* knowledge graphs  
* protocols  
* state  
* observability  
* governance  
* model interaction

But distinguish implementation from architecture/specification.

---

# **24\. COMPUTER-VISION PROJECTS**

For computer-vision projects, explain the actual vision pipeline.

Potential structure:

Input Image  
   ↓  
Preprocessing  
   ↓  
Model  
   ↓  
Inference  
   ↓  
Postprocessing  
   ↓  
Visualization  
   ↓  
Evaluation

For multimodal systems, show how multiple outputs interact.

Do not treat separate models as a unified system unless the project actually connects them.

---

# **25\. FINANCE PROJECTS**

Financial projects should clearly identify:

* data source  
* period  
* methodology  
* formulas  
* assumptions  
* benchmarks  
* calculated metrics  
* limitations

Do not present analytical output as guaranteed financial advice.

Historical analysis must be described as historical analysis.

---

# **26\. QUANTITATIVE FINANCE PROJECTS**

Clearly distinguish:

* mathematical optimization  
* historical backtesting/analysis  
* assumptions  
* constraints  
* real-world investment decisions

An optimization result under a mathematical model is not automatically an investment recommendation.

---

# **27\. HEALTHCARE PROJECTS**

Healthcare-related projects require additional caution.

Use language such as:

* prototype  
* screening  
* risk prediction  
* decision support  
* research system  
* experimental system

Do not claim:

* diagnosis  
* clinical validation  
* medical-grade reliability  
* clinical deployment  
* replacement of clinicians

unless independent evidence explicitly supports such claims.

---

# **28\. LIMITATIONS**

Every serious project should have a limitations section when meaningful.

Limitations can include:

* dataset limitations  
* model limitations  
* computational constraints  
* evaluation limitations  
* incomplete implementation  
* deployment limitations  
* assumptions  
* reproducibility constraints  
* security considerations  
* hardware limitations  
* scope limitations

Do not hide meaningful limitations.

Present them professionally.

---

# **29\. FUTURE WORK**

Future work should describe actual planned or logical next steps.

Do not present future work as current functionality.

Use:

Current  
Future

as separate concepts.

Future work may include:

* additional experiments  
* new models  
* broader evaluation  
* improved deployment  
* scalability  
* hardware optimization  
* additional datasets  
* better UX

only when supported by the project material or clearly identified as future direction.

---

# **30\. CURRENT STATUS**

Projects should communicate their current state where relevant.

Possible statuses:

Completed  
In Development  
Research  
Prototype  
Planned  
Archived

Do not use "production" merely because a README calls a project "production-quality."

Verify what that phrase actually means in the project context.

---

# **31\. PROJECT LINKS**

Only display links that actually exist.

Possible links:

* GitHub  
* live demo  
* documentation  
* research  
* paper  
* deployment  
* related repository

Never invent a URL.

If a repository or demo is unavailable, do not create a placeholder public link that looks real.

---

# **32\. MEDIA**

Use media when it improves technical understanding.

Useful media:

* architecture diagrams  
* application screenshots  
* model diagrams  
* experiment plots  
* financial charts  
* system visualizations  
* output examples

Do not add decorative images merely to fill space.

Every important image should have appropriate alt text.

---

# **33\. WRITING STYLE**

The writing should be:

* precise  
* confident  
* technical  
* concise  
* professional  
* readable  
* evidence-aware

Avoid:

* excessive hype  
* marketing language  
* empty superlatives  
* unnecessary buzzwords  
* vague claims  
* repetitive explanations

---

# **34\. AVOID GENERIC AI MARKETING LANGUAGE**

Avoid phrases such as:

* revolutionary AI  
* cutting-edge AI  
* game-changing  
* next-generation  
* state-of-the-art

unless the claim is specifically justified by evidence.

Prefer concrete descriptions.

### **Weak**

> A revolutionary AI platform that changes everything.

### **Better**

> A specification-driven cognitive AI platform organized around persistent state, knowledge construction, agent orchestration and explicit system contracts.

---

# **35\. FIRST-PERSON VS THIRD-PERSON**

The portfolio may use first person selectively.

Use first person when discussing:

* engineering decisions  
* personal motivation  
* lessons learned  
* design choices

Use neutral technical language when explaining systems.

Avoid repeatedly beginning every section with:

> I built...

---

# **36\. DO NOT COPY README STRUCTURE BLINDLY**

A README is usually written for developers setting up a repository.

A portfolio case study is written for someone trying to understand the work.

Therefore, transform source material.

Do not automatically copy:

* installation instructions  
* environment setup  
* dependency installation  
* long command lists  
* repository directory trees

unless those details are specifically useful to the case study.

---

# **37\. CODE SNIPPETS**

Use code snippets only when they meaningfully demonstrate:

* an algorithm  
* an architectural pattern  
* a critical implementation detail  
* an unusual engineering decision

Do not fill pages with code.

The portfolio is not a replacement for the GitHub repository.

---

# **38\. TABLES**

Tables are useful for:

* model comparison  
* metrics  
* experiments  
* technology categories  
* financial ratios  
* portfolio allocations  
* benchmark comparisons

Avoid huge tables that are difficult to read on mobile.

---

# **39\. ARCHITECTURE DIAGRAM STYLE**

Architecture diagrams should be:

* readable  
* technically accurate  
* minimal  
* visually consistent with the portfolio  
* labeled  
* hierarchical

Do not create decorative diagrams that obscure the actual system.

---

# **40\. MOBILE EXPERIENCE**

Project content must remain understandable on mobile.

Avoid:

* extremely wide tables  
* tiny diagrams  
* long unbroken paragraphs  
* dense technical blocks  
* interaction that only works with hover

Important information should remain accessible without desktop-only behavior.

---

# **41\. PROJECT LENGTH**

Do not artificially make every project equally long.

A complex systems project may need substantially more explanation than a smaller application.

Depth should follow technical complexity.

The goal is:

> enough detail to demonstrate depth, without unnecessary repetition.

---

# **42\. PROJECT ORDER**

Project order should communicate the strongest technical story.

Do not automatically sort by:

* date  
* alphabet  
* repository name

unless intentionally chosen.

Featured projects should represent the strongest and most relevant work.

The ordering strategy can be controlled through the CMS.

---

# **43\. RELATED PROJECTS**

Where genuinely useful, projects may reference related work.

Examples:

AI systems → Cortex Lab  
Model optimization → CIFAR-10 Ternary ResNet  
Quantitative finance → Portfolio Optimization  
Financial analytics → Kaynes Dashboard  
Computer vision → Image Captioning & Segmentation

Only create relationships that are meaningful.

---

# **44\. PROJECT TAGS**

Tags should describe actual technical themes.

Examples:

AI Systems  
Machine Learning  
Deep Learning  
Generative AI  
Computer Vision  
RAG  
Agents  
Memory  
Knowledge Graphs  
Quantization  
Optimization  
Finance  
Quantitative Finance  
Multimodal AI

Do not create dozens of redundant tags.

---

# **45\. CONTENT HIERARCHY**

Project pages should prioritize information in this order:

## **Level 1 — Essential**

* what  
* why  
* problem  
* approach  
* outcome/current state

## **Level 2 — Technical**

* architecture  
* implementation  
* model  
* pipeline  
* evaluation

## **Level 3 — Deep technical detail**

* experiments  
* ablations  
* algorithms  
* formulas  
* optimization  
* internal mechanisms

## **Level 4 — Supporting**

* limitations  
* future work  
* references  
* artifacts

Not every visitor needs Level 3 or Level 4 immediately.

The UI should allow progressive exploration.

---

# **46\. DO NOT HIDE THE MAIN STORY UNDER TECHNICAL DETAIL**

The first screen of a project page should communicate the project clearly.

Do not begin with:

* 40 technologies  
* a giant architecture diagram  
* implementation internals  
* raw experiment tables

Start with the project's purpose and significance.

---

# **47\. EVIDENCE LABELS**

When useful, the UI may explicitly identify information as:

Verified  
Measured  
Derived  
Target  
Assumption  
Planned  
In Development

Labels should be subtle and consistent with the design system.

Do not make every sentence visually overloaded with badges.

---

# **48\. CLAIM DISCIPLINE**

Every important claim should pass this question:

> What source supports this statement?

If the answer is unclear:

* investigate  
* qualify the statement  
* mark it for verification  
* or remove it

Never fill the gap with an assumption.

---

# **49\. CONFLICTING SOURCES**

If two project artifacts contain different values or descriptions:

Do NOT silently choose one.

Instead:

1. identify the conflict  
2. determine whether version/date/source explains it  
3. preserve the distinction if necessary  
4. mark the affected content for verification  
5. publish only after the authoritative value is known

This is especially important for financial data and experimental results.

---

# **50\. PROJECT CONTENT GENERATION WORKFLOW**

When creating or updating a project page:

### **Step 1**

Read `PROJECT_INVENTORY.md`.

### **Step 2**

Inspect the relevant project source material.

### **Step 3**

Identify:

* implemented features  
* documented architecture  
* experiments  
* measured results  
* targets  
* assumptions  
* future work

### **Step 4**

Choose appropriate modules.

### **Step 5**

Write the project narrative.

### **Step 6**

Check every technical claim against evidence.

### **Step 7**

Check terminology against the project source.

### **Step 8**

Validate links, metrics, diagrams and media.

### **Step 9**

Ensure the public presentation follows `DESIGN_SYSTEM.md`.

---

# **51\. PROJECT-SPECIFIC MODULE SELECTION**

The project itself determines which modules are appropriate.

Examples:

### **Cognitive AI**

Use:

Overview  
Problem  
Vision  
Architecture  
Memory  
Knowledge Graph  
Agents  
Protocols  
Governance  
Observability  
Implementation Status  
Future Architecture

### **Applied ML**

Use:

Overview  
Problem  
Dataset  
Pipeline  
Model  
Calibration  
Explainability  
Evaluation  
Results  
Limitations

### **Model Compression Research**

Use:

Research Question  
Experimental Setup  
Teacher  
Baseline  
Student  
Knowledge Distillation  
Quantization  
QAT  
Ablation  
Results  
Compression  
Reproducibility  
Limitations

### **Computer Vision**

Use:

Overview  
Problem  
Dataset  
Captioning  
Segmentation  
Combined Pipeline  
Model Comparison  
Evaluation  
Visualization  
Deployment  
Future Work

### **Financial Analytics**

Use:

Overview  
Data Source  
Financial Statements  
Ratios  
Profitability  
Efficiency  
DuPont  
Forecast  
Benchmark  
Scorecard  
Methodology  
Limitations

### **Quantitative Finance**

Use:

Investment Question  
Investment Universe  
Dataset  
Return Model  
Risk Model  
Covariance  
Optimization  
Constraints  
Portfolio Allocation  
Comparison  
Risk Analysis  
Limitations  
---

# **52\. DO NOT ADD A SECTION JUST BECAUSE IT EXISTS IN THE CMS**

The CMS may support many modules.

That does not mean every project should use them.

A module should appear only when it contributes meaningful information.

The CMS provides capability.

The project content determines usage.

---

# **53\. FINAL CONTENT QUALITY STANDARD**

Before a project is considered complete, verify:

### **Accuracy**

* all facts are supported  
* no invented claims  
* no misleading wording

### **Structure**

* clear story  
* appropriate modules  
* logical ordering

### **Technical depth**

* architecture explained  
* important technical decisions explained  
* evaluation explained where applicable

### **Evidence**

* measured results distinguished from targets  
* assumptions labeled  
* planned work separated

### **UX**

* readable  
* scannable  
* mobile-friendly  
* visual hierarchy preserved

### **Professionalism**

* no unnecessary hype  
* no generic buzzwords  
* no exaggerated claims

---

# **54\. GOLDEN RULE**

The project page should make the reader think:

> "I understand what this project is, why it was built, how it works, what was actually achieved, and what the engineer learned from it."

Not:

> "I saw a list of technologies and a lot of impressive-sounding words."

Technical credibility is more important than hype.

---

# **55\. RELATIONSHIP WITH OTHER DOCUMENTS**

This document defines **how project content should be structured and written**.

For exact project facts, read:

docs/PROJECT\_INVENTORY.md

For evidence classification, read:

docs/CONTENT\_EVIDENCE\_RULES.md

For visual presentation, read:

docs/DESIGN\_SYSTEM.md

For CMS implementation, read:

docs/CMS\_SPECIFICATION.md

Do not duplicate project facts across these documents unless necessary.

