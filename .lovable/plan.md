## Goal

Remove the Team Quality and Team Reasoning columns from the bulk analysis Excel export, and ensure rows are ranked by Overall Score descending (highest = Rank 1).

## Files to change

1. `src/lib/bulk-excel-export.ts` — used by the real Bulk Analysis page.
2. `src/pages/DemoBulk.tsx` — used by the Demo Bulk page (matches the same Excel layout).

## Changes

### 1. `src/lib/bulk-excel-export.ts` — "Startup Rankings" sheet

- Remove `Team Quality` and `Team Reasoning` from `resultsSheet.columns`.
- Remove the `team` and `teamReasoning` entries from the `toStartupRankingRow()` returned array so the row order matches the new column order.
- Keep the existing `sortByOverallDesc` sort (already sorts by overall score desc, with rounded → exact → name tiebreakers). Make sure the ranking is Overall Score descending (highest = Rank 1). 

Final column order:
`Rank | Startup Name | Sector | Market Size | Market Reasoning | Product Differentiation | Product Reasoning | Traction | Traction Reasoning | Business Model | Business Model Reasoning | Competitive Landscape | Competitive Reasoning | Overall Score`

### 2. `src/pages/DemoBulk.tsx` — demo Excel download

- Remove `Team Quality` and `Team Reasoning` from `sheet.columns` in `handleExcelDownload`.
- Remove the matching `Math.round(r.scores.team)` and `reasonings.team` entries from the `sheet.addRow([...])` call.
- Keep existing `sortDemoByOverallDesc` sort.

## Out of scope

- The "Investment Rankings", "Score Comparison", "Sector Breakdown", "Strengths & Weaknesses", and "Summary" sheets are unchanged (no team columns there to remove).
- No backend / scoring logic changes — Team is still computed and shown in the web UI; only the Excel export omits it.