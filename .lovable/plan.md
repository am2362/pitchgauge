

# Match Live Comparison Output to Demo Format

## Problem
The live Compare page (`Compare.tsx`) displays results in a different format than the demo (`DemoCompare.tsx`). The demo has a cleaner visual layout with ranking cards, accordion score breakdowns with progress bars, and per-startup strength/weakness cards. The live page uses a table-based layout inside a dialog.

## Key Differences to Resolve

| Section | Live (Current) | Demo (Target) |
|---------|---------------|---------------|
| Rankings | Badge + text list | Visual cards with `#rank`, overall score, top strengths |
| Score Breakdown | Table with collapsible cells | Accordion per startup with colored progress bars + reasoning |
| Strengths/Weaknesses | Two-column grid (all strengths vs all weaknesses) | Per-startup cards with both strengths and weaknesses together |
| Recommendation | Green box in dialog | Highlighted card with primary border |
| Layout | Results in a Dialog popup | Results shown inline on page (and optionally in dialog) |

## Changes

### `src/pages/Compare.tsx`

1. **Inline results section** (lines 617-688): Replace the current compact `comparisonInsights` card with the full demo-style layout:
   - Rankings section with Trophy icon, rank numbers, overall score, top strengths
   - Detailed Score Breakdown using Accordion per startup with progress bars and reasoning
   - Per-startup Strengths & Weaknesses cards (ThumbsUp/ThumbsDown icons)
   - Overall Recommendation highlighted card

2. **Dialog content** (lines 832-1074): Update the dialog to use the same demo-style layout:
   - Replace the table-based score comparison with Accordion + progress bars
   - Replace the two-column strengths/weaknesses grid with per-startup cards
   - Keep the dialog for "View Full Results" but make it match the demo visual style

3. **Add imports**: `Trophy`, `ThumbsUp`, `ThumbsDown`, `ArrowRight` from lucide-react; `Accordion` components from accordion UI

4. **Remove**: The old inline comparison table (lines 719-788) since scores will now be shown in the accordion format within the results sections

5. **Helper function**: Add `getScoreBarColor()` matching the demo (green >= 8, blue >= 6, orange otherwise)

### No changes needed to:
- `DemoCompare.tsx` — already has the target format
- `demo-data.ts` — already has the data
- Edge functions — output format from AI doesn't change, only UI rendering changes

