

# Replace Logo with New Transparent Version

## Current State
- Logo at `src/assets/logo.png` has a light gray background
- Favicon at `public/favicon.png` has transparency but is the old version
- User uploaded new transparent logo: `user-uploads://1af8dfa6-4b71-4792-8eca-d656687718e5-removebg-preview.png`

## Changes

### 1. Replace logo in src/assets
Copy `user-uploads://1af8dfa6-4b71-4792-8eca-d656687718e5-removebg-preview.png` → `src/assets/logo.png`

This will automatically update all locations that import the logo:
- `src/components/AppNavbar.tsx`
- `src/components/DemoNav.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Landing.tsx`
- `src/pages/ScoringRubric.tsx`

### 2. Replace favicon
Copy `user-uploads://1af8dfa6-4b71-4792-8eca-d656687718e5-removebg-preview.png` → `public/favicon.png`

This updates the browser tab icon (already linked in `index.html` line 5).

## Result
The new transparent gauge logo will appear in all navigation headers, auth pages, and as the browser favicon.

