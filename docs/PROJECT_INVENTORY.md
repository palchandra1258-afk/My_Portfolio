

\# PROJECT\_INVENTORY.md

\> This document is the authoritative portfolio inventory for the current project set.  
\>  
\> It defines the approved positioning, technical emphasis, content boundaries, and evidence-aware presentation of each project.  
\>  
\> Do not invent facts, metrics, implementation status, links, or capabilities that are not supported by the project source material.  
\>  
\> For general project-page writing rules, read \`PROJECT\_CONTENT\_GUIDELINES.md\`.  
\>  
\> For detailed evidence and claim-handling rules, read \`CONTENT\_EVIDENCE\_RULES.md\`.

\---

\# 0\. STATUS NOTICE — CURRENT PORTFOLIO IS 13 PROJECTS

> **Updated during Phase 7B-1. Read this before relying on the counts below.**
>
> The authoritative list of what the portfolio contains today is `content/projects.ts`, which holds **13 projects**.
>
> The "eight major projects" framing used throughout the rest of this document is **stale**. It describes an earlier, narrower selection and is retained below for historical context and because its per-project positioning, evidence rules, and content cautions remain valid for the projects that do exist.
>
> Two specific divergences:
>
> 1. **"Portfolio Optimization & MPT" (§9 below) does not exist in `content/projects.ts`.** It has been reviewed and deliberately **not** added. Its section is retained as historical reference material only — it does not describe a current portfolio project.
> 2. **Six projects in `content/projects.ts` are not described in this document at all:** `carbon-footprint-optimization`, `edgememory`, `resuwhisperai`, `healthcare-prediction-main`, `healthcare-prediction`, `atdl`.
>
> The current 13 slugs, in `content/projects.ts` order:
> `the-inevitable`, `atdl-assignment`, `cortex-lab`, `healthcare-ai-assistant`, `diabetes-prediction`, `dashboard-finance`, `carbon-footprint-optimization`, `image-captioning-segmentation`, `edgememory`, `resuwhisperai`, `healthcare-prediction-main`, `healthcare-prediction`, `atdl`.
>
> Where this document and `content/projects.ts` disagree, `content/projects.ts` wins (`CLAUDE.md` §4).

\---

\# 1\. PURPOSE

The portfolio originally scoped eight major projects. (See §0 — the current portfolio is 13; this section is retained as historical context.)

They represent different areas of technical work:

1\. Cognitive AI / AI Systems  
2\. Applied Machine Learning  
3\. Local AI / Memory / Agentic Systems  
4\. Multimodal Healthcare AI  
5\. Model Compression / Knowledge Distillation / Quantization  
6\. Financial Analytics  
7\. Quantitative Finance / Portfolio Optimization  
8\. Computer Vision / Multimodal Vision

The portfolio should not present these projects as eight variations of the same type of application.

Each project should communicate its own technical identity while maintaining a consistent portfolio experience.

\---

\# 2\. PROJECT INVENTORY

> **Stale — see §0.** This table lists the original eight. The current portfolio is the 13 projects in `content/projects.ts`; entry #7 below does not exist there.

| \# | Project | Primary Domain | Recommended Positioning |  
|---|---|---|---|  
| 1 | The Inevitable | Cognitive AI / AI Systems | Specification-driven Cognitive AI Platform |  
| 2 | Diabetes Prediction | Applied ML | Calibrated health-risk prediction and explainability pipeline |  
| 3 | Cortex Lab | Local AI / Memory / Agents | Local personal AI memory and reasoning system |  
| 4 | Healthcare AI Assistant | Multimodal Healthcare AI | Interactive healthcare decision-support prototype |  
| 5 | CIFAR-10 Ternary ResNet | ML Research / Compression | Knowledge distillation \+ ternary QAT research experiment |  
| 6 | Kaynes Technology Financial Dashboard | Financial Analytics | Interactive comparative financial analysis system |  
| 7 | Portfolio Optimization & MPT | Quantitative Finance | Markowitz portfolio optimization study |  
| 8 | Image Captioning & Segmentation | Computer Vision | Multimodal image understanding application |

\---

\# 3\. PROJECT 01 — THE INEVITABLE

\#\# Identity

\#\#\# Name

The Inevitable

\#\#\# Recommended title

\*\*The Inevitable — Specification-Driven Cognitive AI Platform\*\*

\#\#\# Primary domain

\- Cognitive AI  
\- AI Systems Engineering  
\- Agentic Systems  
\- Specification-Driven Architecture  
\- Knowledge Systems  
\- Observability  
\- Event-Driven Systems

\#\#\# Recommended positioning

\> A specification-driven Cognitive AI platform designed around explicit system contracts, persistent cognitive state, knowledge construction, specialized agents, and observable runtime behavior.

Do not reduce this project to:

\- a chatbot  
\- a simple RAG application  
\- an LLM wrapper  
\- an agent demo

The project should be presented as a broader systems architecture.

\---

\#\# Core Story

The central story is:

\`\`\`text  
Research / Vision  
      ↓  
Specification  
      ↓  
Architecture Decisions  
      ↓  
Contracts / Protocols  
      ↓  
Implementation  
      ↓  
Tests  
      ↓  
Observability  
      ↓  
Validation  
      ↓  
Iteration

The specification-driven approach is an important differentiator.

---

## **Major Technical Areas**

Relevant technologies and concepts include:

* TypeScript  
* pnpm  
* Turborepo  
* JSON Schema  
* event-driven architecture  
* knowledge graphs  
* agent orchestration  
* OpenTelemetry  
* PostgreSQL  
* Google Gemini  
* PDF processing  
* multiple applications/packages/services  
* protocols  
* runtime semantics  
* governance  
* traceability  
* testing  
* observability

Only display a technology if the relevant implementation/source material supports its use.

---

## **Architecture Topics**

The project page may discuss:

* system/kernel architecture  
* protocols  
* cognitive units  
* memory  
* world state  
* knowledge  
* orchestration  
* agents  
* cognitive surface  
* event-driven communication  
* contracts  
* governance  
* observability

The exact architecture shown on the public page must be based on the project's actual architecture documentation.

Do not invent missing components.

---

## **Important Distinction**

This project has a large architecture and extensive specification material.

Therefore:

Implemented  
Specified  
Architected  
Experimental  
Planned

must not be treated as interchangeable.

If a component is described in specifications but is not implemented, it must not be presented as an implemented feature.

---

## **Recommended Page Structure**

Header  
↓  
Introduction  
↓  
Why Conventional AI Applications Are Insufficient  
↓  
Problem  
↓  
Vision  
↓  
Specification-First / Contract-Driven Approach  
↓  
System Architecture  
↓  
Core Systems  
↓  
Agent Architecture  
↓  
Memory  
↓  
Knowledge Graph  
↓  
Protocols  
↓  
Governance  
↓  
Observability  
↓  
Implementation Status  
↓  
Testing / Validation  
↓  
Current Capabilities  
↓  
Future Architecture  
↓  
Technologies  
↓  
Links

The final ordering can be adjusted according to actual available evidence.

---

## **Key Differentiator**

The project should communicate that architecture and system behavior are treated as explicit specifications/contracts rather than being assembled solely around a model API.

The portfolio should emphasize:

> specification → contract → implementation → validation

rather than:

> LLM → prompt → response

---

## **Content Cautions**

Do not claim:

* full implementation of every documented architecture component  
* production-scale deployment unless supported  
* autonomous intelligence beyond demonstrated behavior  
* AGI  
* human-level reasoning  
* consciousness  
* general intelligence

Do not use "Cognitive OS" as though it automatically means an operating system in the conventional OS sense.

If the term is used, explain what it means within the project's architecture.

---

# **4\. PROJECT 02 — DIABETES PREDICTION**

## **Identity**

### **Recommended title**

**Diabetes Prediction — Calibrated ML Risk Prediction & Explainability**

### **Primary domain**

* Applied Machine Learning  
* Classification  
* Probability Calibration  
* Explainable AI  
* Healthcare ML

### **Recommended positioning**

> An applied machine-learning pipeline combining binary classification, probability calibration, threshold-based risk stratification, and SHAP-based explanations for diabetes-risk screening.

---

## **Core Story**

The project should communicate the complete pipeline:

Health Indicators  
      ↓  
Cleaning / Preprocessing  
      ↓  
Binary Classification  
      ↓  
XGBoost  
      ↓  
Probability Calibration  
      ↓  
Threshold Selection  
      ↓  
Risk Stratification  
      ↓  
Prediction \+ SHAP Explanation  
      ↓  
Streamlit Application  
      ↓  
Risk Report / Recommendations  
---

## **Dataset / Inputs**

The project uses:

* 21 health indicators  
* binary classification  
* Healthy vs At-Risk

Exact dataset statistics should be taken from the project source material.

---

## **Model**

Primary model:

* XGBoost

Class imbalance handling:

* `scale_pos_weight`

Important:

> SMOTE is explicitly not used.

Do not claim SMOTE-based balancing.

---

## **Data Splitting**

The project uses:

* stratified train/validation/test splitting

The exact split proportions should be taken from the source material when displayed.

---

## **Preprocessing**

Scaling is applied to:

* BMI  
* MentHlth  
* PhysHlth  
* Age

Feature order is important because model artifacts depend on consistent input ordering.

---

## **Calibration**

The pipeline uses:

* `CalibratedClassifierCV`  
* isotonic calibration

Calibration should be presented as a meaningful modeling decision rather than as an incidental implementation detail.

The project is not simply predicting a class.

It is producing a risk probability that is subsequently interpreted.

---

## **Threshold**

A threshold of:

0.30

is documented as being optimized for approximately:

70% recall

This must be described according to the actual experiment/source evidence.

Do not automatically describe 0.30 as universally optimal.

---

## **Risk Stratification**

The application uses risk categories:

Low  
Moderate  
High  
Very High

Exact category boundaries should come from the project implementation/source material.

---

## **Explainability**

The project uses:

* SHAP  
* top contributing features  
* direction of contribution

Explainability should be presented as a way to understand model output rather than proof that a feature causes disease.

---

## **Application**

The Streamlit interface includes:

* 21 inputs  
* risk gauge  
* recommendations  
* SHAP explanation  
* report download

---

## **Validation / Expected Metrics**

Project documentation references targets/expected criteria including:

* ROC-AUC \> 0.75  
* F1 \> 0.40  
* F1 around 0.49 in documented context  
* Brier score \< 0.20  
* all-NO validation expected to produce \<5% risk

These values must NOT automatically be presented as achieved results.

Use the evidence rules.

If the actual evaluation artifact confirms a result, show it as measured.

Otherwise label it as:

* target  
* expected criterion  
* documented expectation

---

## **Edge-Case Validation**

An important validation behavior is:

> An all-NO input profile is expected to produce a risk below 5%.

Only describe this as a verified result if the relevant validation artifact supports it.

---

## **Safety**

This is a screening/risk-prediction project.

It is NOT a clinically validated diagnostic system.

Do not claim:

* medical diagnosis  
* clinical deployment  
* clinical validation  
* medical-grade reliability

unless independently supported.

Recommended wording:

> This project is an experimental screening-oriented machine-learning system and should not be interpreted as a medical diagnosis.

---

## **Recommended Page Structure**

Header  
↓  
Introduction  
↓  
Problem  
↓  
Dataset  
↓  
ML Pipeline  
↓  
Model & Class Imbalance  
↓  
Probability Calibration  
↓  
Threshold Selection  
↓  
Risk Stratification  
↓  
Explainability with SHAP  
↓  
Validation & Results  
↓  
Streamlit Application  
↓  
Limitations & Safety  
↓  
Future Work  
↓  
Technologies  
↓  
Links  
---

# **5\. PROJECT 03 — CORTEX LAB**

## **Identity**

### **Recommended title**

**Cortex Lab — Local AI Memory & Reasoning System**

### **Primary domain**

* Local AI  
* AI Memory  
* Retrieval  
* Agents  
* Knowledge Graphs  
* Reasoning  
* RAG  
* Model Training  
* Evaluation

### **Recommended positioning**

> A local personal AI memory and reasoning system combining persistent memory, hybrid retrieval, knowledge graphs, specialized reasoning agents, and local model inference.

---

## **Core Story**

Cortex Lab should be presented as a personal AI / second-brain architecture rather than a generic chatbot.

Core flow:

User Interaction  
      ↓  
Memory Ingestion  
      ↓  
Structured Memory  
      ↓  
┌───────────────┬──────────────┬───────────────┐  
│ Vector Store  │ Metadata     │ Knowledge     │  
│               │              │ Graph         │  
└───────────────┴──────────────┴───────────────┘  
      ↓  
Hybrid Retrieval  
      ↓  
Specialized Agents  
      ↓  
Local LLM  
      ↓  
Reasoned Response  
      ↓  
Memory Evolution  
---

## **Technology / Architecture**

Relevant components include:

* Python  
* FastAPI  
* Next.js  
* FAISS  
* DuckDB  
* NetworkX  
* local LLM inference  
* embeddings  
* vector search  
* sparse/BM25 retrieval  
* graph retrieval  
* temporal retrieval  
* proposition retrieval  
* RRF  
* cross-encoder reranking  
* query analysis  
* query transformation  
* agent orchestration  
* RAG  
* evaluation

Only include components supported by the relevant implementation/source.

---

## **Memory Architecture**

Relevant implementation areas include:

* memory ingestion  
* memory classification  
* entity extraction  
* emotion detection  
* contextual memory  
* embeddings  
* persistent metadata  
* knowledge graph updates

The page should explain why multiple representations are useful.

---

## **Hybrid Retrieval**

Relevant retrieval strategies include:

* dense retrieval  
* sparse/BM25 retrieval  
* graph retrieval  
* temporal retrieval  
* proposition retrieval  
* Reciprocal Rank Fusion  
* cross-encoder reranking  
* query analysis  
* query transformation

Do not imply that every strategy is always active simultaneously unless the implementation supports that behavior.

---

## **Agent Architecture**

Relevant specialized agents include:

* Timeline  
* Causal  
* Reflection  
* Planning  
* Arbitration  
* Orchestrator

These should be described according to their actual implementation.

Do not assign capabilities that are only conceptual.

---

## **Reasoning**

Relevant concepts include:

* adaptive routing  
* CRAG  
* Self-RAG critique  
* FLARE-style active retrieval  
* multi-step reasoning

These may be represented as implemented, experimental, or research concepts depending on source evidence.

---

## **Training / Fine-Tuning**

Research/training areas include:

* DPO  
* ORPO  
* RAFT  
* RFT  
* SPIN  
* user-style training

Do not imply that every listed training method is part of the production system.

Separate:

Implemented  
Experimented  
Research  
Future  
---

## **Recommended Page Structure**

Header  
↓  
Introduction  
↓  
Why Personal AI Needs Persistent Memory  
↓  
Problem  
↓  
System Approach  
↓  
Architecture  
↓  
Memory Architecture  
↓  
Hybrid Retrieval  
↓  
Agent Architecture  
↓  
Self-Reflective Generation  
↓  
Local AI / Hardware Optimization  
↓  
Training & Fine-Tuning  
↓  
Evaluation  
↓  
Implementation Status  
↓  
Limitations  
↓  
Future Work  
↓  
Technologies  
↓  
Links  
---

# **6\. PROJECT 04 — HEALTHCARE AI ASSISTANT**

## **Identity**

### **Recommended title**

**Healthcare AI Assistant — Multimodal Symptom Analysis & Decision Support**

### **Primary domain**

* Healthcare AI  
* Multimodal Interaction  
* Disease Prediction  
* Conversational AI  
* Voice Interfaces  
* Interactive Web Applications

### **Recommended positioning**

> An interactive healthcare decision-support prototype combining structured symptom analysis, disease prediction, severity assessment, conversational AI, voice interaction, and personalized recommendations.

---

## **Technology**

The project is implemented as:

* HTML  
* CSS  
* JavaScript

Relevant capabilities include:

* symptom prediction  
* 132-symptom library  
* 41-disease scope  
* symptom severity weighting  
* interactive body map  
* Web Speech API  
* top disease predictions  
* severity assessment  
* Gemini contextual AI  
* personalized recommendations  
* health profile  
* local health-record persistence  
* data export  
* visualizations

---

## **Core Pipeline**

User  
 ↓  
Symptom Input  
 ↓  
Severity / Body Location  
 ↓  
Structured Symptom Analysis  
 ↓  
Disease Prediction  
 ↓  
Severity Assessment  
 ↓  
Gemini Contextual AI  
 ↓  
Recommendations / Conversation  
---

## **Multimodal Input**

The project should highlight:

* interactive symptom selection  
* body-map interaction  
* voice input  
* structured symptom data

Do not describe the system as multimodal in a way that implies medical imaging or other modalities unless those are actually implemented.

---

## **Data / Profile**

The application supports:

* health profile  
* local persistence  
* health-record data  
* export  
* visualizations

The portfolio must describe privacy behavior accurately.

---

## **Security Warning**

The source material indicates that the Gemini API credential is embedded directly in `main.js`.

This is a serious security concern.

The portfolio must NOT expose the credential.

If a real API key was ever committed or exposed:

1. revoke it  
2. rotate it  
3. remove it from source  
4. use a backend/serverless proxy  
5. ensure secrets are stored securely

Do not publish active credentials.

---

## **Safety**

This project must be presented as:

* prototype  
* experimental decision-support system  
* educational/research application

Do not claim:

* diagnosis  
* clinical validation  
* clinical deployment  
* medical-grade accuracy

Recommended disclaimer:

> This prototype is intended for research and educational purposes and is not a substitute for professional medical advice or diagnosis.

---

## **Recommended Page Structure**

Header  
↓  
Overview  
↓  
Problem  
↓  
Multimodal Symptom Input  
↓  
Disease Prediction Pipeline  
↓  
Severity Assessment  
↓  
Gemini AI Layer  
↓  
Personalized Recommendations  
↓  
Health Profile & Local Data  
↓  
UX / Accessibility  
↓  
Security Considerations  
↓  
Safety & Limitations  
↓  
Future Work  
↓  
Technologies  
↓  
Links  
---

# **7\. PROJECT 05 — CIFAR-10 TERNARY RESNET**

## **Identity**

### **Recommended title**

**CIFAR-10 Ternary ResNet — Knowledge Distillation & Quantization-Aware Training**

### **Primary domain**

* Deep Learning  
* Knowledge Distillation  
* Quantization  
* Quantization-Aware Training  
* Model Compression  
* Computer Vision  
* ML Research

### **Recommended positioning**

> A model-compression experiment studying whether a ternary ResNet-18 student can retain high image-classification accuracy through knowledge distillation and quantization-aware training.

---

## **Models**

The experiment includes:

* FP32 ResNet-34 teacher  
* FP32 ResNet-18 baseline  
* ternary ResNet-18 student

---

## **Dataset**

CIFAR-10:

* 50,000 training images  
* 10,000 official test images

Documented training split:

45,000 training  
5,000 validation

with:

seed \= 42

Final test evaluation follows the project's documented protocol.

---

## **Ternary Quantization**

The ternarization method uses:

threshold \= 0.7 × mean(abs(weight))

Weights are mapped to:

{-1, 0, \+1}

Relevant implementation concepts:

* per-output-channel scale  
* straight-through estimator  
* FP32 latent parameters  
* ternary effective weights  
* verification artifact

Do not simplify this into generic "weights are compressed to 2 bits" without explaining the actual representation assumptions.

---

## **Knowledge Distillation**

Main experiment:

Temperature T \= 4  
alpha \= 0.9

A controlled:

T \= 2  
alpha \= 0.9

run was also performed.

The final Task 4 comparison uses the validation-selected T=2 model.

---

## **Quantization-Aware Training**

The student uses:

* ternary weights  
* int8 fake activations  
* QAT  
* 18 relevant modules

Explain fake quantization accurately.

Do not claim deployment-time int8 hardware acceleration simply because QAT was used.

---

## **Final Measured Results**

Documented final comparison:

| Model | Validation Accuracy | Test Accuracy |
| ----- | ----- | ----- |
| ResNet-34 Teacher | 95.80% | 95.20% |
| FP32 ResNet-18 | 95.56% | 94.75% |
| T=2 Ternary KD \+ QAT | 94.50% | 93.86% |

Selected epoch:

191 / 200

These are measured results and may be presented as such.

---

## **Temperature Comparison**

Documented results:

T=4:  
Validation \= 94.42%  
Test \= 94.25%

T=2:  
Validation \= 94.50%  
Test \= 93.86%

Do not infer a causal reason for the difference unless the experiment establishes one.

---

## **Model Statistics**

For the T=2 model:

Ternary Conv/Linear layers: 21  
Effective ternary weights: 11,164,352  
Zero weights: 50.1702%  
Non-zero weights: 49.8298%  
FP32 scales: 4,810  
FP32 BatchNorm layers: 20

These values should be treated as experiment/model statistics.

---

## **Accuracy Gaps**

Relative to the teacher:

1.34 percentage points

Relative to the FP32 ResNet-18 baseline:

0.89 percentage points

Use these as documented comparisons.

---

## **Compression Analysis**

Documented deployment-oriented representation:

2.753 MiB

Approximate reduction relative to FP32 ResNet-18:

15.49×

Ternary weights \+ scales:

15.89×

Important:

The `.pth` file of approximately 89.5 MB is a training checkpoint.

It is NOT the same thing as the deployment-oriented compressed representation.

---

## **Important Limitation**

Do not claim:

* guaranteed 15.49× runtime speedup  
* guaranteed memory savings on arbitrary hardware  
* production deployment acceleration

Compression of representation does not automatically imply hardware speedup.

Actual speedup requires appropriate kernels/hardware/software support.

---

## **Reproducibility**

Important documented details include:

* seed 42  
* CUDA  
* optimizer configuration  
* training settings  
* model architecture  
* evaluation protocol

The project currently does not have a lockfile.

Do not claim perfect environment reproducibility.

---

## **Recommended Page Structure**

Header  
↓  
Overview  
↓  
Research Question  
↓  
Experimental Setup  
↓  
Teacher / Student Architecture  
↓  
Knowledge Distillation  
↓  
Ternary Quantization  
↓  
Quantization-Aware Training  
↓  
Ablation / Temperature Comparison  
↓  
Final Results  
↓  
Compression Analysis  
↓  
Model Statistics  
↓  
Evaluation Protocol  
↓  
Reproducibility  
↓  
Limitations  
↓  
Future Work  
↓  
Technologies  
↓  
Artifacts / Links  
---

# **8\. PROJECT 06 — KAYNES TECHNOLOGY FINANCIAL DASHBOARD**

## **Identity**

### **Recommended title**

**Kaynes Technology Financial Dashboard — Comparative Financial Analytics**

### **Primary domain**

* Financial Analytics  
* Financial Modeling  
* Data Visualization  
* Business Analysis  
* Streamlit  
* Comparative Analysis

### **Recommended positioning**

> An interactive financial-analysis dashboard comparing Kaynes Technology and Bharat Electronics across liquidity, solvency, profitability, efficiency, DuPont analysis, forecasting, and comparative scoring.

---

## **Companies**

The project compares:

* Kaynes Technology Ltd  
* Bharat Electronics Ltd

Do not present the dashboard as an investment recommendation.

---

## **Application**

The Streamlit dashboard contains seven major tabs:

Executive Summary  
Liquidity  
Solvency  
Profitability  
Efficiency  
DuPont  
Comparative Scorecard  
---

## **Interactivity**

Documented functionality includes:

* year selection  
* 2022–2025 analysis  
* forecasts  
* benchmarks  
* AI-generated narratives  
* 20+ Plotly visualizations  
* responsive dashboard design

Only claim the exact range/features supported by the implementation.

---

## **Technology**

Relevant stack:

* Python  
* Streamlit  
* Plotly  
* Pandas  
* NumPy  
* SciPy

Relevant project files include:

financial\_dashboard.py  
data\_extractor.py  
financial\_calculator.py  
chart\_components.py  
analyze\_excel.py  
detailed\_analysis.py  
visualize\_analysis.py  
test\_dashboard\_data.py  
verify\_deployment.py

Do not expose internal filenames unless useful to the portfolio narrative.

---

## **Analysis Framework**

The project includes:

* liquidity analysis  
* solvency analysis  
* profitability analysis  
* efficiency analysis  
* DuPont analysis  
* health scoring  
* CAGR  
* YoY analysis  
* benchmarks  
* forecasting  
* comparative scorecard

---

## **Health Score**

The financial health score uses a 0–100 framework.

Documented weighting:

Liquidity       25%  
Solvency        25%  
Profitability   25%  
Efficiency      25%

The portfolio should explain that this is a project-defined analytical scoring methodology.

It is not an industry-standard universal financial-health score.

---

## **Forecasting**

The project uses simple linear regression for forecasting.

Do not describe this as sophisticated financial forecasting or as guaranteed prediction.

---

## **Data Source**

The source workbook is:

Copy of Final\_Financial\_Data\_Kaynes\_Technology(1).xlsx

The documented source is:

Moneycontrol.com

The workbook contains a financial data table.

The exact source period and values should be stated only where supported by the relevant artifact.

---

## **Important Data Conflict**

The project artifacts contain conflicting financial values.

For example:

* `data_extractor.py` contains a Net Profit value of 209.91  
* another visualization script references FY2025 EPS of 32.75  
* the README reports FY2025 Net Profit of 177.96 Cr and EPS of 57.37

These values must NOT be silently reconciled.

Before publishing disputed values:

1. identify the authoritative source  
2. verify the relevant period  
3. verify whether the values represent different definitions/versions  
4. update the portfolio only after resolution

If unresolved, omit the disputed metric from public-facing content.

---

## **Recommended Page Structure**

Header  
↓  
Overview  
↓  
Problem  
↓  
Financial Data Pipeline  
↓  
Financial Analysis Framework  
↓  
Executive Summary  
↓  
Liquidity  
↓  
Solvency  
↓  
Profitability  
↓  
Efficiency  
↓  
DuPont Analysis  
↓  
Health Scoring  
↓  
Forecasting & Benchmarks  
↓  
Comparative Scorecard  
↓  
Visualization  
↓  
Testing / Validation  
↓  
Deployment  
↓  
Data Sources & Methodology  
↓  
Limitations  
↓  
Technologies  
↓  
Links  
---

# **9\. PROJECT 07 — PORTFOLIO OPTIMIZATION & MPT**

> **HISTORICAL REFERENCE ONLY — NOT A CURRENT PORTFOLIO PROJECT.**
> No corresponding entry exists in `content/projects.ts`, and it has been deliberately not added (decision recorded in Phase 7B-1). The positioning, figures, and evidence rules below remain on record should this project ever be authored, but nothing in this section describes shipped portfolio content today. Do not migrate it to the database.

## **Identity**

### **Recommended title**

**Portfolio Optimization & Modern Portfolio Theory**

### **Primary domain**

* Quantitative Finance  
* Portfolio Optimization  
* Modern Portfolio Theory  
* Risk Analysis  
* Financial Modeling

### **Recommended positioning**

> A quantitative-finance study applying Harry Markowitz's Modern Portfolio Theory to compare equal-weight and maximum-Sharpe portfolio allocations across selected Indian EMS and defense-electronics companies.

---

## **Investment Universe**

Assets:

BEL.NS  
CENTUM.NS  
DIXON.NS  
KAYNES.NS  
TVSELECT.NS  
---

## **Historical Period**

Documented period:

November 22, 2022  
to  
November 12, 2025

Trading days:

736

Risk-free rate:

6.50%

Do not extend the historical period without new data.

---

## **Mathematical Framework**

The project uses:

* daily returns  
* annualized returns  
* variance  
* portfolio return  
* portfolio variance  
* portfolio volatility  
* Sharpe ratio  
* covariance matrix  
* Excel MMULT  
* SQRT  
* optimization

---

## **Annual Statistics**

Documented annual statistics:

| Asset | Annual Return | Annual Std. Dev. |
| ----- | ----- | ----- |
| BEL | 19.34% | 66.92% |
| Centum | 33.35% | 81.46% |
| Dixon | 16.19% | 69.78% |
| Kaynes | 53.39% | 75.39% |
| TVSELECT | 7.01% | 80.39% |

These values describe the historical analysis under the project's methodology.

They are not forecasts.

---

## **Covariance**

The project contains a:

5 × 5 covariance matrix

with all pairwise covariance values positive.

Do not interpret positive covariance alone as proof that diversification is ineffective.

---

## **Equal-Weight Portfolio**

Documented result:

Expected annual return \= 25.86%  
Volatility \= 65.43%  
Sharpe \= 0.2958

Portfolio weights:

20% each  
---

## **Maximum-Sharpe Portfolio**

Documented mathematical optimum:

100% Kaynes

with:

Expected annual return \= 53.39%  
Volatility \= 75.37%  
Sharpe \= 0.6222

Documented Sharpe improvement:

approximately 110%  
---

## **Critical Interpretation**

The 100% Kaynes allocation is an:

> unconstrained mathematical optimum under the specified historical assumptions and constraints.

It must NOT be presented as:

* a personal investment recommendation  
* guaranteed optimal investment  
* future-return prediction  
* proof that Kaynes will outperform

This is one of the most important portfolio-content cautions for this project.

---

## **Corner Solution**

The corner solution should be used as a learning point.

It demonstrates how unconstrained optimization can produce extreme concentration when one asset dominates the historical risk-return objective.

This naturally motivates real-world constraints such as:

* maximum position weights  
* diversification constraints  
* downside-risk measures  
* transaction costs  
* robustness/sensitivity analysis

Only present these as future extensions if they are not currently implemented.

---

## **Risk Extensions**

Possible future analysis includes:

* Sortino ratio  
* VaR  
* CVaR  
* concentration constraints  
* sensitivity analysis  
* scenario analysis

Do not claim these are currently implemented unless source evidence confirms it.

---

## **Recommended Page Structure**

Header  
↓  
Overview  
↓  
Investment Question  
↓  
Investment Universe  
↓  
Historical Data  
↓  
Return & Risk Modeling  
↓  
Covariance Matrix  
↓  
Modern Portfolio Theory  
↓  
Equal-Weight Benchmark  
↓  
Maximum-Sharpe Optimization  
↓  
Portfolio Comparison  
↓  
Corner Solution  
↓  
Risk & Diversification  
↓  
Real-World Constraints  
↓  
Limitations  
↓  
Future Extensions  
↓  
Tools / Methodology  
↓  
Links  
---

# **10\. PROJECT 08 — IMAGE CAPTIONING & SEGMENTATION**

## **Identity**

### **Recommended title**

**Image Captioning & Segmentation — Multimodal Image Understanding**

### **Primary domain**

* Computer Vision  
* Multimodal AI  
* Image Captioning  
* Image Segmentation  
* Deep Learning  
* Interactive AI Applications

### **Recommended positioning**

> A multimodal computer-vision application integrating image caption generation and object/semantic segmentation into a unified inference workflow.

---

## **Project Nature**

The project is documented as a production-quality Streamlit application combining:

* image captioning  
* image segmentation  
* multiple deep-learning models  
* interactive visualization  
* combined inference  
* batch processing  
* testing  
* Docker deployment  
* CI/CD

Do not use "production deployment" unless actual deployment evidence supports it.

---

## **Captioning Models**

Documented models include:

* ResNet50 \+ LSTM  
* InceptionV3 \+ Transformer

---

## **Segmentation Models**

Documented models include:

* U-Net  
* DeepLabV3+  
* Mask R-CNN

---

## **Dataset**

The project uses:

COCO 2014

Exact dataset statistics should only be included when supported by the source material.

---

## **Captioning Controls**

The application supports:

* model selection  
* beam width  
* maximum caption length  
* confidence information  
* token probabilities  
* BLEU/CIDEr evaluation interfaces

Documented controls include:

Beam width: 1–5  
Maximum length: 10–30

Do not claim actual BLEU/CIDEr values unless measured results exist.

---

## **Segmentation Controls**

The application supports:

* model selection  
* confidence threshold  
* transparency  
* boxes  
* labels  
* legend  
* detection details  
* raw masks

---

## **Combined Pipeline**

The project supports:

Image  
 ↓  
Captioning  
 ↓  
Segmentation  
 ↓  
Object Linking  
 ↓  
Synchronized Results  
 ↓  
Export Bundle

One distinctive capability is highlighting objects mentioned in captions.

Only describe object linking at the level actually supported by the implementation.

---

## **Batch Processing**

The application supports batch workflows.

Exact limits should come from implementation rather than being invented.

---

## **Developer Mode**

A developer/debug mode is documented.

It can be mentioned as an engineering feature when useful.

Do not expose internal debugging information in the public interface unless intentionally designed for users.

---

## **Testing**

Documented testing includes:

* application tests  
* model/inference tests  
* CI  
* validation

Use the project's actual test evidence when reporting coverage or pass rates.

Do not invent test percentages.

---

## **Deployment**

The project includes:

* Docker CPU support  
* Docker GPU support  
* deployment-related configuration

This should be described as containerized/deployment-ready infrastructure only to the extent supported by the repository.

---

## **Architecture**

Documented high-level architecture:

Streamlit UI  
      ↓  
Captioning / Segmentation Inference Pipelines  
      ↓  
Model Wrappers  
      ↓  
Utility Modules

Captioning pipeline includes concepts such as:

* preprocessing  
* feature extraction  
* beam search  
* metrics

Segmentation pipeline includes:

* preprocessing  
* inference  
* postprocessing  
* metrics

---

## **Evaluation**

The README exposes evaluation functionality but does not provide final measured:

* BLEU  
* CIDEr  
* mAP  
* IoU

values.

Therefore:

> Do not invent performance numbers.

The portfolio can describe the evaluation framework without claiming unsupported results.

---

## **Future Enhancements**

Documented future directions include:

* BLIP  
* CLIP  
* video  
* webcam  
* multilingual support  
* advanced evaluation dashboard  
* fine-tuning interface  
* cloud deployment guides

These must remain clearly marked as future work.

---

## **Recommended Page Structure**

Header  
↓  
Overview  
↓  
Problem  
↓  
System Approach  
↓  
Multimodal Architecture  
↓  
Image Captioning  
↓  
Image Segmentation  
↓  
Unified Caption \+ Segmentation Pipeline  
↓  
Model Comparison  
↓  
Visualization & Interactive Interface  
↓  
Batch Processing  
↓  
Evaluation & Testing  
↓  
Deployment  
↓  
Limitations  
↓  
Future Work  
↓  
Technologies  
↓  
GitHub / Demo  
---

# **11\. CROSS-PROJECT POSITIONING**

The eight projects collectively demonstrate several dimensions of the user's technical profile.

They should not be presented as isolated experiments.

A visitor should be able to see a broader progression:

Applied ML  
   ↓  
Deep Learning  
   ↓  
Model Optimization  
   ↓  
Computer Vision  
   ↓  
Multimodal AI  
   ↓  
Agentic Systems  
   ↓  
Memory / Retrieval  
   ↓  
Cognitive AI Systems

Financial and quantitative projects add another dimension:

Financial Analytics  
      ↓  
Quantitative Modeling  
      ↓  
Optimization  
      ↓  
Risk Analysis

This breadth should emerge naturally from the project collection.

Do not explicitly claim that this is a deliberate career progression unless supported by the user's actual narrative.

---

# **12\. PROJECT CATEGORIES**

Recommended portfolio categories:

Featured  
Supporting  
Research  
Coming Soon

Projects may also have technical tags.

Possible tags include:

AI Systems  
Machine Learning  
Deep Learning  
Generative AI  
Agentic AI  
RAG  
Memory  
Knowledge Graphs  
Computer Vision  
Multimodal AI  
Healthcare AI  
Quantization  
Knowledge Distillation  
Model Compression  
Financial Analytics  
Quantitative Finance  
Optimization  
Data Visualization

Only assign tags that accurately describe the project.

---

# **13\. FEATURED PROJECT PRIORITY**

The strongest projects for technical depth are likely to be:

1. The Inevitable  
2. Cortex Lab  
3. CIFAR-10 Ternary ResNet

Other projects provide complementary evidence of:

* applied ML  
* healthcare AI  
* computer vision  
* financial analytics  
* quantitative modeling

The final featured ordering should remain configurable through the portfolio data/CMS.

Do not hard-code the ordering into page components.

---

# **14\. PROJECT-SPECIFIC CMS MODULES**

The CMS should support project-specific sections.

Recommended module mapping:

## **The Inevitable**

Architecture  
Specification  
Protocols  
Cognitive Systems  
Memory  
Knowledge Graph  
Agents  
Governance  
Observability  
Implementation Status  
Research  
Future Architecture

## **Diabetes Prediction**

Dataset  
ML Pipeline  
Model  
Calibration  
Thresholding  
Risk Stratification  
Explainability  
Validation  
Results  
Safety

## **Cortex Lab**

Memory  
Retrieval  
Knowledge Graph  
Agents  
Reasoning  
Local Inference  
Training  
Evaluation  
Architecture

## **Healthcare AI Assistant**

Symptom Input  
Disease Prediction  
Severity  
Voice  
Conversational AI  
Health Profile  
Privacy  
Security  
Safety

## **CIFAR-10 Ternary ResNet**

Experiment Setup  
Teacher  
Student  
Knowledge Distillation  
Ternarization  
QAT  
Ablation  
Results  
Compression  
Model Statistics  
Reproducibility

## **Kaynes Dashboard**

Financial Data  
Financial Metrics  
Ratios  
Liquidity  
Solvency  
Profitability  
Efficiency  
DuPont  
Forecast  
Benchmarks  
Scorecard  
Visualization  
Methodology

## **Portfolio Optimization**

Investment Universe  
Historical Data  
Return Model  
Risk Model  
Covariance  
MPT  
Optimization  
Constraints  
Portfolio Allocation  
Risk Analysis  
Sensitivity

## **Image Captioning & Segmentation**

Dataset  
Captioning  
Segmentation  
Model Comparison  
Inference  
Combined Pipeline  
Visualization  
Batch Processing  
Evaluation  
Testing  
Deployment  
---

# **15\. CONTENT STATUS MODEL**

Every significant project claim should conceptually fall into one of these states:

Verified  
Measured  
Derived  
Documented  
Implemented  
Experimental  
Specified  
Planned  
Future  
Needs Verification

The exact public labels should be governed by `CONTENT_EVIDENCE_RULES.md`.

---

# **16\. WHAT MUST NEVER BE INVENTED**

Claude must never invent:

* accuracy  
* F1  
* ROC-AUC  
* BLEU  
* CIDEr  
* IoU  
* mAP  
* latency  
* throughput  
* number of users  
* deployment scale  
* revenue impact  
* financial return prediction  
* clinical validation  
* production usage  
* GitHub stars  
* downloads  
* user counts  
* hardware speedup  
* benchmark improvement  
* API availability  
* repository links  
* demo links  
* implementation status

If the information is unavailable:

Not documented

or:

Needs verification

should be preferred over fabrication.

---

# **17\. CONFLICT RESOLUTION**

When multiple artifacts disagree:

Source A  
   ≠  
Source B

do not silently merge them.

Check:

1. source date  
2. experiment/version  
3. implementation  
4. README  
5. generated artifact  
6. official result  
7. most recent authoritative documentation

If the conflict cannot be resolved confidently, preserve it as a verification issue.

---

# **18\. SOURCE-OF-TRUTH HIERARCHY**

Unless a more specific project rule exists, use:

1\. Actual implementation / generated artifact  
2\. Explicit experiment output  
3\. Official project documentation  
4\. README  
5\. Supporting notes  
6\. Resume/project summary  
7\. General inference

General inference must never override direct project evidence.

---

# **19\. PUBLIC PORTFOLIO VS INTERNAL DETAILS**

The public project page should prioritize:

* technical decisions  
* architecture  
* outcomes  
* meaningful implementation details  
* evidence  
* lessons  
* limitations

It does not need to expose:

* secrets  
* API keys  
* environment variables  
* private paths  
* personal identifiers  
* internal debugging information  
* sensitive data  
* unnecessary infrastructure details

---

# **20\. PROJECT CONTENT UPDATE RULE**

When a project changes:

1. inspect the actual repository/source  
2. update the project inventory if the approved positioning changes  
3. update evidence/status information  
4. update the project content  
5. preserve existing verified results  
6. distinguish new results from historical results  
7. do not overwrite older experimental results without context

---

# **21\. GOLDEN RULE FOR THE INVENTORY**

This file exists to answer:

> "What exactly is this project, what should the portfolio say about it, and what must the portfolio never claim about it?"

It is not a replacement for the source repository.

It is a controlled portfolio interpretation of the source material.

When the source material changes, this inventory must be reviewed.

---

