import type { Project } from "@/lib/types";

// Master project inventory. Every unique project found across the resume and
// GitHub is represented here — nothing is deleted for being unpublished,
// undocumented, or incomplete. Only genuine duplicates are merged (see
// `alternateNames` / `relatedTo`). Every claim carries an evidenceStatus so
// the site never presents a target, a self-reported claim, or a plan as a
// verified result.

export const projects: Project[] = [
  {
    slug: "the-inevitable",
    title: "The Inevitable",
    alternateNames: ["The_Invitable (GitHub repository name)"],
    category: "featured",
    status: "Active Development",
    featured: true,
    source: "Both",
    shortDescription:
      "A specification-driven cognitive AI platform for lifelong learning — persistent cognitive state, specialized AI agents, and knowledge-graph-based reasoning, built as a full pnpm/Turborepo monorepo.",
    problem:
      "Most learning platforms treat every session as an isolated event, discarding what was understood before. The Inevitable's stated goal is a \"Universal Cognitive Infrastructure\" — a system where understanding, memory, and reasoning compound over time instead of restarting.",
    approach:
      "Persistent cognitive state per learner, combined with specialized AI agents for orchestration, prerequisite-aware learning, adaptive explanation, and knowledge-graph reasoning. The repository's own implementation notes describe foundational layers (durable event-sourced persistence, a knowledge-graph engine, multi-agent dispatch, a web \"Cognitive Stage\" interface) as complete, with further work (source-anchored teaching, broader modality support) still in progress.",
    architecture:
      "pnpm + Turborepo monorepo: apps/, packages/, services/, infrastructure/, supabase/, tests/, scripts/e2e/, GitHub Actions CI, Husky/Commitlint tooling.",
    technologies: [
      "TypeScript",
      "pnpm",
      "Turborepo",
      "Supabase",
      "PostgreSQL",
      "Vercel",
      "GitHub Actions",
      "Event-Driven Architecture",
      "Knowledge Graphs",
      "Agent Orchestration",
      "Google Gemini",
      "OpenTelemetry",
      "JSON Schema",
    ],
    results: [],
    metrics: [],
    githubUrl: "https://github.com/palchandra1258-afk/The_Invitable",
    evidenceStatus: "partially-verified",
    verificationNotes:
      "The monorepo structure, commit history (40 commits), CI configuration, and test suite are directly verifiable in the repository. However, the repository's own documentation makes strong completeness claims (\"production ready,\" specific phases \"complete\") that I could not independently confirm — no CI badge, test run, or live demo was available to check. Those claims are self-reported by the project's own docs. Dependency evidence differs by technology and is stated precisely rather than lumped together: PostgreSQL (pg), OpenTelemetry, and JSON Schema (ajv, Draft 2020-12) are declared package dependencies; Supabase is evidenced by three SQL migrations and environment configuration rather than an npm package; Google Gemini is wired through environment configuration and application code, with a deterministic fallback runtime when no API key is present, and is not a declared package dependency. Whether the CI pipeline passes and whether any deployment is live were not verified.",
    whatIsWorking: [
      "Monorepo structure (24 packages, 5 apps, 5 services), a CI pipeline running codegen, schema validation, typecheck, test, lint and format checks, and a 94-file test suite organised into contract, failure, governance, integration, replay and unit categories — all structurally confirmed, though not executed",
      "Per the project's own documentation: durable event-sourced persistence, a knowledge-graph engine, and a web interface — self-reported as complete, not independently verified",
    ],
    whatIsInDevelopment: [
      "Source-anchored teaching and broader modality support, per the project's own roadmap",
    ],
  },
  {
    slug: "atdl-assignment",
    title: "Ternary Quantization + Knowledge Distillation for CIFAR-10",
    alternateNames: ["ATDL_Assignment"],
    category: "featured",
    status: "Completed",
    featured: true,
    source: "GitHub",
    shortDescription:
      "Compressed a ResNet-18 image classifier 15.49× via ternary weight quantization and knowledge distillation, with under 1 percentage point of accuracy loss versus the full-precision baseline.",
    problem:
      "Full-precision convolutional networks are often too large for constrained deployment. This project (an advanced deep learning coursework assignment) tackles compressing a CIFAR-10 classifier while preserving accuracy.",
    approach:
      "Trained in three stages: a ResNet-34 teacher, a full-precision (FP32) ResNet-18 baseline, and a ternary-weight ResNet-18 student combining knowledge distillation with quantization-aware training (QAT). Each ternary layer derives its own per-output-channel threshold (0.7 × the mean absolute weight) and scale from the layer's full-precision latent weights, then maps weights to {-1, 0, +1} using a straight-through estimator so gradients still flow through the otherwise non-differentiable quantization step. A controlled ablation compared distillation temperatures T=2 and T=4, with the T=2 configuration used for the final reported model and compression analysis.",
    architecture:
      "Implemented as three separate staged training scripts — teacher (ResNet-34) → FP32 baseline (ResNet-18) → ternary KD+QAT student (ResNet-18) — so the teacher and baseline are trained once and reused as fixed reference points rather than retrained alongside the student. Dedicated evaluation and weight-verification utilities compute the reported accuracy figures and the final T=2 model's structural statistics: 21 ternary Conv/Linear layers, 11,164,352 effective ternary weights (50.17% sparsity), and 4,810 FP32 per-output-channel scales plus 20 FP32 BatchNorm layers retained outside the ternary representation.",
    technologies: ["Python", "PyTorch", "TorchVision", "NumPy", "Matplotlib", "CUDA"],
    results: [
      "Teacher (ResNet-34): 95.80% validation accuracy, 95.20% test accuracy",
      "FP32 baseline (ResNet-18, no KD): 95.56% validation accuracy, 94.75% test accuracy",
      "T=2 ternary KD+QAT student: 94.50% validation accuracy, 93.86% test accuracy",
      "T=4 ablation (same setup, different distillation temperature): 94.42% validation accuracy, 94.25% test accuracy",
      "Final T=2 model: 21 ternary Conv/Linear layers, 11,164,352 effective ternary weights, 50.17% sparsity, 4,810 FP32 per-output-channel scales, 20 FP32 BatchNorm layers",
      "Deployment-oriented compression: 2.753 MiB (15.49× vs. FP32 ResNet-18 inference state; 15.89× for ternary weights+scales alone), selected at epoch 191 of a completed 200-epoch run",
    ],
    metrics: [
      { label: "Validation accuracy", value: "94.50%", kind: "verified-result" },
      { label: "Test accuracy", value: "93.86%", kind: "verified-result" },
      { label: "Compression ratio", value: "15.49×", kind: "verified-result", note: "vs. FP32 ResNet-18" },
      { label: "Teacher test accuracy", value: "95.20%", kind: "verified-result", note: "ResNet-34 teacher, upper bound", source: "results/task4_T2_comparison.json" },
      { label: "FP32 baseline test accuracy", value: "94.75%", kind: "verified-result", note: "ResNet-18, no KD/quantization", source: "results/task4_T2_comparison.json" },
    ],
    githubUrl: "https://github.com/palchandra1258-afk/ATDL_Assignment",
    evidenceStatus: "verified",
    verificationNotes:
      "The only project in this portfolio with fully independently verifiable, quantified results — visible directly in the repository's code, checkpoints, and results. This is coursework: whether it was solo or group work is [NEEDS INFORMATION]. Teacher, FP32 baseline, T=4 ablation, and ternary/compression statistics are confirmed directly from results/task4_T2_comparison.json, results/task4_comparison.json, results/compression_analysis_T2.json, results/student_ternary_T2_weight_report.json, and the ternarization implementation in quantization/ternary.py.",
    whatIsWorking: [
      "Full training/evaluation pipeline with saved checkpoints and reproducible results",
    ],
  },
  {
    slug: "cortex-lab",
    title: "Cortex Lab",
    category: "featured",
    status: "Active Development",
    featured: true,
    source: "GitHub",
    shortDescription:
      "A local-first personal AI memory system: a 9-layer agentic RAG architecture running a fine-tuned, locally-quantized LLM with zero cloud dependency.",
    problem:
      "Cloud-based AI assistants don't retain persistent memory across sessions and require sending personal context off-device. Cortex Lab's goal is a fully local system that remembers and reasons over past conversations.",
    approach:
      "A 9-layer pipeline: input acquisition, memory ingestion, multi-representation storage (vector + graph + temporal), query intelligence (multi-query, HyDE, step-back prompting), 5-agent orchestration, hybrid retrieval, self-reflective generation, and memory consolidation — synthesizing techniques such as RAPTOR, Self-RAG, CRAG, and GraphRAG.",
    architecture:
      "FastAPI + WebSocket backend, Next.js 15 / Tailwind frontend, FAISS (HNSW/IVF-PQ) for vector storage, DuckDB for temporal/graph data.",
    technologies: [
      "Python",
      "FastAPI",
      "Next.js",
      "DeepSeek-R1 (fine-tuned, 4-bit)",
      "FAISS",
      "DuckDB",
      "BGE Embeddings",
      "NetworkX",
    ],
    results: [],
    metrics: [
      { label: "Simple query latency", value: "< 2s", kind: "target" },
      { label: "Complex query latency", value: "< 5s", kind: "target" },
      { label: "Retrieval precision@10", value: "> 0.75", kind: "target" },
    ],
    githubUrl: "https://github.com/palchandra1258-afk/Cortex-Lab",
    evidenceStatus: "partially-verified",
    verificationNotes:
      "Backend/frontend scaffolding and fine-tuning scripts are real and present in the repository. The project's own README explicitly labels itself 'Phase 1, early development' with the retrieval and agentic layers 'planned for upcoming phases' — the performance figures above are stated as targets, not measured results. Direct source inspection confirms real implementations of five specialized agents (Timeline, Causal, Reflection, Planning, Arbitration), an Agent Orchestrator, and CRAG/Self-RAG/FLARE quality-and-retrieval logic (backend/src/agents/specialized.py, orchestrator.py). Multi-stage training-data files for DPO, ORPO, RAFT, RFT, and SPIN are present and substantial, and the trl training dependency is real, but whether fine-tuning was run to completion was not independently confirmed.",
    whatIsWorking: [
      "Backend/frontend scaffolding",
      "LLM fine-tuning pipeline scripts",
      "Five specialized reasoning agents (Timeline, Causal, Reflection, Planning, Arbitration) with a working Agent Orchestrator",
      "CRAG quality evaluation, Self-RAG reflection, and FLARE forward-looking retrieval logic",
    ],
    whatIsInDevelopment: ["Full 9-layer retrieval and agentic pipeline (repo's own status: early-stage)"],
    implementationNotes: [
      { label: "Timeline Agent (temporal/chronological reasoning)", status: "implemented" },
      { label: "Causal Agent (cause-effect reasoning)", status: "implemented" },
      { label: "Reflection Agent (belief/perspective evolution)", status: "implemented" },
      { label: "Planning Agent (multi-step synthesis)", status: "implemented" },
      { label: "Arbitration Agent (conflict resolution)", status: "implemented" },
      { label: "Agent Orchestrator", status: "implemented" },
      { label: "CRAG quality evaluation", status: "implemented" },
      { label: "Self-RAG reflection (ISREL/ISSUP/ISUSE)", status: "implemented" },
      { label: "FLARE forward-looking active retrieval", status: "implemented" },
      { label: "DPO/ORPO/RAFT/RFT/SPIN training-data and pipeline dependencies present; fine-tuning completion not independently confirmed", status: "specified" },
    ],
  },
  {
    slug: "healthcare-ai-assistant",
    title: "Healthcare AI Assistant",
    category: "featured",
    status: "Internship Project",
    featured: true,
    source: "Resume",
    shortDescription:
      "A multimodal clinical decision-support prototype ranking likely conditions across 41 diseases and 132 symptoms, built during a Data Science & Analytics internship at Zio Development.",
    problem:
      "Helping non-specialists interpret symptoms via an explained, ranked prediction rather than a single unexplained output.",
    approach:
      "Symptom weighting and probabilistic ranking combined with Google Gemini for contextual explanation and recommendations, accepting text, voice, and body-map input, surfaced through an interactive dashboard.",
    technologies: ["Python", "Machine Learning", "Google Gemini", "Voice AI", "Interactive Dashboards"],
    results: ["Scope: 41 diseases, 132 symptoms (stated consistently across the resume's Experience and Projects sections)"],
    metrics: [
      { label: "Disease classes covered", value: "41", kind: "scope" },
      { label: "Symptom features", value: "132", kind: "scope" },
    ],
    evidenceStatus: "self-reported",
    verificationNotes:
      "This project is corroborated internally — the resume describes the identical scope in both its 'Experience' (Zio Development internship) and 'Projects' sections, which is a meaningful internal consistency check. However, no public source code, screenshots, or a working demo could be located. Implementation details (model type, dataset, architecture, and any accuracy metrics) are [NEEDS INFORMATION].",
    relatedTo: [
      { slug: "healthcare-prediction-main", note: "Name-plausible GitHub match — relationship unconfirmed" },
      { slug: "healthcare-prediction", note: "Name-plausible GitHub match — relationship unconfirmed" },
    ],
  },
  {
    slug: "diabetes-prediction",
    title: "Diabetes Risk Prediction System",
    alternateNames: ["Diabetes_prediction"],
    category: "supporting",
    status: "Completed",
    featured: false,
    source: "GitHub",
    shortDescription:
      "An XGBoost-based diabetes risk classifier served through a Streamlit app with SHAP-based explainability, trained on the BRFSS 2015 health survey dataset.",
    problem: "Estimating diabetes risk from patient health indicators and communicating that risk with clinical guidance, not just a raw score.",
    approach:
      "XGBoost binary classifier over 21 health indicators, with predictions stratified into four risk tiers (Low/Moderate/High/Very High), each carrying a clinical-guidance recommendation, and SHAP explainability for transparency.",
    technologies: ["Python", "XGBoost", "Streamlit", "SHAP", "Pandas", "scikit-learn"],
    results: [],
    metrics: [
      { label: "Dataset size", value: "253,680 records", kind: "dataset-fact", note: "BRFSS 2015" },
      { label: "Features used", value: "21 health indicators", kind: "dataset-fact" },
    ],
    githubUrl: "https://github.com/palchandra1258-afk/Diabetes_prediction",
    evidenceStatus: "verified",
    verificationNotes:
      "Implementation is real and well-structured (production-style app/core/utils separation). No accuracy, precision, recall, or AUC metrics are published in the repository — [NEEDS INFORMATION] before any performance claim can be made.",
  },
  {
    slug: "dashboard-finance",
    title: "Financial Analysis Dashboard",
    alternateNames: ["Dashboard_Finance"],
    category: "supporting",
    status: "Completed",
    featured: false,
    source: "GitHub",
    shortDescription:
      "An interactive financial-analysis dashboard comparing two technology companies (Kaynes Technology and Bharat Electronics) across liquidity, solvency, profitability, efficiency, and DuPont decomposition.",
    problem: "Comparing two companies' financial health across multiple analytical frameworks in one interactive view rather than static spreadsheets.",
    approach:
      "Seven analysis modules (Executive Summary, Liquidity, Solvency, Profitability, Efficiency, DuPont, Comparative Scorecard) with 20+ visualizations, year selection (2022–2025), and forecast projections. A composite financial health score (0–100) weights Liquidity, Solvency, Profitability, and Efficiency equally (25% each); year-over-year forecasts use simple linear regression.",
    technologies: ["Python", "Streamlit", "Plotly", "Pandas", "NumPy", "SciPy"],
    results: [],
    metrics: [],
    githubUrl: "https://github.com/palchandra1258-afk/Dashboard_Finance",
    evidenceStatus: "verified",
    verificationNotes:
      "Real, complete, structured implementation using real company financial data (e.g., FY2025 figures for both companies). No live deployment link confirmed — [NEEDS INFORMATION]. The 0–100 health-score methodology (25% equal weighting across Liquidity/Solvency/Profitability/Efficiency) and linear-regression forecasting are confirmed directly in financial_calculator.py and chart_components.py. The repository's own files disagree on Kaynes Technology's FY2025 Net Profit and EPS figures across data_extractor.py, visualize_analysis.py, and README.md. This conflict remains unresolved; no specific Net Profit or EPS figure is published here pending confirmation of the authoritative source and reporting period.",
  },
  {
    slug: "carbon-footprint-optimization",
    title: "Carbon Footprint Optimization — Diet Optimization Research",
    category: "research",
    status: "Research / Experimental",
    featured: false,
    source: "Resume",
    shortDescription:
      "A linear programming model balancing nutrition, food cost, and carbon emissions to generate personalized, low-emission meal plans.",
    problem: "Personalizing dietary recommendations that account for cost and carbon footprint simultaneously, not just nutrition.",
    approach: "Formulated as a linear programming optimization problem translating results into cost- and carbon-efficient dietary recommendations.",
    technologies: ["Python", "Linear Programming", "Optimization"],
    results: [],
    metrics: [],
    evidenceStatus: "self-reported",
    verificationNotes: "Described only on the resume; no public repository located. Implementation details are [NEEDS INFORMATION].",
  },
  {
    slug: "image-captioning-segmentation",
    title: "Image Captioning & Segmentation",
    alternateNames: ["Image-Captioning-Segmentation"],
    category: "supporting",
    status: "Completed",
    featured: false,
    source: "GitHub",
    shortDescription:
      "A multimodal computer-vision application that captions an image and segments its objects in one pass, then links the two — captioning via a pretrained ViT-GPT2 model, segmentation via COCO-pretrained Mask R-CNN and DeepLabV3+, wrapped in a Streamlit app with batch processing, Docker, and CI.",
    problem:
      "Demonstrating a unified computer-vision pipeline where a single application produces both a natural-language description and a pixel-level understanding of an image, rather than treating captioning and segmentation as unrelated demos.",
    approach:
      "Two inference paths run behind one Streamlit interface. Captioning uses a pretrained ViT-GPT2 model (Vision Transformer encoder, GPT-2 decoder) with beam search and a configurable maximum length; a second, from-scratch path (ResNet50/InceptionV3 encoder with an LSTM decoder) exists in the codebase but is not a working route. Segmentation uses COCO-pretrained Mask R-CNN for instance masks and DeepLabV3+ for semantic masks. A combined pipeline runs both over the same image and links objects named in the generated caption back to the regions that were segmented — the step that makes this one application rather than two demos side by side.",
    architecture:
      "Four layers: a Streamlit UI; a model-wrapper layer (CaptioningModelWrapper, SegmentationModelWrapper) owning model loading and device placement; inference pipelines (inference/captioning.py, inference/segmentation.py) handling preprocessing, generation or inference, and postprocessing; and a utility layer for visualization and COCO handling. Three workflows sit on top — single image, combined captioning plus segmentation, and batch processing across multiple images with a downloadable result bundle. Docker images for CPU and GPU and a GitHub Actions CI workflow are configured in the repository. U-Net appears in the segmentation configuration but is never constructed: that path falls back to pretrained DeepLabV3+.",
    technologies: [
      "Python",
      "PyTorch",
      "TorchVision",
      "Streamlit",
      "Hugging Face Transformers",
      "ResNet50",
      "InceptionV3",
      "ViT-GPT2 (Vision Transformer + GPT-2)",
      "DeepLabV3+",
      "Mask R-CNN",
      "COCO",
      "NLTK (BLEU)",
      "Docker",
    ],
    results: [
      "No measured BLEU, CIDEr, mAP, or IoU values exist in this repository. The project is presented on what it implements, not on benchmark scores.",
      "BLEU is a real NLTK-based computation, so that evaluation path is genuine — it has simply never been run to a reported figure.",
      "The repository's CIDEr function is an explicit placeholder approximation (BLEU-4 × 2.0), not a CIDEr implementation. Nothing it returns is a CIDEr score, and no such value is claimed anywhere in this portfolio.",
    ],
    metrics: [],
    githubUrl: "https://github.com/palchandra1258-afk/Image-Captioning-Segmentation",
    evidenceStatus: "partially-verified",
    verificationNotes:
      "Evidence comes from direct inspection of a local clone, which was substantially more complete than earlier information suggested: model-wrapper code (models/wrappers.py), inference pipelines (inference/captioning.py, inference/segmentation.py), a full Streamlit app (app.py), tests, a GitHub Actions CI workflow, and Docker/Docker-GPU configuration all exist. Three gaps were found and are stated openly above rather than left implicit — the from-scratch captioning decoder is untrained, U-Net is configured but never constructed, and the CIDEr function is a placeholder. No final measured BLEU, CIDEr, mAP, or IoU scores were found. It was not independently confirmed that this local clone matches the current public state of the linked GitHub repository — [NEEDS VERIFICATION].",
    whatIsWorking: [
      "Streamlit app runs both captioning and segmentation with a synchronized combined view",
      "Pretrained ViT-GPT2 captioning (real, functional beam-search generation)",
      "COCO-pretrained Mask R-CNN and DeepLabV3+ segmentation",
      "Object linking between caption text and segmented regions",
      "Batch processing (multiple images, downloadable ZIP of results)",
      "Docker (CPU/GPU) and GitHub Actions CI configured",
    ],
    whatIsInDevelopment: [
      "From-scratch ResNet50/InceptionV3 + LSTM captioning: the code exists, but its beam-search decoding uses placeholder probabilities rather than a trained decoder — ViT-GPT2 is the functional captioning route",
      "U-Net segmentation: referenced in configuration but not implemented; the code always falls back to pretrained DeepLabV3+",
      "CIDEr evaluation: a placeholder formula standing in for a real implementation, not a usable metric",
    ],
  },
  {
    slug: "edgememory",
    title: "EdgeMemory",
    category: "coming-soon",
    status: "Unpublished",
    featured: false,
    source: "Resume",
    shortDescription: "On-device lifelong memory AI — project details coming soon.",
    problem: "Converting voice reflections into timestamped, semantically searchable memories, privately and on-device (per resume description).",
    technologies: ["Python", "PyTorch", "ASR", "Embeddings", "ONNX"],
    results: [],
    metrics: [],
    evidenceStatus: "unpublished",
    verificationNotes:
      "No public repository or artifact located under this name. Selected project — additional implementation details unavailable publicly. [NEEDS INFORMATION]",
  },
  {
    slug: "resuwhisperai",
    title: "ResuWhisperAI",
    category: "coming-soon",
    status: "Unpublished",
    featured: false,
    source: "Resume",
    shortDescription: "Generative AI resume intelligence system — project details coming soon.",
    problem: "Combining resume parsing, LLM reasoning, and semantic retrieval into structured candidate profiling (per resume description).",
    technologies: ["Python", "LLMs", "RAG", "Embeddings", "Semantic Search"],
    results: [],
    metrics: [],
    evidenceStatus: "unpublished",
    verificationNotes:
      "No public repository or artifact located under this name. Selected project — additional implementation details unavailable publicly. [NEEDS INFORMATION]",
  },
  {
    slug: "healthcare-prediction-main",
    title: "Healthcare_Prediction_Main",
    category: "coming-soon",
    status: "Repository Placeholder",
    featured: false,
    source: "GitHub",
    shortDescription: "GitHub repository placeholder — no README or description published yet.",
    technologies: [],
    results: [],
    metrics: [],
    githubUrl: "https://github.com/palchandra1258-afk/Healthcare_Prediction_Main",
    evidenceStatus: "needs-information",
    verificationNotes:
      "One commit, no README. Possibly related to the Healthcare AI Assistant project — [NEEDS VERIFICATION]. Kept as a distinct entry per source-preservation rules rather than assumed to be a duplicate.",
    relatedTo: [{ slug: "healthcare-ai-assistant", note: "Possible relation — unconfirmed" }],
  },
  {
    slug: "healthcare-prediction",
    title: "Healthcare_Prediction",
    category: "coming-soon",
    status: "Repository Placeholder",
    featured: false,
    source: "GitHub",
    shortDescription: "GitHub repository placeholder — currently empty.",
    technologies: [],
    results: [],
    metrics: [],
    githubUrl: "https://github.com/palchandra1258-afk/Healthcare_Prediction",
    evidenceStatus: "needs-information",
    verificationNotes:
      "Confirmed empty repository. Possibly related to the Healthcare AI Assistant project — [NEEDS VERIFICATION]. Kept as a distinct entry per source-preservation rules rather than assumed to be a duplicate.",
    relatedTo: [{ slug: "healthcare-ai-assistant", note: "Possible relation — unconfirmed" }],
  },
  {
    slug: "atdl",
    title: "ATDL",
    category: "coming-soon",
    status: "Repository Placeholder",
    featured: false,
    source: "GitHub",
    shortDescription: "GitHub repository placeholder — currently empty.",
    technologies: [],
    results: [],
    metrics: [],
    githubUrl: "https://github.com/palchandra1258-afk/ATDL",
    evidenceStatus: "needs-information",
    verificationNotes:
      "Confirmed empty repository. Possibly a course container repository related to ATDL_Assignment — [NEEDS VERIFICATION]. Kept as a distinct entry rather than assumed to be a duplicate.",
    relatedTo: [{ slug: "atdl-assignment", note: "Possible relation — unconfirmed" }],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
export const featuredProjects = projects.filter((p) => p.featured);
