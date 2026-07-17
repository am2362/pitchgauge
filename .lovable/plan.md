## Goal

Make PitchGauge scoring materially more consistent by replacing free-form "score 1–10" judgments with mechanical arithmetic over binary checks, forcing temperature=0, and running each evaluation three times and taking the median.

Applies to both scoring paths:
- `supabase/functions/analyze-startup/index.ts` (single pitch)
- `supabase/functions/analyze-bulk-startups/index.ts` (bulk)

## Change 1 — Temperature = 0

In both edge functions, the AI call currently uses `temperature: 0.1`. Change to `temperature: 0` and keep `top_p: 1`. Same change to the Gemini-direct path in the bulk function (`generationConfig.temperature`). No other body fields change.

Note: LLMs are not fully deterministic even at temp 0, but this is the correct floor.

## Change 2 — Binary checklist rubric (the main change)

Replace the "give a 1–10 score with reasoning" contract with: the model answers a fixed list of yes/no questions per metric. The server computes the numeric score from the yes-count. The model never picks a number.

### Checklist (12 items per metric, one point each)

Each metric has exactly 12 binary questions. Score = `round(yes_count / 12 * 10)`, clamped to 1–10 (a metric with 0 yes still shows as 1 in the UI, matching current "Missing data → 1" behavior). The 12 questions per metric will live in a new shared file `supabase/functions/_shared/scoring-checklist.ts` so both edge functions use the identical list. Draft coverage per metric (final wording written during implementation):

- Team: founder named, prior startup, prior exit, domain experience stated, ≥2 founders, technical co-founder, business/GTM co-founder, relevant education/credential, notable prior employer, advisors listed, full-time commitment stated, complementary skill mix.
- Market Size: TAM stated with a number, TAM > $1B, TAM > $10B, TAM > $50B, growth rate cited, source cited for TAM, SAM/SOM stated, geographic scope defined, target customer segment named, timing/tailwind cited, market currently expanding (not shrinking), regulatory environment addressed.
- Product Differentiation: unique value prop stated, named competitor differentiation, defensible tech/IP cited, patent/proprietary data mentioned, network effects claimed with mechanism, switching cost mentioned, brand/distribution advantage, first-mover claim with evidence, working product exists (not concept), demo/screenshots/link, roadmap stated, integrations/platform lock-in.
- Traction: any users/customers cited with number, revenue figure cited, MRR/ARR stated, growth rate cited with % and period, retention/churn stated, named customer logos, paid vs. free distinguished, pilot/LOI stated, partnerships named, unit economics (CAC/LTV) stated, engagement metric stated, waitlist/pre-orders quantified.
- Business Model: pricing stated, recurring revenue model, gross margin stated or inferable, multiple revenue streams, CAC stated, LTV stated, sales channel defined, self-serve vs. sales-led stated, contract length/ACV stated, upsell/expansion mechanism, capital efficiency addressed, path to profitability discussed.
- Competitive Landscape: competitors named, competitive matrix/comparison, moat explicitly stated, barrier to entry named, market structure (fragmented/consolidated) described, incumbent risk addressed, switching cost vs. incumbents, regulatory moat, data moat, distribution moat, brand moat, why-now cited.

(Exact wording finalized in the shared file; the count and mapping are the plan-level commitment.)

### New JSON contract from the model

For each metric the model returns only `{ checklist: boolean[12], evidence: string[12] }`. The server:
1. Counts `true` values.
2. Computes `score = clamp(round(yes / 12 * 10), 1, 10)`.
3. Builds `reasoning` from the evidence strings for the yes items (concise, factual, deterministic).
4. Emits the existing frontend shape (`scores.team`, `metrics.team`, and for single pitch `scorecard.team.{score, reasoning, detailedExplanation}`) so no UI or Excel/PDF export code changes.

`overall` is still computed as the mean of the 6 metric scores (existing behavior — unchanged).

### Prompt shape

System prompt becomes a strict "answer yes/no for each item, cite the exact phrase from the pitch as evidence, no scoring, no numbers" instruction. The checklist is embedded verbatim. Missing-data rule stays: if the pitch is silent on the item, answer false with evidence "not stated".

## Change 3 — Triple run + median

Wrap the single AI call in a helper that runs it 3× in parallel per pitch, then for each metric takes the **median yes-count across the 3 runs** and derives the score from that median. This is done per-metric independently so one outlier run cannot drag the whole score.

- Runs execute in parallel via `Promise.all` (no added latency beyond one call).
- If one of the three fails (parse error, 429, etc.), fall back to the median of the remaining two; if only one succeeds, use it; if all three fail, surface the existing error path.
- Applies to both `analyze-startup` and `analyze-bulk-startups`.

Cost/latency note: 3× tokens per pitch. Bulk of 100 pitches becomes 300 model calls — the existing retry/backoff and per-batch delay already tolerate this, and `max_tokens` will be lower per call because output is now a small boolean array instead of prose. For bulk we will keep `google/gemini-2.5-flash-lite` and set `max_tokens` to ~800.

## Out of scope

- No UI changes. Existing Scoring Rubric page copy stays.
- No DB or types changes. Downstream shape unchanged.
- No changes to `compare-startups` or `generate-bulk-comparison` — they consume the same scores.
- No changes to the Overall Score formula, sort order, Excel/PDF exports, or demo data.

## Files touched

- `supabase/functions/_shared/scoring-checklist.ts` (new): the 6 × 12 question lists, the derive-score helper, and the median-of-3 aggregator.
- `supabase/functions/analyze-startup/index.ts`: new prompt, triple-call, temp=0, adapt result to existing `scorecard` shape.
- `supabase/functions/analyze-bulk-startups/index.ts`: same, adapted to the bulk `scores`/`metrics` shape.
