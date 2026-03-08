

# Enhance Auth, History, and Navigation

## What Already Exists
- Email/password auth (signup + login) at `/auth`
- Per-page auth guards redirecting to `/auth`
- History page with search, tabs (single/comparison/bulk), view/delete/export
- Analysis results saved to DB with user_id
- RLS on all tables
- Subscription tier tracking (free/pro/scale)

## What Needs to Be Built

### 1. Create shared AppNavbar component (`src/components/AppNavbar.tsx`)
- Horizontal top nav bar used across all authenticated pages
- Left: PitchGauge logo + title linking to `/dashboard`
- Center: nav links -- Single Analysis (`/dashboard`), Comparison (`/compare`), Bulk (`/bulk-analysis`), History (`/history`)
- Right: Account dropdown (using DropdownMenu) showing:
  - User email (from auth session)
  - Plan badge (Free/Pro/Scale from `useSubscription`)
  - "Billing" link to `/billing`
  - "Settings" link to `/settings`
  - "Logout" button

### 2. Create ProtectedRoute wrapper (`src/components/ProtectedRoute.tsx`)
- Wraps authenticated routes in `App.tsx`
- Checks `supabase.auth.getSession()` and listens to `onAuthStateChange`
- Redirects to `/auth` if not logged in
- Provides user context to children

### 3. Update route redirects in `App.tsx`
- Landing page (`/`): if logged in, redirect to `/dashboard`
- Auth page (`/auth`): already redirects to `/dashboard` if logged in (exists)

### 4. Add free tier history limits to History page
- Import `useSubscription` hook
- Free tier: show only first 5 items per tab; render remaining items with blur overlay + "Upgrade for full history" CTA
- Pro/Scale: show all items with pagination (20 per page) using existing Pagination components

### 5. Remove duplicate nav from individual pages
- Dashboard: remove the header nav buttons (Compare, History, Bulk, Billing, Scoring Rubric, Settings, Logout) since AppNavbar handles it; keep the title/subtitle section
- History, Compare, BulkAnalysis, Settings, Billing, ScoringRubric: remove back-arrow buttons, wrap with AppNavbar

### Files to create
- `src/components/AppNavbar.tsx` -- shared nav bar with account dropdown
- `src/components/ProtectedRoute.tsx` -- auth guard wrapper

### Files to modify
- `src/App.tsx` -- wrap authenticated routes with ProtectedRoute, add redirect logic on `/`
- `src/pages/Dashboard.tsx` -- remove inline nav buttons, use AppNavbar
- `src/pages/History.tsx` -- add free tier limit (5 items + blur), pagination for pro/scale, use AppNavbar
- `src/pages/Compare.tsx` -- replace back button with AppNavbar
- `src/pages/BulkAnalysis.tsx` -- replace back button with AppNavbar
- `src/pages/Settings.tsx` -- replace back button with AppNavbar
- `src/pages/Billing.tsx` -- replace back button with AppNavbar
- `src/pages/ScoringRubric.tsx` -- replace back button with AppNavbar

