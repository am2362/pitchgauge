

# Separate Demo Data: FinFlow (Text) vs EcoTrack (PDF)

## Changes

### 1. `src/lib/demo-data.ts` — Add FinFlow constants

Add new exports for the text demo:
- `DEMO_TEXT_STARTUP_NAME = "FinFlow"`
- `DEMO_TEXT_PITCH_TEXT` — the FinFlow pitch paragraph provided by user
- `DEMO_TEXT_ANALYSIS_RESULT` — hardcoded result object with the exact scores and content specified (Team 9, Market 9, Product 8, Traction 8, Business Model 9, Competitive 7, plus memo, red flags, questions, thesis, benchmark at 85th percentile)

Keep existing `DEMO_STARTUP_NAME`, `DEMO_PITCH_TEXT`, `DEMO_ANALYSIS_RESULT` unchanged (used elsewhere). Rename PDF export references as needed or keep `DEMO_PDF_ANALYSIS_RESULT` as-is since it's already EcoTrack.

### 2. `src/pages/Demo.tsx` — Restructure into two clear demo modes

**Input section changes:**
- Replace the single "Input Pitch" card with two distinct cards side by side (or stacked):
  - Card 1: **"Demo: Paste Pitch Text"** — shows FinFlow name, FinFlow pitch text in textarea (read-only), results default to `DEMO_TEXT_ANALYSIS_RESULT`
  - Card 2: **"Demo: Upload Pitch Deck PDF"** — shows the existing EcoTrack PDF upload flow with fake file animation, results use `DEMO_PDF_ANALYSIS_RESULT`

**State changes:**
- `activeResult` starts as `"text"` showing FinFlow results by default
- Clicking between the two demo cards switches `activeResult` and the results panel updates accordingly
- The PDF upload flow stays the same (fake upload steps, then "Generate Analysis" button)

**Results section:**
- Add a badge showing "Text Input" or "PDF Upload" to clarify which demo's results are displayed
- Result object switches between `DEMO_TEXT_ANALYSIS_RESULT` (FinFlow) and `DEMO_PDF_ANALYSIS_RESULT` (EcoTrack)

### 3. Section labels
- Text card header: "Demo: Paste Pitch Text" with `FileText` icon
- PDF card header: "Demo: Upload Pitch Deck PDF" with `Upload` icon

No backend changes. No other files affected.

