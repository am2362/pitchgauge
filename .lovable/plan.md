

# Fix: Always-5-Failures and Incomplete Sector Chart

## Problem
Every bulk analysis loses exactly 5 startups due to AI rate limiting (429 errors), regardless of batch size. The sector distribution chart also misses companies because failed results are excluded from the comparison report.

## Root Cause
1. The edge function receives a 429 from the AI gateway and immediately throws an error -- no retry
2. The frontend's retry logic only catches full invocation failures, not per-startup AI failures (the edge function returns HTTP 200 with the error embedded in the result)
3. The comparison report generation filters out failed startups, so the sector chart and rankings table are incomplete

## Solution

### 1. Add retry-with-backoff for 429 errors in the edge function
**File:** `supabase/functions/analyze-bulk-startups/index.ts`

In the `analyzeStartup()` function, when a 429 is received, retry up to 3 times with exponential backoff (2s, 4s, 8s) before giving up. This keeps retries short enough to avoid edge function timeouts while handling transient rate limits.

### 2. Add a "Retry Failed" button on the frontend
**File:** `src/pages/BulkAnalysis.tsx`

After analysis completes with failures, show a button that collects the failed startups and re-runs them through the same chunked processing loop with longer cooldowns. The results get appended to the existing batch via the RPC function.

### 3. Increase the base cooldown between chunks
**File:** `src/pages/BulkAnalysis.tsx`

Increase `INITIAL_COOLDOWN_MS` from 6000 to 8000ms and `MIN_COOLDOWN_MS` from 4000 to 6000ms to reduce the chance of hitting rate limits in the first place.

### 4. Fix sector distribution to include all analyzed companies
**File:** `src/components/bulk/SectorBreakdownChart.tsx`

Remove the `slice(0, 6)` limit on the legend so all sectors are visible. The bar chart already shows all sectors, but the legend below it is capped at 6.

### 5. Show failed startup count and names in the results view
**File:** `src/pages/BulkAnalysis.tsx`

Add a section below the results header showing which startups failed analysis with their error reason, so users can see exactly what happened rather than just noticing missing data.

## Technical Details

### Edge function retry logic (change in `analyzeStartup`):
```text
When response.status === 429:
  - Retry up to 3 times
  - Wait 2s, then 4s, then 8s between retries
  - Only throw RateLimitError after all retries exhausted
```

### Retry Failed button flow:
```text
1. Extract startups where errorType exists from current results
2. Re-run the chunk processing loop with only those startups
3. Use append_bulk_analysis_results RPC to add new results
4. Replace the failed entries in local state with new results
5. Regenerate comparison report
```

### Files to modify:
- `supabase/functions/analyze-bulk-startups/index.ts` -- add retry logic for 429
- `src/pages/BulkAnalysis.tsx` -- retry button, increased cooldowns, failed startups display
- `src/components/bulk/SectorBreakdownChart.tsx` -- remove legend limit

