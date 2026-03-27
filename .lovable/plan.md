

## Fix: Make All Startups Succeed on First Run (Zero Retries)

### Problem
The `analyzeStartup` function only retries on HTTP 429 (rate limit). Three other common transient failures — empty AI responses, malformed JSON, and server errors (500/502/503) — immediately throw and get marked as permanently failed. That's why 3-5 startups fail every time.

### Solution
Two changes to `supabase/functions/analyze-bulk-startups/index.ts`:

#### 1. Retry ALL transient errors (not just 429)
Expand the retry logic to cover:
- HTTP 429, 500, 502, 503 responses
- Empty content (`No content in AI response`)
- JSON parse failures (`No valid JSON found`)

Increase max retries from 3 to 5 with longer backoff delays (3s, 6s, 12s, 24s, 48s).

#### 2. Increase inter-batch delay
Change the delay between batches from 250ms to 500ms to reduce rate-limit pressure.

### Technical Detail

Restructure `analyzeStartup` into a single unified retry loop:

```text
for attempt 0..5:
  try:
    fetch AI → check response.ok (retry on 429/500/502/503)
    extract content (retry if empty)
    JSON.parse (retry if malformed)
    return result
  catch:
    if attempt < 5 → exponential backoff → continue
    else → throw
```

### Frontend Change
In `src/pages/BulkAnalysis.tsx`: increase `INITIAL_COOLDOWN_MS` from 8000 to 10000 and `MIN_COOLDOWN_MS` from 6000 to 8000 to give more breathing room between chunks.

### Files to Modify
1. `supabase/functions/analyze-bulk-startups/index.ts` — retry logic + inter-batch delay
2. `src/pages/BulkAnalysis.tsx` — cooldown constants (lines 26-27)

