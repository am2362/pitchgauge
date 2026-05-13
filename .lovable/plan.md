## Goal

Three changes to bulk analysis:
1. Add Team Quality + Team Reasoning back into the Excel export (before Overall Score).
2. Make the Overall Score the average of all 6 metric scores (Team, Product, Market, Traction, Business Model, Competitive) — applied consistently in UI, Excel, PDF, and the comparison report.
3. Make scoring deterministic against the rubric, and make the AI overall recommendation accurate (no "all startups got 7/10" hallucination).

## Changes

### 1. Add Team back to Excel export

**`src/lib/bulk-excel-export.ts`**
- Insert two columns right before `Overall Score`:
  - `Team Quality` (width 14)
  - `Team Reasoning` (width 50)
- Add `Math.round(result.scores?.team ?? 0)` and `result.metrics?.team || ''` to `toStartupRankingRow()` in the same position.

**`src/pages/DemoBulk.tsx` → `handleExcelDownload`**
- Same column additions before `Overall Score`.
- Add `Math.round(r.scores.team)` and `reasonings.team || ""` to the `sheet.addRow([...])` call in matching position.

Final column order:
`Rank | Startup Name | Sector | Market Size | Market Reasoning | Product Differentiation | Product Reasoning | Traction | Traction Reasoning | Business Model | Business Model Reasoning | Competitive Landscape | Competitive Reasoning | Team Quality | Team Reasoning | Overall Score`

### 2. Overall Score = average of all 6 metrics

Update the `getOverallScore` / overall-recompute logic in every place that currently averages 5 metrics, so it includes `team`:

- `src/lib/bulk-excel-export.ts` → `getOverallScore`
- `src/pages/DemoBulk.tsx` → `getDemoOverallScore`
- `src/pages/BulkAnalysis.tsx` → any local overall recomputation
- `supabase/functions/analyze-bulk-startups/index.ts` → the `s.overall = ...` block at the end of `attemptAnalysis`
- `supabase/functions/generate-bulk-comparison/index.ts` → the `results.forEach((r) => …)` overall normalization at the top
- `src/lib/pdf-export.ts` → any bulk overall calc (verify and update if it uses 5)

Formula in all spots:
```ts
const vals = [s.team, s.market, s.product, s.traction, s.businessModel, s.funding]
  .map(v => Math.round(Number(v) || 0));
s.overall = Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
```

Sort tiebreakers stay the same (rounded → exact → name).

### 3. Accurate overall recommendation

**`supabase/functions/generate-bulk-comparison/index.ts` → `generateOverallRecommendation`**

Problem: the AI is fabricating ("all startups achieved a consistent 7/10") because we only give it `topRankings` (rank/name/score) and tell it to mention highest/lowest. We need to (a) give it real per-startup data for the entire batch, (b) instruct it to be strictly factual and not invent uniformity.

- Pass the **full sorted list** (already done — `topRankings` is no longer sliced) plus a small `scoreStats` object: `{ highest, lowest, mean, median, uniqueScores }` computed from the actual scores.
- Replace the prompt with strict instructions:
  - "Use ONLY the data provided. Do not invent scores or claim uniformity unless `uniqueScores.length === 1`."
  - "Reference the highest score (X/10 — Startup A) and lowest score (Y/10 — Startup B). Do NOT mention the count of startups."
  - "If scores vary, describe the spread. Never say 'all startups scored the same' unless they actually did."
  - Lower `temperature` to `0.2` and keep `max_tokens` at 500.
- Update the catch-block fallback message so it also avoids referencing `${topRankings.length}`.

### 4. Scoring consistency reinforcement

**`supabase/functions/analyze-bulk-startups/index.ts` → `systemPrompt`**

The prompt already enforces determinism (`temperature: 0.1`, "identical facts → identical scores"), but tighten the rubric anchors to match the user's exact bands so repeated runs converge:

- Replace category anchors with the user's exact rubric text (1–3 / 4–6 / 7–8 / 9–10) for: Team, Market, Product Differentiation, Traction, Business Model, Competitive Landscape.
- Note: backend currently maps `funding` → "Competitive Landscape" in the UI/Excel. Keep the JSON key `funding` (don't break the schema), but rewrite its rubric anchors to be the **Competitive Landscape** rubric the user provided. Same for the "Funding" rubric line — drop it; the field semantically represents Competitive Landscape downstream.
- Keep `temperature: 0.1`, `top_p: 1`, integer scores, and the MISSING DATA RULE.

## Out of scope

- No DB schema changes.
- Other Excel sheets (Investment Rankings, Score Comparison, Sector, Strengths/Weaknesses, Summary) — unchanged except they'll naturally reflect the new 6-metric overall.
- No UI layout changes on the website beyond the overall-score recomputation.
