

# Add Overall Score Row to Compare Feature

## Problem
The comparison tables (both the inline table and the dialog table) show individual scorecard metrics but no overall/average score, making it hard to quickly assess which startup is strongest overall.

## Solution
Add an "Overall Score" row at the bottom of both comparison tables that computes the average of all 6 scorecard metrics for each startup. Highlight the highest overall score.

### File: `src/pages/Compare.tsx`

**Two locations to update:**

1. **Inline Comparison Table** (~line 728, after the `scorecardKeys.map` tbody closing): Add a new `<tr>` row after the individual metric rows that calculates and displays the average score across all 6 categories for each startup.

2. **Dialog Detailed Score Comparison Table** (~line 936, after the `scorecardKeys.map` tbody closing): Same overall score row in the dialog table.

**Score calculation:**
```text
overallScore = average of all 6 scorecard values (team, marketSize, traction, productDifferentiation, businessModel, competitiveLandscape)
```

**Styling:**
- Bold "Overall Score" label in the metric column
- Larger font for the score value
- Highlight the highest overall score (underline, like existing per-metric highlighting)
- Top border to visually separate from individual metrics

