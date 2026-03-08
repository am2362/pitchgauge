

# Reduce Bulk Analysis Limit from 1000 to 100

Four files need text updates. No logic changes required beyond the constant.

### Changes

**1. `src/lib/excel-parser.ts` (line 15)**
- Change `MAX_STARTUPS = 1000` → `MAX_STARTUPS = 100`
- Update the warning message on line ~108 to say: "Maximum 100 startups per batch. Please reduce your upload and try again."

**2. `src/components/bulk/BulkUploadCard.tsx`**
- Line 98: "up to 1000 startup pitches" → "up to 100 startup pitches"
- Line 146: "Maximum startups: 1000" → "Maximum startups: 100"

**3. `src/pages/BulkAnalysis.tsx` (line 668)**
- "Analyze up to 1000 startup pitches" → "Analyze up to 100 startup pitches"

**4. `supabase/functions/_shared/validation.ts`** — already defaults to 100, no change needed.

