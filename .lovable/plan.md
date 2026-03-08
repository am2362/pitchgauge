

# Rate Limiting Audit

## Current State — Already Implemented

The rate limiting system is **already in place** across both frontend and backend:

### Frontend (`useSubscription.ts`)
- `TIER_LIMITS` defines: Free = 3/day, Pro = unlimited single, Scale = unlimited everything
- `canAnalyze` flag blocks free users after 3 daily analyses
- `canCompare` is `false` for free tier, `true` for pro/scale
- `canBulkAnalyze` is `false` for free/pro, `true` for scale only
- `remainingAnalyses` tracks remaining count for UI display
- `recordUsage()` increments counter after each analysis

### Frontend enforcement (pages)
- **Dashboard.tsx**: Checks `canAnalyze` before calling `analyze-startup`; shows toast "Daily Limit Reached" with upgrade message; displays remaining count
- **Compare.tsx**: Uses `UpgradePrompt` component when `!canCompare` (free tier blocked)
- **BulkAnalysis.tsx**: Uses `UpgradePrompt` component when `!canBulkAnalyze` (free/pro blocked)

### Backend
- `get_daily_usage_count` RPC counts today's usage per user (security definer, uses `auth.uid()`)
- `usage_tracking` table records each action with RLS

## What Could Be Improved

The current implementation is **client-side only** — the edge functions (`analyze-startup`, `compare-startups`, `analyze-bulk-startups`) do **not** check usage limits server-side. A determined user could bypass the frontend and call the edge functions directly.

### Recommendation
If you want **strict** server-side enforcement, I would add usage checks inside the edge functions themselves. However, for most use cases the current client-side gating is sufficient since the functions require authentication.

## Summary
**Yes, this is already implemented.** Free = 3 analyses/day (blocked with toast), Pro = unlimited single + compare, Scale = unlimited everything. The upgrade prompt and remaining count display are working. The only gap is server-side enforcement in edge functions.

