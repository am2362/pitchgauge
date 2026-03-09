

# Email Verification Plan

## What Changes

### 1. Disable auto-confirm on signup
Currently after signup the user is immediately redirected to `/dashboard`. Email confirmation must be required. Use the auth configuration to ensure `enable_confirmations = true` (this is the default in Supabase -- the current signup flow just navigates to dashboard without checking confirmation status).

### 2. Create `/verify-email` page (`src/pages/VerifyEmail.tsx`)
- Shows message: "Please check your email and click the confirmation link to activate your account."
- Displays the email address used during signup (passed via route state or retrieved from session)
- "Resend confirmation email" button that calls `supabase.auth.resend({ type: 'signup', email })`
- "Back to Sign In" link
- Styled consistently with the Auth page (gradient background, logo, Card)
- If user is already confirmed and logged in, redirect to `/dashboard`

### 3. Update Auth.tsx signup handler
- After successful signup, redirect to `/verify-email` instead of `/dashboard`
- Pass the email via React Router state so the verify page can display it and use it for resend
- Update success toast: "Check your email to verify your account"

### 4. Update ProtectedRoute to check email confirmation
- After confirming user exists, check `user.email_confirmed_at`
- If user is authenticated but email is not confirmed, redirect to `/verify-email`
- This prevents unverified users from accessing any protected route

### 5. Add route in App.tsx
- Add `/verify-email` route (public, not behind ProtectedRoute)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/VerifyEmail.tsx` | **Create** -- verification pending page with resend button |
| `src/pages/Auth.tsx` | Modify -- redirect signup to `/verify-email`, pass email in state |
| `src/components/ProtectedRoute.tsx` | Modify -- check `email_confirmed_at`, redirect unverified to `/verify-email` |
| `src/App.tsx` | Modify -- add `/verify-email` route |

