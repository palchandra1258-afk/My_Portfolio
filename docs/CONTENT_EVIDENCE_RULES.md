

\# CONTENT\_EVIDENCE\_RULES.md

\> This document defines the rules for factual accuracy, evidence, metrics, implementation status, claims, and uncertainty throughout the portfolio.  
\>  
\> The portfolio must always prefer technical credibility over impressive-sounding claims.  
\>  
\> Never invent, exaggerate, silently reconcile, or present unsupported information as fact.

\---

\# 1\. PURPOSE

Every public claim in the portfolio should be traceable to reliable project evidence.

This includes:

\- project descriptions  
\- features  
\- architecture  
\- implementation status  
\- metrics  
\- benchmarks  
\- experiments  
\- financial values  
\- model performance  
\- deployment claims  
\- technology usage  
\- links  
\- future work  
\- security claims  
\- testing claims

The portfolio is a presentation layer over real work.

It must never become a source of fabricated achievements.

\---

\# 2\. CORE PRINCIPLE

Use this rule:

\> If the source material does not support a claim, do not present the claim as fact.

When evidence is incomplete:

1\. investigate the source  
2\. qualify the statement  
3\. mark it for verification  
4\. or remove it

Do not fill gaps using assumptions.

\---

\# 3\. EVIDENCE HIERARCHY

Unless a project-specific source hierarchy overrides it, prefer evidence in this order:

\`\`\`text  
1\. Actual implementation / source code  
2\. Generated artifacts / outputs  
3\. Explicit experiment results  
4\. Tests / validation results  
5\. Official project documentation  
6\. README  
7\. Supporting notes  
8\. Resume / project summary  
9\. General inference

Higher-quality evidence should take precedence over lower-quality descriptions.

---

# **4\. CLAIM CATEGORIES**

Every important claim should conceptually belong to one of these categories:

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

These categories may be represented internally even if not all are shown publicly.

---

# **5\. VERIFIED**

Use `Verified` when the claim has direct supporting evidence.

Examples:

* a feature exists in the implementation  
* a test confirms behavior  
* an artifact confirms a model statistic  
* a documented result can be reproduced from project evidence

Do not use "verified" merely because a README says something exists.

---

# **6\. MEASURED**

Use `Measured` for experimentally observed numerical results.

Examples:

Validation accuracy  
Test accuracy  
F1 score  
ROC-AUC  
Brier score  
BLEU  
CIDEr  
IoU  
mAP  
Latency  
Compression ratio

A measured value should ideally include:

* metric  
* value  
* dataset  
* experiment/configuration  
* evaluation split  
* relevant version or date

---

# **7\. DERIVED**

A derived result is calculated from supported values.

Example:

If two measured portfolio values are known and the percentage improvement is calculated from them, the improvement is a derived metric.

Derived values must:

* use the correct formula  
* preserve units  
* be reproducible  
* not be presented as independently measured results

Where useful, label them as derived.

---

# **8\. DOCUMENTED**

A claim may be documented without being independently verified.

Example:

> The README describes the application as supporting batch processing.

This can be represented as documented functionality when the implementation has not been fully audited.

Do not upgrade a documented claim into a verified claim without evidence.

---

# **9\. IMPLEMENTED**

Use `Implemented` when the functionality exists in the actual project implementation.

Implementation evidence is stronger than a specification describing what should exist.

However:

> Implemented does not automatically mean production-ready.

Do not equate:

Implemented

with:

Production

or:

Production validated  
---

# **10\. EXPERIMENTAL**

Use `Experimental` when a feature, model, configuration, or behavior was tested as part of an experiment.

Examples:

* model ablations  
* alternate temperatures  
* experimental retrieval methods  
* alternative training methods  
* prototype agent behavior

Experimental results should retain their experimental context.

Do not generalize one experiment into a universal system property.

---

# **11\. SPECIFIED**

Use `Specified` when something is defined in:

* architecture documentation  
* technical specifications  
* protocols  
* design documents  
* ADRs  
* research plans

A specified feature is not necessarily implemented.

Therefore:

Specified ≠ Implemented

This distinction is especially important for:

* The Inevitable  
* Cortex Lab

---

# **12\. TARGET**

A target is an intended objective.

Examples:

ROC-AUC \> 0.75  
F1 \> 0.40  
Brier score \< 0.20

Targets must never be displayed as achieved results.

Correct:

> Target ROC-AUC: \>0.75

Incorrect:

> ROC-AUC: \>0.75

if no measured result exists.

---

# **13\. ASSUMPTION**

Assumptions are conditions used by the analysis or experiment.

Examples:

* risk-free rate  
* optimization constraints  
* historical period  
* compression representation assumptions  
* model configuration assumptions

Clearly distinguish assumptions from measured outcomes.

---

# **14\. PLANNED**

A planned feature is intended but not currently implemented.

Use language such as:

* planned  
* intended  
* proposed  
* next step

Do not use:

* supports  
* provides  
* includes  
* implemented

for a merely planned capability.

---

# **15\. FUTURE**

Future work describes possible extensions beyond the current implementation.

Examples:

* additional models  
* broader datasets  
* improved hardware support  
* additional evaluation  
* cloud deployment  
* new interfaces

Future work must remain visually and verbally separate from current functionality.

---

# **16\. NEEDS VERIFICATION**

Use `Needs Verification` when:

* two sources disagree  
* implementation is unclear  
* a metric lacks a trustworthy source  
* a feature is described but cannot currently be confirmed  
* an artifact is missing  
* the date/version is unclear

Do not guess.

A verification flag is preferable to publishing a false fact.

---

# **17\. IMPLEMENTED VS PLANNED**

Always distinguish:

Current Implementation

from:

Planned / Future

Example:

### **Current**

> The application supports image captioning and segmentation.

### **Future**

> Future work includes BLIP/CLIP integration and video support.

Never combine these into:

> The application supports image captioning, segmentation, BLIP, CLIP and video.

---

# **18\. ARCHITECTURE VS IMPLEMENTATION**

Large AI projects may contain architecture that extends beyond current implementation.

Use:

Implemented

for actual code.

Use:

Specified / Architected

for documented system design.

Use:

Future

for planned extensions.

Do not show all architecture components with identical visual treatment if that could imply they are all implemented.

---

# **19\. METRIC RULES**

Every public metric should answer:

1. What is being measured?  
2. What is the value?  
3. On what dataset or scope?  
4. Under what configuration?  
5. Is it measured, derived, target, or documented?  
6. What comparison is being made?

---

# **20\. DO NOT DISPLAY ORPHAN METRICS**

Avoid displaying a number without context.

Bad:

95.20%

Better:

Test Accuracy  
95.20%  
CIFAR-10  
ResNet-34 Teacher  
Measured  
---

# **21\. MODEL RESULTS**

For ML projects, results should identify:

* model  
* dataset  
* split  
* metric  
* configuration  
* result

If multiple experiments exist, do not collapse them into one number.

---

# **22\. CIFAR-10 TERNARY RESNET — EVIDENCE RULES**

The following values are documented measured results and may be presented as measured:

| Model | Validation | Test |
| ----- | ----- | ----- |
| ResNet-34 Teacher | 95.80% | 95.20% |
| FP32 ResNet-18 | 95.56% | 94.75% |
| T=2 Ternary KD \+ QAT | 94.50% | 93.86% |

Selected epoch:

191 / 200

Documented T=4 comparison:

Validation \= 94.42%  
Test \= 94.25%

Documented T=2 comparison:

Validation \= 94.50%  
Test \= 93.86%

Do not infer why T=2 and T=4 differ unless the experiment establishes the cause.

---

# **23\. CIFAR-10 COMPRESSION CLAIMS**

Documented deployment-oriented representation:

2.753 MiB

Approximate reduction:

15.49×

Ternary weights \+ scales:

15.89×

These describe representation/compression analysis.

Do NOT convert them into:

15.49× faster

or:

15.49× lower inference latency

unless actual hardware benchmarking supports that claim.

---

# **24\. CHECKPOINT VS DEPLOYMENT REPRESENTATION**

The approximately:

89.5 MB

`.pth` checkpoint must not be described as the compressed deployment representation.

It is a training checkpoint.

The portfolio should distinguish:

Training Checkpoint

from:

Deployment-Oriented Representation  
---

# **25\. DIABETES PREDICTION — EVIDENCE RULES**

Documented project targets/expected criteria include:

ROC-AUC \> 0.75  
F1 \> 0.40  
Brier score \< 0.20  
All-NO validation expected \<5% risk

These must remain targets/expected criteria unless actual evaluation artifacts prove the achieved result.

Documented threshold:

0.30

with documentation describing it as optimized for approximately:

70% recall

Do not call 0.30 universally optimal.

---

# **26\. HEALTHCARE CLAIMS**

Healthcare projects require stronger evidence standards.

Do not claim:

* clinical validation  
* diagnostic accuracy  
* medical-grade reliability  
* clinical deployment  
* replacement of professional medical judgment

unless supported by appropriate evidence.

Use terms such as:

Prototype  
Experimental  
Screening-oriented  
Decision-support  
Research

when appropriate.

---

# **27\. FINANCIAL ANALYSIS CLAIMS**

Financial dashboards and models should clearly distinguish:

Historical Analysis  
Calculated Metric  
Forecast  
Assumption  
Benchmark  
Recommendation

A calculated historical metric is not a prediction.

A model forecast is not guaranteed future performance.

Do not convert financial analysis into investment advice.

---

# **28\. KAYNES DASHBOARD — CONFLICT RULE**

Known project artifacts contain conflicting financial values.

Examples include differences between:

* `data_extractor.py`  
* visualization scripts  
* README values

These values must not be silently merged.

Before publishing a disputed financial metric:

1. identify the source  
2. identify the reporting period  
3. determine whether the values use different definitions  
4. determine which source is authoritative  
5. verify the final value

If unresolved:

Needs Verification

or omit the disputed value from the public page.

---

# **29\. PORTFOLIO OPTIMIZATION — EVIDENCE RULES**

Documented historical analysis:

Period:  
2022-11-22 to 2025-11-12

Trading days:  
736

Risk-free rate:  
6.50%

Annual statistics:

| Asset | Return | Standard Deviation |
| ----- | ----- | ----- |
| BEL.NS | 19.34% | 66.92% |
| CENTUM.NS | 33.35% | 81.46% |
| DIXON.NS | 16.19% | 69.78% |
| KAYNES.NS | 53.39% | 75.39% |
| TVSELECT.NS | 7.01% | 80.39% |

Equal-weight portfolio:

Return \= 25.86%  
Volatility \= 65.43%  
Sharpe \= 0.2958

Maximum-Sharpe portfolio:

Allocation \= 100% Kaynes  
Return \= 53.39%  
Volatility \= 75.37%  
Sharpe \= 0.6222

Documented Sharpe improvement:

approximately 110%  
---

# **30\. MAX-SHARPE INTERPRETATION**

The 100% Kaynes result must be described as:

> The unconstrained mathematical optimum under the specified historical data, objective function, and constraints.

It must NOT be described as:

* guaranteed best investment  
* future optimal portfolio  
* personal investment recommendation  
* guaranteed future return

The corner solution is an important analytical observation.

---

# **31\. COMPUTER VISION — EVALUATION RULES**

The Image Captioning & Segmentation project documents evaluation functionality including:

* BLEU  
* CIDEr  
* segmentation metrics

However, if the source material does not provide final measured values for:

* BLEU  
* CIDEr  
* mAP  
* IoU

do not invent them.

It is valid to state:

> The application includes evaluation support for these metrics.

It is not valid to state an unsupported numerical score.

---

# **32\. DATASET FACTS**

Dataset facts may be presented when directly supported.

Examples:

CIFAR-10:  
50,000 training images  
10,000 official test images  
Healthcare Assistant:  
132 symptoms  
41 diseases

Dataset facts are not model performance results.

Do not confuse:

Dataset Size

with:

Model Performance  
---

# **33\. TECHNOLOGY CLAIMS**

A technology may be listed when:

* it appears in actual implementation  
* it is explicitly documented  
* it is clearly part of the project

Do not list technologies merely because they would be appropriate.

For example:

> A project that could use PostgreSQL

does not mean:

> The project uses PostgreSQL.

---

# **34\. DEPLOYMENT CLAIMS**

Distinguish:

Local Application  
Containerized  
Deployment-Ready  
Deployed  
Production  
Production-Validated

These are different claims.

Do not call a Docker configuration a production deployment.

Do not call a Streamlit application production-scale without evidence.

---

# **35\. TESTING CLAIMS**

Only claim testing that actually exists.

Valid examples:

> The repository includes automated tests for data extraction and financial calculations.

Invalid:

> The system is fully tested.

unless test evidence supports that broad statement.

Do not invent:

* coverage percentages  
* number of tests  
* pass rates  
* CI success rates

---

# **36\. PERFORMANCE CLAIMS**

Performance claims require measurements.

Do not claim:

* faster  
* more efficient  
* scalable  
* low latency  
* real-time  
* production-grade

without appropriate evidence.

Words such as "real-time" should be used only when actual system behavior supports them.

---

# **37\. SECURITY CLAIMS**

Do not claim:

* secure  
* fully secure  
* production secure  
* privacy-preserving

without evidence.

Instead describe concrete mechanisms:

* authentication  
* authorization  
* secret management  
* input validation  
* encryption  
* access control  
* rate limiting

If a known security weakness exists, document it internally and fix it before presenting the system as secure.

---

# **38\. API KEYS AND SECRETS**

Never publish:

* API keys  
* tokens  
* passwords  
* private keys  
* database credentials  
* session secrets  
* environment secrets

If a project contains an exposed credential:

1. revoke it  
2. rotate it  
3. remove it  
4. move it to secure secret management  
5. verify repository history where appropriate

A portfolio page must never display active credentials.

---

# **39\. LINKS**

Only publish links that have been verified.

Never invent:

* GitHub URLs  
* demo URLs  
* deployment URLs  
* documentation URLs  
* paper URLs

If a link cannot be verified, omit it or mark it internally for verification.

---

# **40\. DATE AND VERSION CONTEXT**

When a result can change over time, preserve its context.

Examples:

FY2025  
Experiment T=2  
Model version X  
Evaluation run Y  
Historical period Z

Do not present time-dependent results as timeless facts.

---

# **41\. HISTORICAL RESULTS**

Historical results should retain their historical context.

For example:

> The portfolio optimization study produced a 0.6222 Sharpe ratio over the specified historical period.

is better than:

> The portfolio has a 0.6222 Sharpe ratio.

The second statement could incorrectly imply current performance.

---

# **42\. COMPARISON RULES**

When comparing two values:

* use the same metric  
* use the same evaluation protocol  
* use comparable datasets  
* preserve units  
* identify the baseline

Do not compare incompatible measurements.

---

# **43\. CAUSAL CLAIMS**

Correlation or comparison does not automatically prove causation.

Avoid:

> This feature caused the improvement.

unless the experiment actually establishes causality.

Prefer:

> The configuration achieved a higher validation score.

when that is what the evidence demonstrates.

---

# **44\. SUPERLATIVES**

Avoid unsupported claims such as:

* best  
* fastest  
* most accurate  
* state-of-the-art  
* production-grade  
* revolutionary  
* industry-leading

Use comparative language only when the comparison is defined and supported.

---

# **45\. UNKNOWN INFORMATION**

When information is missing, use:

Not documented

or:

Needs verification

Do not replace unknown information with plausible values.

---

# **46\. CONTENT REVIEW CHECKLIST**

Before publishing or updating a project page, verify:

### **Facts**

* Project identity is correct  
* Technologies are accurate  
* Features are supported  
* Implementation status is accurate  
* Links are verified

### **Metrics**

* Every metric has context  
* Measured results are separated from targets  
* Derived metrics are identified  
* No unsupported performance numbers exist

### **Architecture**

* Implemented components are distinguished from specified components  
* Planned components are separated  
* Diagram matches actual evidence

### **Safety**

* Healthcare claims are appropriately qualified  
* Financial analysis is not presented as guaranteed investment advice  
* Security claims are evidence-based  
* No secrets are exposed

### **Writing**

* No fabricated claims  
* No exaggerated claims  
* No unsupported superlatives  
* No misleading wording

---

# **47\. GOLDEN RULE**

When deciding between:

An impressive claim

and:

A precisely supported claim

always choose:

> **The precisely supported claim.**

The portfolio should demonstrate engineering credibility by showing what was actually built, measured, tested, learned, and still remains to be done.

---

# 

