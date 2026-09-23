// Sourced directly from Chandrapal_Resume.pdf. Nothing here is invented —
// anything not explicitly stated in the resume is left out rather than guessed.

export const personal = {
  name: "Chandrapal",
  location: "Bengaluru, Karnataka",
  phone: "+91-7905866596",
  email: "2023chandra.pal@vidyashilp.edu.in",
  github: "https://github.com/palchandra1258-afk",
  linkedin: "https://www.linkedin.com/in/chandra-pal-a737362a1/",
  summary:
    "AI/ML Engineer and Data Science undergraduate focused on building intelligent systems across deep learning, Generative AI, agentic workflows, and AI systems engineering. Hands-on experience developing specification-driven cognitive AI platforms, on-device lifelong memory systems, LLM-powered RAG applications, semantic retrieval pipelines, and multimodal AI solutions, with additional experience in financial analytics, optimization, and applied machine learning.",
};

// Education timeline, most recent first. The Vidyashilp CGPA and degree are
// from the resume; the merit-scholarship and VidyaGyan details were provided
// directly by the user in conversation.
export const education = [
  {
    institution: "Vidyashilp University, Bengaluru",
    degree: "B.Tech. in Data Science (Hons.) + Minor in Finance",
    duration: "2023 — Present",
    detail: "100% Merit Scholarship · 2023–2027 · CGPA 7.89/10",
  },
  {
    institution: "VidyaGyan Leadership Academy, Sitapur",
    degree: "Classes VI – XII",
    duration: "2017 — 2023",
    detail:
      "Full scholarship, a Shiv Nadar Foundation initiative. Selected through a competitive multi-stage admission process — a preliminary written assessment, a main written assessment, and a personal interaction.",
  },
];

export const experience = [
  {
    title: "Data Science & Analytics Intern",
    organization: "Zio Development",
    duration: "Apr 2025 – Jun 2025",
    bullets: [
      "Developed an end-to-end AI-assisted disease prediction pipeline covering 41 diseases and 132 symptoms, combining ML probability ranking with Google Gemini explanations and recommendations.",
      "Implemented symptom weighting, probabilistic ranking, and inference workflows for ranked disease predictions.",
      "Built an interactive AI application integrating voice input, ML inference, conversational AI, and real-time dashboards.",
    ],
  },
];

export const achievements = [
  {
    title: "Top 7 Winning Teams",
    context: "The AI Hiring Show – Vibe Coding, Power Hiring, 2025",
    detail: "[NEEDS INFORMATION — total teams competed, what was built]",
  },
  {
    title: "Shiv Nadar Foundation (HCL) Scholar",
    context: "Academic Merit & Leadership",
    detail:
      "Awarded a full scholarship for schooling at VidyaGyan Leadership Academy (Classes VI–XII) through a competitive, multi-stage selection process — see Education & Scholarships.",
  },
];

// Areas of finance I'm studying through my minor and independent exploration —
// framed as active study, not professional credentials.
export const financeAreas = [
  {
    title: "Financial Institutions, Markets & Services",
    description:
      "Studying how banks, capital markets, and financial intermediaries channel capital and manage risk across the economy.",
  },
  {
    title: "Financial Accounting",
    description:
      "Learning to read and interpret financial statements as the foundation for understanding how businesses record and report performance.",
  },
  {
    title: "Corporate Finance",
    description:
      "Exploring how companies make capital structure, investment, and valuation decisions.",
  },
  {
    title: "Financial Statement Analysis",
    description:
      "Developing the ability to evaluate a company's financial health through ratio analysis, trend analysis, and comparative benchmarking.",
  },
  {
    title: "Investment Management",
    description:
      "Learning the principles behind portfolio construction, asset allocation, and risk-adjusted return.",
  },
  {
    title: "FinTech",
    description:
      "Exploring how technology — from data pipelines to AI — is reshaping financial products, services, and decision-making.",
  },
];

// Curiosity-stage exploration areas at the intersection of AI and finance.
// Deliberately NOT presented as projects — none of these exist as shipped work.
export const technologyXFinanceAreas = [
  "Financial data analytics",
  "AI-assisted financial research",
  "Financial statement analysis with ML",
  "Portfolio analytics",
  "FinTech systems",
  "Machine learning for financial applications",
  "Intelligent financial decision-support systems",
];

export const skills = {
  Programming: ["Python", "TypeScript", "Java", "C", "SQL"],
  "ML / DL": [
    "PyTorch",
    "scikit-learn",
    "NumPy",
    "Pandas",
    "CNNs",
    "RNNs",
    "GRUs",
    "LSTMs",
    "Attention Mechanisms",
    "Transformers",
    "Model Evaluation",
    "Optimization",
  ],
  "Generative AI": [
    "LLMs",
    "RAG",
    "Embeddings",
    "Semantic Search",
    "Prompt Engineering",
    "Structured Generation",
    "AI Agents",
    "Agentic Workflows",
  ],
  "AI Systems": [
    "Knowledge Graphs",
    "Agent Orchestration",
    "Event-Driven Architecture",
    "Cognitive Memory",
    "State Management",
    "AI Observability",
    "OpenTelemetry",
  ],
  "Backend & Data": [
    "FastAPI",
    "REST APIs",
    "PostgreSQL",
    "MySQL",
    "Vector Search",
    "Streamlit",
    "Plotly",
  ],
  "MLOps & Deployment": [
    "Docker",
    "Git",
    "CI/CD",
    "MLflow",
    "ONNX",
    "Model Quantization",
    "Model Pruning",
  ],
} as const;

// Real, GitHub-verified technologies that are not on the resume itself.
// Shown separately so the site never implies these came from the resume.
export const additionalVerifiedSkills = [
  "Turborepo",
  "pnpm workspaces",
  "Supabase",
  "GitHub Actions (CI/CD)",
  "Next.js",
  "XGBoost",
  "SHAP",
  "FAISS",
  "DuckDB",
  "Knowledge Distillation",
  "Ternary Quantization",
];
