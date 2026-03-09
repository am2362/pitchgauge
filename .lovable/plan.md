

## Auth Flow Overhaul: Email/Password + Magic Link with Verification

### Overview
Refactor the auth page to support email/password as the primary method with magic link as secondary. Enforce email verification for password signups, with a demo account bypass for `c74661985@gmail.com`.

### Demo Account
- **Email**: `c74661985@gmail.com` — bypasses email verification, can log in with password directly.

### Files to Create/Modify

#### 1. `src/lib/demo-accounts.ts` (new)
- Export `DEMO_EMAILS` array containing `c74661985@gmail.com`
- Export `isDemoAccount(email: string): boolean` helper

#### 2. `src/pages/Auth.tsx` (rewrite)
- **Default view**: Email/password form with toggle between "Sign Up" and "Sign In" modes
- **Sign In**: `supabase.auth.signInWithPassword({ email, password })`
- **Sign Up**: `supabase.auth.signUp({ email, password })`, then immediately call `supabase.auth.signInWithOtp({ email })` to send verification email, then navigate to `/verify-email`
- **Demo account exception**: On sign-up for demo emails, skip OTP and navigate directly to dashboard
- **Secondary option**: "Or send me a magic link" button below the form, which sends OTP as before
- **Google sign-in**: Keep existing button at top
- Password field with show/hide toggle
- "Forgot password" link (calls `resetPasswordForEmail`)

#### 3. `src/pages/VerifyEmail.tsx` (new)
- "Check your email" confirmation page
- Shows the email address used during signup
- "Resend verification email" button
- "Use a different email" button → navigates back to `/auth`
- Accessible without authentication

#### 4. `src/pages/ResetPassword.tsx` (new)
- Form to set a new password after clicking reset link
- Checks for `type=recovery` in URL hash
- Calls `supabase.auth.updateUser({ password })`
- Public route

#### 5. `src/components/ProtectedRoute.tsx` (modify)
- After confirming user is authenticated, check `user.email_confirmed_at`
- If `email_confirmed_at` is null/undefined AND email is NOT in `DEMO_EMAILS`, redirect to `/verify-email`
- Demo accounts bypass this check entirely

#### 6. `src/App.tsx` (modify)
- Add routes: `/verify-email` → `<VerifyEmail />`, `/reset-password` → `<ResetPassword />`
- Both are public routes (not wrapped in `ProtectedRoute`)

### Auth Flow Diagrams

```text
PASSWORD SIGNUP:
  Auth page → signUp() → signInWithOtp() → /verify-email
  User clicks email link → email_confirmed_at set → /dashboard

PASSWORD LOGIN:
  Auth page → signInWithPassword() → ProtectedRoute checks email_confirmed_at
  If confirmed → /dashboard
  If not confirmed → /verify-email

MAGIC LINK:
  Auth page → signInWithOtp() → "Check email" UI
  User clicks link → auto-verified → /dashboard

DEMO ACCOUNT (c74661985@gmail.com):
  Auth page → signInWithPassword() → skip verification → /dashboard

GOOGLE:
  Auth page → OAuth → auto-verified → /dashboard
```

### Technical Notes
- `email_confirmed_at` is set automatically by Supabase when a user clicks a magic link or verifies email
- The `signUp` call creates the user; the immediate `signInWithOtp` sends a clickable verification link
- No database changes needed — `email_confirmed_at` is already on `auth.users`
- Email auto-confirm must remain **disabled** (current default) for this flow to work

