

# Add Subscription Tiers & Usage Tracking

## Context
The project already has Lovable Cloud (backend) with authentication, profiles, and analysis tables. What's needed: subscription management and usage tracking to enforce the Free/Pro/Scale tiers shown on the landing page.

## Database Changes (2 new tables + 1 migration)

### 1. `subscriptions` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid NOT NULL | references auth.users, unique |
| tier | text NOT NULL | 'free', 'pro', 'scale'; default 'free' |
| status | text NOT NULL | 'active', 'canceled', 'expired'; default 'active' |
| current_period_start | timestamptz | |
| current_period_end | timestamptz | |
| created_at / updated_at | timestamptz | |

RLS: users can SELECT their own row. INSERT/UPDATE restricted to service role (managed by backend). Auto-create a `free` subscription row via the existing `handle_new_user` trigger.

### 2. `usage_tracking` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | |
| action_type | text NOT NULL | 'single_analysis', 'comparison', 'bulk_analysis' |
| created_at | timestamptz | default now() |
| metadata | jsonb | optional details |

RLS: users can SELECT and INSERT their own rows.

### 3. Database function: `get_daily_usage_count(p_action_type text)`
Returns the count of actions for the current user today. Used by the frontend to check limits before invoking analysis.

### 4. Update `handle_new_user` trigger
Add INSERT into `subscriptions` with tier='free' when a new user signs up.

## Frontend Changes

### `src/hooks/useSubscription.ts` (new)
Custom hook that fetches the user's subscription tier and daily usage counts. Exposes `tier`, `canAnalyze`, `canCompare`, `canBulkAnalyze`, and `recordUsage()`.

### `src/pages/Dashboard.tsx`
- Import `useSubscription`
- Before analysis, check `canAnalyze`; show upgrade prompt if limit reached
- After successful analysis, call `recordUsage('single_analysis')`
- Show current tier badge in header

### `src/pages/Compare.tsx`
- Gate comparison behind Pro/Scale tier
- Record usage on comparison generation

### `src/pages/BulkAnalysis.tsx`
- Gate bulk analysis behind Scale tier
- Record usage on bulk processing

### `src/pages/Settings.tsx`
- Add a "Subscription" section showing current tier, usage stats, and upgrade CTA

## Tier Limits (enforced client-side + edge function validation)

| Feature | Free | Pro ($29/mo) | Scale ($89/mo) |
|---------|------|-------------|----------------|
| Single analyses/day | 3 | Unlimited | Unlimited |
| Comparison mode | No | Yes (up to 5) | Yes (up to 5) |
| Bulk analysis | No | No | Yes (up to 100) |
| History retention | None | 30 days | Unlimited |
| Export formats | Basic JSON+PDF | Full | Full + Excel |

## Files to Create/Modify
- **Migration SQL** — create `subscriptions`, `usage_tracking` tables, `get_daily_usage_count` function, update trigger
- **`src/hooks/useSubscription.ts`** — new hook
- **`src/pages/Dashboard.tsx`** — usage gating + tier badge
- **`src/pages/Compare.tsx`** — tier gating
- **`src/pages/BulkAnalysis.tsx`** — tier gating
- **`src/pages/Settings.tsx`** — subscription info section

