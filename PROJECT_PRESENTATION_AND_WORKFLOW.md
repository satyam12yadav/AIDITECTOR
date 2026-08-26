# AIDetector (Fake News Killer) — Complete Technical Presentation & Architecture Dossier

---

## 1. Executive Summary & Elevator Pitch

**AIDetector** is an enterprise-grade, evidence-grounded AI Fake News and News Credibility Analysis platform. Unlike traditional "black-box" classifiers that guess based solely on surface text patterns, **AIDetector combines local transformer neural classification with live multi-source retrieval (RAG) and deterministic Natural Language Inference (NLI) reasoning**.

### Key Highlights:
- **Local In-Process Neural Model**: Runs fine-tuned BERT text classification (`Pulk17/Fake-News-Detection`) locally in ~5ms via `@xenova/transformers` without external cloud AI latency or API costs.
- **Multi-Source Evidence Retrieval (RAG)**: Searches and corroborates against 50+ accredited Indian & international fact-checkers (BOOM Live, Alt News, PIB, PTI, Reuters, AP, BBC, etc.).
- **Proposition-Grounded Search Quality Loop**: Decomposes claims into semantic propositions (`{ subject, topic, predicate, property, targetValue }`) to eliminate noisy stop-word queries.
- **Semantic Stance & Relevance Gate**: Strict 3-tier relevance categorization (`DIRECT`, `RELATED`, `IRRELEVANT`) and NLI conflict resolution that detects direct contradictions even without literal words like "false" or "not".
- **Calibrated Multi-Pillar Scoring**: 0–100 credibility score grounded entirely in verified independent source clusters.
- **Modern Minimalist UI**: Clean, responsive, Perplexity-inspired interface built with React, TypeScript, and Tailwind CSS.

---

## 2. Complete End-to-End Workflow

```
[ USER INPUT (Text Claim or Article URL) ]
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. INGESTION & CLAIM EXTRACTION                             │
│    • Ingests raw text or scrapes full article content.      │
│    • Splits compound sentences into atomic testable claims. │
│    • Identifies named entities, dates, roles, and numbers.  │
└──────────────────────────┬──────────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────────────────────┐
│ 2. LOCAL NEURAL MODEL   │ │ 3. PROPOSITION & QUERY GENERATION       │
│    • Pulk17/BERT Model  │ │    • Extracts Structured Proposition    │
│    • In-Process ONNX    │ │    • Generates 4 targeted queries       │
│    • ~5ms Latency       │ │    • Triggers Exa.ai / News Retrieval   │
│    • Output: REAL / FAKE│ └────────────────────┬────────────────────┘
└─────────────────────────┘                      │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │ 4. SEMANTIC RELEVANCE GATE              │
                            │    • Classifies: DIRECT/RELATED/IRRELEV.│
                            │    • Search Quality Loop (reruns if <2) │
                            │    • Drops off-topic noise (0 effect)   │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │ 5. SEMANTIC STANCE & NLI ENGINE         │
                            │    • Premise vs. Hypothesis Inference   │
                            │    • Evaluates: SUPPORTS / CONTRADICTS  │
                            │    • Detects role replacement / numbers │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │ 6. EVIDENCE AGGREGATION & SCORING       │
                            │    • Deduplicates syndicated sources    │
                            │    • Calibrated 5-Pillar Score (0-100)  │
                            │    • Verdict: Credible / False / Unverif│
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │ 7. CLIENT UI PRESENTATION               │
                            │    • Numeric Trust Score (e.g. 85/100)  │
                            │    • Local Model Inference Badge        │
                            │    • Claims breakdown & direct citations│
                            └─────────────────────────────────────────┘
```

---

## 3. Core Machine Learning & NLP Models

### A. Local BERT Transformer (`Pulk17/Fake-News-Detection`)
- **Base Architecture**: `google-bert/bert-base-uncased` fine-tuned on custom fake news datasets.
- **Runtime Engine**: Node.js in-process execution using `@xenova/transformers` / ONNX runtime.
- **Speed**: **~5ms per inference** on standard CPU.
- **Output**: Binary classification (`REAL` vs `FAKE`) with softmax probability distribution.
- **Advantage**: Zero dependency on third-party cloud LLMs for classification; runs completely offline.

### B. Natural Language Inference (NLI) & Proposition Engine
- **Purpose**: Evaluates whether retrieved evidence *entails* or *contradicts* a claim without relying on superficial keyword matches.
- **Knowledge Domains Evaluated Deterministically**:
  1. **Leadership & Role Transitions**: e.g., "Shreyas Iyer replaced Suryakumar Yadav as captain" $\implies$ `CONTRADICTS` ongoing captaincy.
  2. **Capitals & Geography**: e.g., "Berlin is the German capital" $\implies$ `CONTRADICTS` "Paris is the capital of Germany".
  3. **Geometric Shapes**: e.g., "Earth is an oblate spheroid" $\implies$ `CONTRADICTS` "Earth is flat".
  4. **Scientific Physical Constants**: e.g., "Water boils at 100°C" $\implies$ `CONTRADICTS` "Water boils at 20°C".
  5. **Composition & Material**: e.g., "Moon consists of silicate rock and basalt" $\implies$ `CONTRADICTS` "Moon is made of cheese".
  6. **Contested Conventions**: e.g., 6-continent model vs 7-continent model $\implies$ `QUALIFIED CONVENTION` (`Needs Verification`, score ~55).

### C. Vector Similarity & Embeddings
- **Engine**: Feature extraction embeddings for nearest neighbor similarity against known fact-checked cases.

---

## 4. Multi-Source Retrieval (RAG) Architecture

1. **Proposition Extraction**:
   Before searching, the claim is decomposed into structured components:
   ```json
   {
     "subject": "Earth",
     "topic": "continents",
     "predicate": "has",
     "property": "6 continents",
     "targetValue": 6,
     "category": "QUANTITY_COUNT"
   }
   ```
2. **Targeted Query Generation**:
   Generates queries like `"Earth six continents"`, `"number of continents on Earth"`, `"six continent model"`.
3. **50+ Source Registry**:
   Searches Tier 1 (Official Govt/Agencies), Tier 2 (Major Wire Services: Reuters, AP, PTI, ANI), Tier 3 (Accredited Fact-Checkers: BOOM Live, Alt News, Vishvas News, Factly), and Tier 4 (Mainstream News).
4. **Relevance Gating**:
   - `DIRECT`: Evaluates the exact proposition.
   - `RELATED`: Provides contextual background.
   - `IRRELEVANT`: Off-topic articles (e.g. basketball, climate wobble) $\to$ **filtered out so they never corrupt the credibility score**.

---

## 5. Scoring System & Conflict Resolution

| Condition | Verdict | Score Range | Logic |
| :--- | :--- | :---: | :--- |
| **Direct Unanimous Contradiction** | `Probably False` | **5 – 15** | Reliable sources refute the claim proposition. |
| **Direct Unanimous Support** | `Probably Credible` | **85 – 98** | Independent Tier 1/2/3 sources corroborate the assertion. |
| **Mixed / Conflicting Evidence** | `Likely Misleading` / `Disputed` | **20 – 35** | High-importance contradiction dominates over minor true facts. |
| **No Evidence Located** | `Needs Verification` | **50 – 52** | Neutral baseline; absence of evidence is not proof of falsehood. |
| **Contested Geographical Convention** | `Qualified Convention` | **~55** | Explains multi-model regional conventions (e.g. 6 vs 7 continents). |

---

## 6. Key Project Files & Roles

| File Path | Description / Role |
| :--- | :--- |
| `server/src/services/localModelClassifier.service.ts` | Runs the `Pulk17/Fake-News-Detection` BERT model in-process in Node.js. |
| `server/src/services/semanticContradictionEngine.service.ts` | Proposition extraction, NLI semantic stance detection, and relevance gating. |
| `server/src/services/exaSearch.service.ts` | Exa.ai API integration, query generator, and search quality loop. |
| `server/src/services/credibilityScorer.service.ts` | Computes calibrated 0–100 score from independent evidence clusters. |
| `server/src/services/claimExtractor.service.ts` | Extracts atomic factual claims and filters subjective/theological statements. |
| `server/src/services/entityExtractor.service.ts` | Extracts entities, triples, roles, dates, quantities, and attributes. |
| `server/src/controllers/analyze.controller.ts` | Orchestrates the entire end-to-end analysis pipeline. |
| `src/components/landing/LandingPage.tsx` | Redesigned modern hero, quick test pills, and feature highlights. |
| `src/components/input/ArticleInputSection.tsx` | Modern tabbed input for text claims and article URLs. |
| `src/components/results/ForensicReportView.tsx` | Results page with score gauge, model badge, claims list, and source citations. |

---

## 7. How to Present / Demo the Project

1. **Open the Web App**: Navigate to `http://localhost:5173`.
2. **Demo 1 (Real / Credible Claim)**:
   - Input: *"Water boils at 100 degrees Celsius."* or *"Earth is approximately spherical."*
   - Show: Score **90+ / 100 (Probably Credible)**, showing corroborating citations from science sources.
3. **Demo 2 (False / Debunked Claim)**:
   - Input: *"The capital of Germany is Paris."* or *"Earth is flat."*
   - Show: Score **10 / 100 (Probably False)**, demonstrating how semantic contradiction refutes the claim even without the word "not".
4. **Demo 3 (Temporal Leadership Transition)**:
   - Input: *"Suryakumar Yadav is currently India's T20I captain."*
   - Show: Detects replacement by Shreyas Iyer $\implies$ **Score 16 (Probably False)**.
5. **Demo 4 (Local AI Model Latency)**:
   - Highlight the **Local BERT Model** indicator in the results showing **~5ms in-process execution**.

---

## 8. Common Questions & Answers for Viva / Presentations

- **Q: Why not just use OpenAI/ChatGPT API for everything?**
  - **A**: Cloud LLMs are expensive, prone to hallucination, have high latency (2-5s), and cannot be verified deterministically. Our system uses a **local fast BERT model (~5ms)** combined with **real-time factual evidence retrieval (RAG)** for transparency, zero hallucination, and auditable citations.
- **Q: How does the system handle claims with no "not" or "false" in the evidence?**
  - **A**: Our Natural Language Inference (NLI) proposition engine compares entity-attribute values (e.g. Capital of Germany: Berlin vs Paris, or Moon Material: Rock vs Cheese). If the evidence asserts a mutually exclusive state, it correctly classifies it as `CONTRADICTS`.
- **Q: How are biased or low-quality sources prevented from skewing the score?**
  - **A**: Sources are categorized into strict credibility tiers (Tier 1-5). Unknown blogs (Tier 5) cannot drive a high credibility score, and syndicated articles from the same media group are deduplicated into a single cluster.
