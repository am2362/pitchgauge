

## Fix: `getClaims` Does Not Exist in Supabase JS Client

### Root Cause
During security hardening, the auth check in four edge functions was changed from `supabase.auth.getUser(token)` to `supabase.auth.getClaims(token)`. **The `getClaims` method does not exist** in the Supabase JS client library. Every call throws an error, which is caught as `claimsError`, causing all requests to return 401 Unauthorized.

This affects:
- `analyze-startup` (single analysis broken)
- `analyze-bulk-startups` (bulk analysis broken)  
- `compare-startups` (comparison broken)
- `generate-bulk-comparison` (bulk comparison report broken)

The `check-subscription` function still works because it correctly uses `supabaseAdmin.auth.getUser(token)`.

### Fix
Replace `getClaims(token)` with `getUser(token)` in all four functions and extract `userId` from the correct response shape:

```typescript
// BEFORE (broken):
const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
const userId = claimsData?.claims?.sub;
if (claimsError || !userId) { ... }

// AFTER (working):
const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
const userId = userData?.user?.id;
if (userError || !userId) { ... }
```

### Files to Modify
1. **`supabase/functions/analyze-bulk-startups/index.ts`** — lines 32-36
2. **`supabase/functions/analyze-startup/index.ts`** — lines 40-44
3. **`supabase/functions/compare-startups/index.ts`** — lines 38-42
4. **`supabase/functions/generate-bulk-comparison/index.ts`** — lines 37-41

Each is the same 3-line fix: rename the destructured variables and change the property path for `userId`.

