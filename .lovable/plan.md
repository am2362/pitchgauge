

# Fix: 401 Unauthorized on Edge Functions

## Root Cause

The `supabase/config.toml` file is missing `verify_jwt = false` for most edge functions. Only `create-checkout`, `check-subscription`, `customer-portal`, and `stripe-webhook` have it set.

With the signing-keys system used by Lovable Cloud, the default `verify_jwt = true` causes the gateway to reject the JWT before the edge function code even executes. The functions already handle auth validation manually in code (checking the Authorization header and calling `getUser()`), so the gateway-level check is redundant and broken.

## Fix

**Single file change: `supabase/config.toml`**

Add `verify_jwt = false` for all five missing functions:
- `analyze-startup`
- `compare-startups`
- `analyze-bulk-startups`
- `generate-bulk-comparison`
- `parse-pdf`

No changes needed to edge function code or frontend code. The auth header is already being passed correctly by the client (`supabase.functions.invoke()` handles this automatically), and the functions already validate the user in code.

