

# Change Free Tier Limit from 3/day to 3/month

## Summary
The free tier currently limits users to 3 analyses **per day**. This needs to change to 3 analyses **per month** across the entire stack.

## Changes

### 1. Database function — replace `get_daily_usage_count` with `get_monthly_usage_count`
Create a new migration that:
- Creates `get_monthly_usage_count(p_action_type text)` — same logic but filters `created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')` instead of the current day.
- The old function can remain (harmless) but we'll stop calling it.

### 2. `src/hooks/useSubscription.ts`
- Rename all `daily*` references to `monthly*` (`dailyAnalysisCount` → `monthlyAnalysisCount`, `dailyAnalyses` → `monthlyAnalyses`, etc.)
- Call `get_monthly_usage_count` RPC instead of `get_daily_usage_count`
- Update `TIER_LIMITS.free` to `{ monthlyAnalyses: 3, ... }`
- Update exported property names accordingly

### 3. `src/pages/Billing.tsx`
- Change "Daily Analyses Used" → "Monthly Analyses Used"
- Reference `monthlyAnalysisCount` instead of `dailyAnalysisCount`

### 4. `src/pages/Settings.tsx`
- Same label/variable rename as Billing

### 5. `src/pages/Dashboard.tsx`
- Change toast from "Daily Limit Reached" / "today" → "Monthly Limit Reached" / "this month"

### 6. `src/pages/Landing.tsx` (line 280)
- Change `"3 single analyses/day"` → `"3 single analyses/month"`

### 7. All consumers of `useSubscription`
Update any destructured `dailyAnalysisCount` to `monthlyAnalysisCount`. Affected files: Billing, Settings, Dashboard, and any other pages referencing it.

