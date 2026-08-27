# PitchGauge

AI-powered pitch deck analysis tool for early-stage startup evaluation. Upload a PDF pitch deck or paste pitch text to receive a structured investment memo, binary scorecard, red flag analysis, and due diligence questions.

**Live demo:** [pitchgauge.vercel.app](https://pitchgauge.vercel.app)

---

## What it does

PitchGauge evaluates startup pitches against a structured 72-point binary checklist (12 yes/no questions across 6 VC evaluation metrics). Scores are derived from the median of 3 parallel LLM runs at temperature 0, making them reproducible and explainable rather than hallucinated numbers.

**Output per analysis:**
- Scorecard across 6 metrics (Team, Market Size, Product Differentiation, Traction, Business Model, Competitive Landscape)
- Executive summary memo
- Red flags by severity (critical / high / medium)
- Due diligence questions by category
- Bull and bear investment thesis

---

## Why I built this

My dissertation tests whether LLM-extracted narrative signals from Companies House filings predict UK startup survival above and beyond traditional financial ratios. PitchGauge applies the same logic to pitch decks — where financial statements don't yet exist — using a structured binary rubric rather than subjective scoring.

The scoring methodology (temperature 0, binary checklist, median of 3 runs) is a direct application of the reproducibility principles I'm validating academically.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL with Row Level Security |
| AI | Google Gemini API (gemini-3.5-flash-lite) |
| Auth | Supabase Auth (email + Google OAuth) |
| Payments | Stripe (subscription billing, webhook handling) |
| Hosting | Vercel |

---

## Scoring methodology

Each pitch is evaluated against 72 binary criteria across 6 metrics. The model answers yes/no per criterion with an evidence quote — it never assigns a score directly.

```
Score = clamp(round(yes_count / 12 * 10), 1, 10)
```

Three parallel runs are fired at temperature 0. The median yes-count per criterion is taken across runs, so a single outlier response can't flip a score. This makes results reproducible: the same pitch text produces the same score.

---

## Features

- **Single PDF analysis** — upload a deck, receive a full investment memo
- **Bulk text analysis** — screen up to 100 pitches via Excel upload (Scale tier)
- **Comparison mode** — compare up to 5 analysed pitches side by side
- **History** — all analyses saved per user
- **Export** — PDF and JSON export of analysis results
- **Subscription billing** — Free / Pro / Scale tiers via Stripe

---

## Project background

Built as a project submission for the Career26 AI Accelerator programme (November 2025), where participants were asked to build something using AI tools. Selected to present at the programme showcase. After presenting, I continued developing it independently using AI-assisted development — designed the scoring methodology and product architecture, rebuilt the backend with Supabase edge functions, added Stripe billing, PDF processing, and bulk analysis. Migrated from Lovable hosting to a self-owned Vercel + Supabase stack in August 2026.

---

## Local development

```bash
git clone https://github.com/am2362/pitchgauge-7a3b98b6.git
cd pitchgauge-7a3b98b6
npm install
```

Create a `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_ref
```

```bash
npm run dev
```

Edge functions require Supabase CLI and a `GEMINI_API_KEY` secret set in your Supabase project.
