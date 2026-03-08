

# Create Stripe Webhook Edge Function

## Problem
1. No `stripe-webhook` edge function exists yet.
2. The `check-subscription` function intermittently returns `{"error":"Invalid time value"}` -- likely because the Stripe API version `2025-08-27.basil` returns `current_period_end` in a different format (ISO string instead of unix timestamp), causing `new Date(subscription.current_period_end * 1000)` to fail.

## Plan

### 1. Create `supabase/functions/stripe-webhook/index.ts`
- Reads raw request body and `stripe-signature` header
- Verifies signature using `STRIPE_WEBHOOK_SECRET`
- Handles `checkout.session.completed` event:
  - Extracts `user_id` and `tier` from session metadata (set during checkout)
  - Updates the `subscriptions` table with the new tier, status, and period dates
- Handles `customer.subscription.deleted` to reset tier to `free`
- Returns 200 for unhandled event types

### 2. Add webhook config to `supabase/config.toml`
```toml
[functions.stripe-webhook]
verify_jwt = false
```

### 3. Fix `check-subscription` "Invalid time value" bug
- The Stripe API version `2025-08-27.basil` may return `current_period_end` as an ISO string or different type
- Add a safe date conversion: check if the value is a number (unix seconds) or string before converting
- Wrap the date conversion in try/catch to prevent the entire function from crashing

## Technical Details

The webhook function will:
- Use `stripe.webhooks.constructEventAsync()` for signature verification
- Use `supabaseAdmin` (service role) to update the `subscriptions` table (since users can't UPDATE it via RLS)
- Map price IDs to tiers using `STRIPE_PRO_PRICE_ID` and `STRIPE_SCALE_PRICE_ID` env vars
- For `checkout.session.completed`: retrieve the full subscription from Stripe to get period dates, then upsert into `subscriptions`

