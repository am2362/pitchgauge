

# Fix: Use Non-Colliding Environment Variable Names

## Root Cause
The auto-generated `.env` file (which cannot be edited) defines:
- `VITE_SUPABASE_URL` → Lovable Cloud URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` → Lovable Cloud anon key

These override any secrets with the same name. So `supabase-external.ts` always reads Lovable Cloud credentials.

## Solution
Use **differently-named** environment variables that don't collide with the auto-generated `.env`:

1. **Add two new secrets**:
   - `VITE_EXTERNAL_SUPABASE_URL` → your external Supabase project URL
   - `VITE_EXTERNAL_SUPABASE_ANON_KEY` → your external Supabase anon key

2. **Update `src/lib/supabase-external.ts`** to read from the new variable names:
   ```typescript
   const supabaseUrl = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;
   ```
   Remove the fallback to `VITE_SUPABASE_PUBLISHABLE_KEY` since that always resolves to Lovable Cloud.

3. **Update `src/lib/document-parser.ts`** — it uses `import.meta.env.VITE_SUPABASE_URL` directly for the edge function URL on line ~52. Change to `VITE_EXTERNAL_SUPABASE_URL`.

4. **No other file changes needed** — all other files import `supabase` from `supabase-external.ts` and don't reference env vars directly.

## Files Changed
- `src/lib/supabase-external.ts` — use new env var names
- `src/lib/document-parser.ts` — update edge function URL reference

## Secrets to Add
- `VITE_EXTERNAL_SUPABASE_URL`
- `VITE_EXTERNAL_SUPABASE_ANON_KEY`

(You'll be prompted to enter the values for your external Supabase project)

