

## Goal
Make `c74661985@gmail.com` a distinct "demo" account type — separate from free/pro/scale users and admins — with its own daily quotas: **20 single analyses, 10 comparisons, 3 bulk analyses** per day.

## Current state
- Demo account is already identified via `src/lib/demo-accounts.ts` (email allowlist).
- Currently it shares `free` tier limits (3 single, 0 compare, 0 bulk) plus a combined `DEMO_DAILY_LIMIT = 10` cap across all features.
- Admins get a `scale` override via `check-admin` edge function.
- Limits are enforced both client-side (`useSubscription`) and server-side (`_shared/security.ts` → `DAILY_LIMITS` + `checkDailyLimit`).

## Changes

### 1. Client: `src/hooks/useSubscription.ts`
- Remove the combined `DEMO_DAILY_LIMIT = 10` cap and `demoLimitReached` gate.
- When `isDemoAccount(email)` is true, override `dailyLimits` with demo-specific values: `{ single_analysis: 20, comparison_analysis: 10, bulk_analysis: 3 }`.
- Force `canCompare` and `canBulkAnalyze` to `true` for demo users (they're currently blocked because tier = `free`).
- Keep tier display as-is (still shows whatever their subscription row says); demo is a behavioral override, not a tier change.
- Update `dailyAnalysisLimitReached`, `dailyCompareLimitReached`, `dailyBulkLimitReached` to use the demo limits.

### 2. Server: `supabase/functions/_shared/security.ts`
- Add a `DEMO_DAILY_LIMITS` constant: `{ single_analysis: 20, comparison_analysis: 10, bulk_analysis: 3 }`.
- Add helper `isDemoAccountEmail(email)` matching the client allowlist (`c74661985@gmail.com`).
- Modify `checkDailyLimit` signature (or add a sibling `checkDailyLimitForUser`) to accept the user's email, so demo users use `DEMO_DAILY_LIMITS` instead of their tier's limits.

### 3. Edge functions that enforce limits
Update the three functions that currently call `checkDailyLimit` + `getUserTier` to also pass the user's email (available from `supabaseAuth.auth.getUser(token)` → `user.email`):
- `supabase/functions/analyze-startup/index.ts`
- `supabase/functions/compare-startups/index.ts`
- `supabase/functions/analyze-bulk-startups/index.ts` (also relax the hard `tier !== 'scale'` gate so demo accounts pass)

### 4. UI copy
- Remove the "Demo limit reached for today. Sign up…" combined-cap toast/banner since each feature now has its own quota; individual quota-exceeded messages continue to fire per feature.

## Out of scope
- No database schema changes. No new tier. The `subscriptions` table stays as-is.
- Admin behavior unchanged (still full bypass via `check-admin`).
- `DEMO_EMAILS` list unchanged — still just `c74661985@gmail.com`.

## Verification
After approval and implementation, sign in as `c74661985@gmail.com` and confirm:
- Single analysis allowed 20×/day, Compare 10×/day, Bulk 3×/day.
- 21st single analysis returns daily-limit error from the edge function.
- Bulk analysis page no longer shows the upgrade gate.

