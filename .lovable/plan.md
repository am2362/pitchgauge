

# Complete Demo Mode — All 3 Pages with Static Data

## Overview

Expand the demo from a single-page showcase into a full 3-page demo experience (Single Analysis, Comparison, Bulk Analysis) with animated progress flows, hardcoded results, and zero API calls. All pages share a yellow demo banner and a consistent demo nav bar.

## Files to Create

### 1. `src/lib/demo-data.ts` — Expand with all static data
- **PDF demo result**: New `DEMO_PDF_ANALYSIS_RESULT` with the specific scores from the spec (Team 7, Market 9, Product 7, Traction 6, Business Model 8, Competitive 7), plus summary, red flags, questions, bull/bear case, and benchmark (72nd percentile)
- **Comparison data**: `DEMO_COMPARISON_PITCHES` (3 startups: EcoTrack, FinFlow, MediSync with pitch text), `DEMO_COMPARISON_RESULTS` (3 full analysis results with specified scores), `DEMO_COMPARISON_INSIGHTS` (rankings, recommendation, strengths/weaknesses)
- **Bulk data**: `DEMO_BULK_RESULTS` (10 startups with scores as specified), `DEMO_BULK_COMPARISON_REPORT` (rankings, sector breakdown, overall recommendation)

### 2. `src/components/DemoBanner.tsx` — Shared yellow banner
- Yellow background banner: "You are in demo mode — sign up free to analyse your own pitches"
- Sign up button on right

### 3. `src/pages/Demo.tsx` — Rewrite with PDF upload demo
- Keep existing text input demo + results
- Add "Try Demo: Upload Pitch Deck" button
- When clicked: show fake file name "EcoTrack_PitchDeck.pdf (20 pages)"
- Animate through 4 progress steps with specified timings (1s, 1.5s, 2s, 1s)
- After animation, swap displayed results to `DEMO_PDF_ANALYSIS_RESULT`
- All export buttons show "Sign up to access" toast
- Yellow demo banner at top

### 4. `src/pages/DemoCompare.tsx` — New demo comparison page
- Demo nav with links to all 3 demo pages
- "Load Demo" button that triggers 2-second "Analysing all startups..." animation
- After animation, show 3 pre-filled pitches with static results
- Scorecard comparison table, rankings (1st FinFlow, 2nd EcoTrack, 3rd MediSync)
- Per-startup strengths/weaknesses
- Overall recommendation text
- All export/save buttons → "Sign up to access" toast

### 5. `src/pages/DemoBulk.tsx` — New demo bulk analysis page
- "Load Demo Excel" button
- When clicked: show fake file "startups_batch_demo.xlsx"
- 4-step animation: Upload (1s) → Reading 10 startups (1s) → Analysing with progress bar (3s) → Generating report (1s)
- Show results: Investment rankings table (10 startups), sector breakdown chart
- "Download Excel Results" button actually generates and downloads a real Excel file using ExcelJS with the 10 demo startups and their scores
- "Export PDF" → "Sign up to export" toast

## Files to Modify

### 6. `src/App.tsx` — Add routes
- `/demo/compare` → `DemoCompare`
- `/demo/bulk` → `DemoBulk`
- Keep `/demo` for single analysis

### 7. Demo Nav (shared across all 3 demo pages)
- Update the demo nav in `Demo.tsx` and replicate in new pages
- Links: Single Analysis (`/demo`), Comparison (`/demo/compare`), Bulk (`/demo/bulk`)
- Right side: Demo Mode badge + Sign Up button

## Key Implementation Details

- **Progress animations**: Use `useState` + `useEffect` with `setTimeout` chains to step through progress stages
- **Progress bar in bulk**: Animate from 0→100% over 3 seconds using `setInterval`
- **Excel download**: Use ExcelJS (already installed) to generate a real `.xlsx` with the 10 demo startups' scores
- **Zero API calls**: No imports of supabase client, no fetch calls, no edge function invocations
- **Reuse existing UI components**: `InvestmentRankingsTable`, `SectorBreakdownChart`, `Progress`, score bar patterns from existing Demo.tsx

