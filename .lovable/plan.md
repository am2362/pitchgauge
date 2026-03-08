

# Replace TrendingUp Icon with Custom Gauge Logo

## Overview
Replace the TrendingUp arrow icon with the uploaded gauge image across all branding locations (navigation headers, auth page, footer).

## Changes Required

### 1. Copy logo asset
Copy `user-uploads://1af8dfa6-4b71-4792-8eca-d656687718e5.jpg` → `src/assets/logo.png`

### 2. Update components/pages (6 locations)

**DemoNav.tsx** (line 22):
- Remove `TrendingUp` from imports (line 4)
- Replace `<TrendingUp className="h-6 w-6 text-primary" />` with `<img src={logo} alt="PitchGauge" className="h-6 w-6" />`
- Add import: `import logo from "@/assets/logo.png"`

**AppNavbar.tsx** (line 46):
- Remove `TrendingUp` from imports (line 15)
- Replace `<TrendingUp className="h-6 w-6 text-primary" />` with `<img src={logo} alt="PitchGauge" className="h-6 w-6" />`
- Add import: `import logo from "@/assets/logo.png"`

**Auth.tsx** (line 125):
- Remove `TrendingUp` from imports
- Replace `<TrendingUp className="h-10 w-10 text-primary" />` with `<img src={logo} alt="PitchGauge" className="h-10 w-10" />`
- Add import: `import logo from "@/assets/logo.png"`

**ScoringRubric.tsx** (line 75):
- Remove `TrendingUp` from imports
- Replace `<TrendingUp className="h-6 w-6 text-primary" />` with `<img src={logo} alt="PitchGauge" className="h-6 w-6" />`
- Add import: `import logo from "@/assets/logo.png"`

**Landing.tsx** (lines 43, 379):
- Remove `TrendingUp` from imports
- Replace both instances:
  - Line 43: `<img src={logo} alt="PitchGauge" className="h-6 w-6" />`
  - Line 379: `<img src={logo} alt="PitchGauge" className="h-5 w-5" />`
- Add import: `import logo from "@/assets/logo.png"`

## Result
All branding locations will display the gauge icon, maintaining consistent brand identity across the application.

