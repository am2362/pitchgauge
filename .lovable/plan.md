

# Magic Link Authentication

## Overview
Replace the email/password auth flow with magic link auth. This eliminates passwords entirely and solves the email verification problem — users prove email ownership by clicking the link.

## Changes

### 1. Rewrite `src/pages/Auth.tsx`
- Remove all password fields, full name field, tabs (sign in/sign up), and related validation
- Single form: email input + "Send Magic Link" button
- Call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin + '/dashboard' } })`
- On success, show inline confirmation: "Check your email — we've sent you a login link" with a resend option
- Remove imports for Tabs, z/zod password schema, etc.

### 2. Simplify `src/components/ProtectedRoute.tsx`
- Remove the `user_verifications` table check entirely — magic link auth inherently verifies email
- Keep only: check if user exists → if not, redirect to `/auth`
- Remove the `verified` state and second `useEffect`

### 3. Update `src/App.tsx`
- Remove the `/verify-email` route (no longer needed)
- Remove the `VerifyEmail` import

### 4. Clean up unused files
- `src/pages/VerifyEmail.tsx` — no longer needed
- `supabase/functions/send-verification-email/index.ts` — no longer needed
- `supabase/functions/verify-email-token/index.ts` — no longer needed

### 5. Handle magic link callback
The magic link redirects to `/dashboard` with auth tokens in the URL hash. The existing `supabase.auth.onAuthStateChange` listener in ProtectedRoute will pick up the session automatically. No additional callback handling needed.

## Files to modify
| File | Action |
|------|--------|
| `src/pages/Auth.tsx` | Rewrite — magic link only UI |
| `src/components/ProtectedRoute.tsx` | Simplify — remove verification check |
| `src/App.tsx` | Remove `/verify-email` route |
| `src/pages/VerifyEmail.tsx` | Delete |
| `supabase/functions/send-verification-email/index.ts` | Delete |
| `supabase/functions/verify-email-token/index.ts` | Delete |

