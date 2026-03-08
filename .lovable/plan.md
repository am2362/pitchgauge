

# Migrate to External Supabase Client

## Overview
Create a new Supabase client file pointing to external credentials, update all 8 files that import the auto-generated client, and provide the complete SQL migration script.

## 1. Create `src/lib/supabase-external.ts`
New file that creates a Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables (which map to the user's external Supabase project credentials already stored as secrets).

## 2. Update imports in 7 files
Replace `import { supabase } from "@/integrations/supabase/client"` with `import { supabase } from "@/lib/supabase-external"` in:
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Compare.tsx`
- `src/pages/History.tsx`
- `src/pages/BulkAnalysis.tsx`
- `src/pages/Settings.tsx`
- `src/hooks/useSubscription.ts`
- `src/lib/document-parser.ts`

## 3. Complete SQL Migration Script
Provide as a code block for the user to copy and run in their Supabase SQL Editor. Includes:

**Tables**: `profiles`, `subscriptions`, `usage_tracking`, `startup_analyses`, `comparison_analyses`, `bulk_analyses` — all with exact column types/defaults matching current schema.

**RLS Policies**: All existing SELECT/INSERT/UPDATE/DELETE policies per table.

**Functions**:
- `handle_new_user()` — trigger function creating profile + free subscription on signup
- `get_daily_usage_count(p_action_type)` — returns today's usage count
- `append_bulk_analysis_results(p_batch_id, p_results)` — appends results to bulk batch
- `update_updated_at_column()` — auto-updates `updated_at`

**Triggers**:
- `on_auth_user_created` on `auth.users` → calls `handle_new_user()`
- `update_subscriptions_updated_at` on `subscriptions`
- `update_profiles_updated_at` on `profiles`
- `update_bulk_analyses_updated_at` on `bulk_analyses`

No edge function changes needed — they use `SUPABASE_URL`/`SUPABASE_ANON_KEY` from the Deno runtime environment automatically.

