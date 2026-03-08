

# Add Score Reasoning to Demo Comparison and Bulk Pages

## Changes

### 1. `src/lib/demo-data.ts` — Update reasoning text
- **Comparison**: Replace existing `reasoning` strings in all 3 startup scorecards (`DEMO_COMPARISON_RESULTS`) with the detailed text provided (e.g. FinFlow Team: "Co-founders previously built and scaled payments infrastructure at Stripe and Plaid...")
- **Bulk**: Add new export `DEMO_BULK_SCORE_REASONINGS: Record<string, Record<string, string>>` mapping startup name → metric → reasoning string for all 10 startups. Cannot modify `BulkStartupScores` type (it's just numbers), so this is a parallel lookup.

### 2. `src/pages/DemoCompare.tsx` — Show reasoning in comparison table
- Replace the compact score-only table with an expanded layout: each startup gets a card or accordion showing all 6 metrics with score + reasoning text beneath
- Alternative: convert the table so each cell shows the score number plus a small reasoning paragraph below it (using a tooltip or expanding row)
- Approach: Replace the simple `<Table>` with per-startup detail cards, each listing 6 metrics with score badge + reasoning text — consistent with how Page 1 single analysis displays explanations per metric

### 3. `src/pages/DemoBulk.tsx` — Show reasoning in bulk results
- Add a new "Detailed Scores" section below the `InvestmentRankingsTable`
- Render expandable cards (one per startup) showing 6 metric scores with reasoning text from `DEMO_BULK_SCORE_REASONINGS`
- Use Accordion or Collapsible so the page isn't overwhelmed with 10 × 6 = 60 reasoning blocks

### Files modified
- `src/lib/demo-data.ts` — update comparison reasonings, add bulk reasonings map
- `src/pages/DemoCompare.tsx` — replace score table with detailed score+reasoning cards
- `src/pages/DemoBulk.tsx` — add detailed scores section with per-startup reasoning

