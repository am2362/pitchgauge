

# Implement 1000 Startup Support with Chunked Processing

## Overview

This plan enables the bulk analysis feature to process up to **1000 startups** by implementing chunked processing from the frontend. Instead of sending all startups to a single edge function call (which would timeout), the frontend will send smaller chunks (50-100 startups each) and manage the overall progress.

## Current Architecture & Constraints

| Constraint | Current Value | Impact |
|------------|---------------|--------|
| Edge Function Timeout | ~60-150 seconds | Cannot process 1000 startups in one call |
| Backend Validation Limit | 100 startups | Prevents >100 per API call |
| UI Messaging | "up to 1000" | Already advertises 1000 support |
| Frontend Excel Parser | 1000 startups | Already supports parsing 1000 |

### Current Flow (Single Request)
```text
Frontend                              Edge Function
   │                                      │
   │──── All 1000 startups ─────────────▶│
   │                                      │ TIMEOUT after ~2 min
   │◀──────── Error ──────────────────────│
```

### New Flow (Chunked Processing)
```text
Frontend                              Edge Function
   │                                      │
   │──── Chunk 1 (50 startups) ─────────▶│
   │◀──── Results (50) ───────────────────│
   │                                      │
   │──── Chunk 2 (50 startups) ─────────▶│
   │◀──── Results (50) ───────────────────│
   │                                      │
   │        ... repeat ...                │
   │                                      │
   │──── Final chunk ───────────────────▶│
   │◀──── Complete ───────────────────────│
```

## Architecture Changes

### 1. Frontend Chunked Processing (BulkAnalysis.tsx)

**New Constants:**
- `CHUNK_SIZE = 50` - Number of startups per API call
- `DELAY_BETWEEN_CHUNKS = 2000` - 2 second pause between chunks

**Modified `handleUploadComplete` Function:**
```typescript
// Split startups into chunks of 50
const chunks = splitIntoChunks(startups, CHUNK_SIZE);
let completedCount = 0;
const allResults = [];

for (const chunk of chunks) {
  // Call edge function with this chunk
  const { data, error } = await supabase.functions.invoke('analyze-bulk-startups', {
    body: {
      batchId: batch.id,
      startups: chunk,
      batchSize: 5,
      appendResults: true  // NEW: tells backend to append to existing results
    }
  });
  
  completedCount += chunk.length;
  allResults.push(...data.results);
  
  // Update local state for progress bar
  setCurrentAnalysis(prev => ({
    ...prev,
    completed_startups: completedCount,
    results: allResults
  }));
  
  // Delay between chunks
  if (completedCount < startups.length) {
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
  }
}
```

### 2. Backend Changes (analyze-bulk-startups/index.ts)

**Increase Validation Limit:**
```typescript
// Change from 100 to 100 per chunk (frontend handles overall 1000 limit)
const validation = validateBulkAnalysisInput(body, 100, 50000, 200);
// No change needed - 100 per request is fine with chunking
```

**Add Append Mode:**
```typescript
const { batchId, startups, batchSize, appendResults = false } = validation.data!;

// When updating database, either replace or append results
if (appendResults && batchId) {
  // Fetch existing results and append new ones
  const { data: existing } = await supabaseAuth
    .from('bulk_analyses')
    .select('results')
    .eq('id', batchId)
    .single();
  
  const existingResults = existing?.results || [];
  const combinedResults = [...existingResults, ...allResults];
  
  await supabaseAuth
    .from('bulk_analyses')
    .update({
      completed_startups: combinedResults.length,
      results: combinedResults
    })
    .eq('id', batchId);
}
```

### 3. Validation Schema Update (_shared/validation.ts)

Add `appendResults` to the input interface:

```typescript
export interface BulkAnalysisInput {
  batchId?: string;
  startups: StartupEntry[];
  batchSize?: number;
  appendResults?: boolean;  // NEW
}
```

### 4. Progress Bar Enhancement (AnalysisProgressBar.tsx)

Update the estimated time calculation for larger batches:

```typescript
// More accurate estimation for chunked processing
const estimatedSeconds = remaining * 2.5; // ~2.5 seconds per startup with chunking
const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
```

## Data Flow

```text
┌──────────────────┐
│  Upload Excel    │
│  (1000 startups) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Create batch    │──────▶ Database: batch record created
│  record in DB    │        status: 'processing'
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Split into      │
│  20 chunks of 50 │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐     
│Chunk 1│ │Chunk 2│ ... (sequential processing)
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────────────────────┐
│  Edge Function        │
│  (processes 50)       │
│  Updates DB with      │
│  appended results     │
└───────────────────────┘
         │
         ▼
┌──────────────────┐
│  All chunks done │
│  status: complete│
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  Comparison      │
└──────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/BulkAnalysis.tsx` | Implement chunked processing loop in `handleUploadComplete` |
| `supabase/functions/analyze-bulk-startups/index.ts` | Add `appendResults` mode for incremental updates |
| `supabase/functions/_shared/validation.ts` | Add `appendResults` to `BulkAnalysisInput` interface |
| `src/components/bulk/AnalysisProgressBar.tsx` | Update time estimation for large batches |

## Error Handling

**Per-Chunk Failures:**
- If a chunk fails, log the error and continue with next chunk
- Failed startups within a chunk are marked with `error: true` 
- Final summary shows "X of Y startups analyzed successfully"

**Network Interruptions:**
- Results are saved to database after each chunk
- User can refresh page and see partial progress
- "Resume" functionality (future enhancement)

## Performance Estimates

| Startups | Chunks | Estimated Time |
|----------|--------|----------------|
| 100 | 2 | ~2 minutes |
| 500 | 10 | ~10 minutes |
| 1000 | 20 | ~20 minutes |

## UI Updates

The progress bar will show real-time updates as each chunk completes:

```text
┌────────────────────────────────────────────────────┐
│  ⏳ Analysis in Progress                           │
│                                                    │
│  Processing startups in batches...                 │
│                                                    │
│  ████████████████░░░░░░░░░░░░░░░  450 / 1000      │
│                                                    │
│  Currently processing: Chunk 10 of 20              │
│  Estimated time remaining: ~12 minutes             │
│                                                    │
│  • Results saved after each batch                  │
│  • You can safely leave and return later           │
└────────────────────────────────────────────────────┘
```

## Backward Compatibility

- Existing analyses with <100 startups work unchanged
- No database schema changes required
- `appendResults` defaults to `false` for existing API calls

