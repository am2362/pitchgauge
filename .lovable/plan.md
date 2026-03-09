

# Manual Email Verification System

## Problem
Lovable Cloud has auto-confirm enabled at the infrastructure level (`immediate_login_after_signup: true`). There is no configuration tool to disable it. The existing `email_confirmed_at` check in ProtectedRoute is bypassed because the auth system auto-confirms users immediately on signup.

## Solution
Implement a custom verification layer using a `user_verifications` table and a `send-verification-email` edge function.

---

## Database Changes

### New table: `user_verifications`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Default `gen_random_uuid()` |
| user_id | uuid | NOT NULL, unique |
| token | uuid | Default `gen_random_uuid()` |
| verified | boolean | Default `false` |
| created_at | timestamptz | Default `now()` |

RLS policies:
- SELECT: authenticated users can read their own row (`auth.uid() = user_id`)
- No INSERT/UPDATE/DELETE from client -- all writes happen via edge function or trigger

### Database trigger
On new user creation (existing `handle_new_user` trigger), also insert a row into `user_verifications` with `verified = false`.

### Security definer function
`is_user_verified(user_id uuid)` -- returns boolean, used by ProtectedRoute to check verification status without RLS recursion issues.

---

## New Edge Function: `send-verification-email`

- Called after signup from the frontend
- Accepts `{ email }` in the body
- Looks up the user's verification token from `user_verifications`
- Sends an email using Lovable AI (or a simple approach: constructs a verification URL and uses Supabase's built-in email capabilities)
- Actually, since we don't have a transactional email service configured, the simplest reliable approach is: **use a verification link that hits another edge function**

### New Edge Function: `verify-email-token`

- Called when user clicks the verification link
- Accepts `?token=<uuid>` as query parameter
- Looks up the token in `user_verifications`, sets `verified = true`
- Redirects to the app's dashboard

---

## Frontend Changes

### ProtectedRoute.tsx
- Instead of checking `user.email_confirmed_at`, query the `user_verifications` table for the current user's `verified` status
- If not verified, redirect to `/verify-email`

### Auth.tsx (signup handler)
- After successful signup, call the `send-verification-email` edge function
- Then navigate to `/verify-email`

### VerifyEmail.tsx
- "Resend" button calls `send-verification-email` edge function instead of `supabase.auth.resend`
- Listen for verification status changes (poll `user_verifications` table periodically or on focus)
- Once verified, redirect to dashboard

### App.tsx
- Add `/verify-callback` route that handles the token verification redirect (or handle inline via query params on `/verify-email`)

---

## Email Delivery Approach

Since no custom email domain or transactional email service is configured, the edge function will use the Lovable AI email capabilities. However, looking at available tools, the simplest approach that works immediately:

**Use the `handle_new_user` trigger to auto-create the verification row, and the edge function sends the email via Supabase's built-in `auth.admin` email or a simple HTTP-based email service.**

Actually, the most pragmatic approach given constraints: The `send-verification-email` edge function will use **Supabase Auth's `admin.generateLink`** method to generate a proper email verification link, which triggers the built-in email sending. This uses the already-configured auth email system.

Revised approach:
1. Edge function uses service role to call `supabase.auth.admin.generateLink({ type: 'signup', email })` to get a verification URL
2. Then uses `supabase.auth.admin.updateUser(userId, { email_confirm: false })` to un-confirm the user
3. This re-triggers the confirmation email flow

**Simplest reliable approach:**

1. After signup, use service role in edge function to call `auth.admin.updateUser(userId, { email_confirm: false })` -- this un-confirms the auto-confirmed user
2. Then call `auth.admin.generateLink({ type: 'signup', email, options: { redirectTo } })` to generate and send the confirmation email
3. The existing `email_confirmed_at` check in ProtectedRoute then works correctly
4. When user clicks the link, Supabase confirms the email and `email_confirmed_at` gets set

This avoids needing a custom verification table entirely and works with the existing ProtectedRoute logic.

---

## Revised Plan (Simpler)

### New Edge Function: `send-verification-email`
- `verify_jwt = false` in config.toml
- Accepts POST with `{ userId, email }` and Authorization header
- Uses service role key to:
  1. `auth.admin.updateUser(userId, { email_confirm: false })` -- revoke auto-confirm
  2. `auth.admin.generateLink({ type: 'signup', email, options: { redirectTo } })` -- generate verification link
  3. Send the link via a simple email (or rely on Supabase's built-in email if `generateLink` triggers it)
- Returns success/failure

**Issue:** `generateLink` returns the link but doesn't send it. We need to actually send the email. Without a configured email service, we need another approach.

---

## Final Revised Plan (Database-based verification)

Since sending custom emails requires infrastructure we don't have configured, use a **database-based verification with OTP code** approach:

### 1. Database migration
- Create `user_verifications` table (user_id, token, verified, created_at)
- Modify `handle_new_user` trigger to also insert into `user_verifications`
- Create `is_user_verified` security definer function
- RLS: users can SELECT their own row

### 2. Edge function: `send-verification-email`
- Uses service role to get the user's verification token
- Uses Lovable AI to send a simple email with the verification link
- The link points to: `{origin}/verify-email?token={token}`

### 3. Edge function: `verify-email-token`  
- Accepts GET with `?token=` query param
- Updates `user_verifications` set `verified = true` where `token` matches
- Returns redirect HTML to `/dashboard`

### 4. Frontend changes

**ProtectedRoute.tsx:**
- Query `user_verifications` table for current user
- If `verified = false`, redirect to `/verify-email`
- Cache result in state to avoid repeated queries

**Auth.tsx:**
- After signup, call `send-verification-email` edge function
- Navigate to `/verify-email`

**VerifyEmail.tsx:**
- Handle `?token=` query param: call `verify-email-token` edge function, then redirect to dashboard
- "Resend" calls `send-verification-email` again
- Poll `user_verifications` periodically to detect verification

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `user_verifications` table, update `handle_new_user` trigger, create `is_user_verified` function |
| `supabase/functions/send-verification-email/index.ts` | Create -- sends verification email via Lovable AI |
| `supabase/functions/verify-email-token/index.ts` | Create -- verifies token and marks user verified |
| `supabase/config.toml` | Add entries for new functions with `verify_jwt = false` |
| `src/components/ProtectedRoute.tsx` | Check `user_verifications` table instead of `email_confirmed_at` |
| `src/pages/Auth.tsx` | Call send-verification-email after signup |
| `src/pages/VerifyEmail.tsx` | Handle token verification, resend via edge function, poll for status |

