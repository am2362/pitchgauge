

# Match Live Bulk Excel Export to Demo Format

## Problem
The live Excel export (`src/lib/bulk-excel-export.ts`) uses a multi-sheet format with raw metrics columns, while the demo export (`DemoBulk.tsx` lines 96-141) uses a single clean sheet with **Rank, Startup Name, Sector, Score + Reasoning pairs per metric, and Overall Score** — with styled headers (white text on blue background).

## Changes — `src/lib/bulk-excel-export.ts`

Replace the current "Detailed Results" sheet (Sheet 1) with the demo's format:

1. **New columns**: `Rank | Startup Name | Sector | Team Quality | Team Reasoning | Market Size | Market Reasoning | Product Differentiation | Product Reasoning | Traction | Traction Reasoning | Business Model | Business Model Reasoning | Competitive Landscape | Competitive Reasoning | Overall Score`

2. **Row data**: Use `r.metrics.team` (etc.) as reasoning text in the reasoning columns (the live data stores reasoning in the `metrics` fields). Rank = index + 1, Competitive = `r.scores.funding`.

3. **Header styling**: Blue background (`FF3B82F6`), white bold font — matching the demo.

4. **Remove old columns**: Drop Tags, Summary, and the separate "Metrics" columns.

5. **Keep Sheets 2-6** (Rankings, Score Comparison, Sector Breakdown, Strengths & Weaknesses, Summary) unchanged — they provide additional value beyond the demo's single-sheet approach.

### Single file modified
- `src/lib/bulk-excel-export.ts`

