

# Stripe Subscription Integration Plan

## Overview
Wire up Stripe Checkout, subscription verification, and customer portal using the existing secrets (`STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SCALE_PRICE_ID`). The user already has a `subscriptions` table and `useSubscription` hook — we'll enhance rather than replace.

## Edge Functions (3 new)

### 1. `create-checkout/index.ts`
- Accepts `{ priceId }` from body
- Authenticates user via Bearer token
- Finds or creates Stripe customer by email
- Creates a `checkout.sessions.create` with `mode: "subscription"`, passing `metadata: { user_id, tier }` (derive tier from priceId match)
- Success URL: `{origin}/dashboard?checkout=success`, Cancel URL: `{origin}/settings`

### 2. `check-subscription/index.ts`
- Authenticates user, looks up Stripe customer by email
- Checks for active subscription, maps price ID to tier (`STRIPE_PRO_PRICE_ID` → "pro", `STRIPE_SCALE_PRICE_ID` → "scale")
- Updates `subscriptions` table (tier, status, current_period_start/end) using service role key
- Returns `{ subscribed, tier, subscription_end }`

### 3. `customer-portal/index.ts`
- Authenticates user, finds Stripe customer
- Creates billing portal session, returns `{ url }`

All three: `verify_jwt = false` in config.toml, CORS headers, Stripe `2025-08-27.basil`.

## Frontend Changes

### `useSubscription.ts` — Refactor to call `check-subscription`
- On mount and every 60s, invoke `check-subscription` edge function
- This syncs the DB tier from Stripe's source of truth
- Keep existing DB query as fallback, add `subscriptionEnd` to state

### `src/lib/stripe.ts` — Helper constants
```typescript
export const TIER_CONFIG = {
  pro: { priceId: "from STRIPE_PRO_PRICE_ID secret", label: "Pro", price: "$29/mo" },
  scale: { priceId: "from STRIPE_SCALE_PRICE_ID secret", label: "Scale", price: "$89/mo" },
};
```
Note: Price IDs are stored as backend secrets, so the frontend will pass tier name to `create-checkout`, and the edge function resolves the price ID from env.

### Upgrade flow (all pages)
- `create-checkout` is invoked with `{ tier: "pro" | "scale" }`, edge function reads the matching price ID from secrets
- Opens returned URL in new tab

### Page-level paywalls
- **Dashboard (Page 1)**: Already gated — keep usage counter "2/3 analyses used today" for free users
- **Compare (Page 2)**: Free users see locked overlay with "Upgrade to Pro" button. Pro users: full access (up to 5). Scale: full.
- **BulkAnalysis (Page 3)**: Free + Pro users see locked overlay. Scale: full access.

### `/billing` page (new)
- Route: `/billing`
- Shows current plan badge, next billing date (from `subscriptionEnd`), usage stats
- "Manage Subscription" button → calls `customer-portal` edge function → opens portal URL
- "Upgrade" buttons for lower tiers

### Settings page updates
- Replace current upgrade buttons with proper Stripe checkout triggers
- Add link to `/billing` page

### Landing page pricing buttons
- Wire "Start Pro Trial" / "Start Scale Trial" to navigate to `/auth` (if not logged in) or trigger checkout (if logged in)

### Navigation
- Add "Billing" link in Dashboard header nav and Settings page

## Database
- No schema changes needed — existing `subscriptions` table has `tier`, `status`, `current_period_start`, `current_period_end` columns
- `check-subscription` edge function updates this table via service role key
- Add UPDATE RLS policy or use service role (edge function already uses service role)

## Config Changes
- `supabase/config.toml`: Add `verify_jwt = false` for all 3 new functions

## File Summary
| File | Action |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Create |
| `supabase/functions/check-subscription/index.ts` | Create |
| `supabase/functions/customer-portal/index.ts` | Create |
| `supabase/config.toml` | Update (add function configs) |
| `src/hooks/useSubscription.ts` | Update (add Stripe sync) |
| `src/pages/Billing.tsx` | Create |
| `src/pages/Settings.tsx` | Update (wire upgrade buttons) |
| `src/pages/Landing.tsx` | Update (wire pricing CTAs) |
| `src/pages/Compare.tsx` | Update (add paywall overlay) |
| `src/pages/BulkAnalysis.tsx` | Update (add paywall overlay) |
| `src/pages/Dashboard.tsx` | Update (add Billing nav link, checkout success toast) |
| `src/App.tsx` | Update (add /billing route) |
| `src/components/UpgradePrompt.tsx` | Create (reusable locked banner component) |

