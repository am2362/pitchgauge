

# Fix: Missing Data Scoring and Memo/Scorecard Overlap

## Problem
1. When a pitch provides no information about a metric (e.g., no team details), the AI still assigns arbitrary scores instead of defaulting to 1.
2. The "Memo" and "Scorecard" tabs show nearly identical content -- both list the same 6 categories with scores and reasoning.

## Solution

### 1. Enforce "1 mark only" rule for missing data in all prompts
**Files:**
- `supabase/functions/analyze-startup/index.ts`
- `supabase/functions/analyze-bulk-startups/index.ts`
- `supabase/functions/compare-startups/index.ts`

Add a clear rule to the system prompt:

```text
MISSING DATA RULE: If the pitch provides NO information about a category, score it 1 with reasoning "No information provided in pitch." Do NOT infer, assume, or guess. Only score based on what is explicitly stated.
```

This will be added right after the scoring rubric in each edge function.

### 2. Transform memo into a brief executive summary
**File:** `supabase/functions/analyze-startup/index.ts`

Change the `memo` field in the prompt from repeating the 6 category scores to:

```text
"memo": "A 2-3 sentence executive summary of the startup's overall investment potential. Cover the strongest aspect, the biggest risk, and whether the startup is worth further diligence. Do NOT repeat individual category scores here."
```

### 3. Update the frontend memo tab label and display
**File:** `src/pages/Index.tsx`

- Rename the "Memo" tab to "Summary"
- The display logic already handles string memos well, so no structural change needed -- just the label

### 4. Update bulk analysis prompt similarly
**File:** `supabase/functions/analyze-bulk-startups/index.ts`

Apply the same memo change (brief summary instead of repeated scores) and missing data rule.

## Files Modified
- `supabase/functions/analyze-startup/index.ts` -- add missing data rule, change memo format
- `supabase/functions/analyze-bulk-startups/index.ts` -- add missing data rule, change memo format
- `supabase/functions/compare-startups/index.ts` -- add missing data rule
- `src/pages/Index.tsx` -- rename Memo tab to Summary

## Notes
- Existing saved analyses will still display correctly since the memo field already supports string format
- The scorecard remains the detailed breakdown; the summary becomes a quick investment perspective
