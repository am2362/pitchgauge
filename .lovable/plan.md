

# Polish Audit — What's Done vs. Not Done

## 1. Sticky top nav on landing page ✅ DONE
Already implemented in `Landing.tsx` (line 36): `<nav className="sticky top-0 z-50 ...">` with Logo, nav links (How It Works, Features, Pricing, Scoring Guide), Login and Get Started buttons.

## 2. Loading skeleton states ❌ NOT DONE
The `Skeleton` component exists in `src/components/ui/skeleton.tsx` but is **not used** on any analysis page (Dashboard, Compare, BulkAnalysis). No skeleton loading states are rendered while results load.

## 3. Progress indicator on Single Analysis page ⚠️ PARTIAL
- PDF upload has a progress string (`pdfProgress` state: "Uploading PDF...", "Extracting text from PDF...").
- But during the **AI analysis** itself (`isAnalyzing` state), there's just a `Loader2` spinner with no multi-step progress indicator ("Analysing pitch... Scoring criteria... Generating report...").

## 4. Demo mode ✅ DONE
Full demo mode exists: `/demo` page with pre-filled pitch data (`DEMO_ANALYSIS_RESULT`, `DEMO_PITCH_TEXT`), PDF upload simulation with animated steps, `DemoBanner`, `DemoNav`. Landing page has a "Try Demo" button linking to `/demo`. Also `/demo/compare` and `/demo/bulk`.

## 5. Toast notification system ✅ DONE
Toast notifications already in place for: analysis complete, PDF parsed, template loaded, analysis failed, file errors, daily limit reached. The toast system (`useToast` + `Toaster`) is wired up across all pages.

## 6. Scorecard score count-up animation ❌ NOT DONE
No count-up animation exists. Scores render statically when results load.

## 7. Export as PDF on comparison page ✅ DONE
`Compare.tsx` imports and uses `exportComparisonToPDF` from `pdf-export.ts`. The export button is wired up.

## 8. SEO meta titles/descriptions ❌ NOT DONE
No `document.title` setting, no `<Helmet>`, no meta description management on any page. The `index.html` has a static title "PitchGauge" but no per-page SEO.

---

# Implementation Plan — Remaining Items

### A. Add skeleton loading states to analysis pages
- **Dashboard.tsx**: When `isAnalyzing` is true and `result` is null, show skeleton cards for scorecard, memo, and red flags sections
- **Compare.tsx**: Show skeleton cards per pitch slot while `loading` is true
- **BulkAnalysis.tsx**: Show skeleton rows in the rankings table while processing

### B. Add multi-step progress indicator during analysis
- In `Dashboard.tsx`, replace the simple spinner during `isAnalyzing` with an animated stepper: "Analysing pitch...", "Scoring criteria...", "Generating report..." using timed intervals (similar to Demo.tsx's `PDF_STEPS` pattern)

### C. Add scorecard count-up animation
- Create a small `useCountUp` hook (or inline `useEffect` + `useState`) that animates from 0 to the target score over ~800ms using `requestAnimationFrame`
- Apply to all score displays in Dashboard.tsx, Demo.tsx, Compare.tsx, and DemoCompare.tsx scorecard sections

### D. Add per-page SEO meta titles/descriptions
- Create a lightweight `usePageMeta(title, description)` hook that sets `document.title` and updates/creates `<meta name="description">` on mount
- Apply to each page:
  - `/` → "PitchGauge | AI Startup Pitch Analyzer for Investors"
  - `/scoring-rubric` → "Scoring Methodology | PitchGauge"
  - `/auth` → "Sign In | PitchGauge"
  - `/dashboard` → "Dashboard | PitchGauge"
  - `/compare` → "Compare Startups | PitchGauge"
  - `/bulk-analysis` → "Bulk Analysis | PitchGauge"
  - `/history` → "History | PitchGauge"
  - `/billing` → "Billing | PitchGauge"
  - `/settings` → "Settings | PitchGauge"
  - `/demo` → "Demo | PitchGauge"

Note: The user mentioned `/pricing` and `/scoring-guide` routes but these don't exist as standalone pages — pricing is a section on the landing page, and the scoring guide is at `/scoring-rubric`.

### Files to create/modify
1. **Create** `src/hooks/usePageMeta.ts` — lightweight hook
2. **Create** `src/hooks/useCountUp.ts` — count-up animation hook
3. **Modify** `src/pages/Dashboard.tsx` — add skeletons, multi-step progress, count-up, page meta
4. **Modify** `src/pages/Compare.tsx` — add skeletons, count-up, page meta
5. **Modify** `src/pages/BulkAnalysis.tsx` — add skeletons, page meta
6. **Modify** `src/pages/Landing.tsx` — add page meta
7. **Modify** `src/pages/Demo.tsx` — add count-up, page meta
8. **Modify** `src/pages/DemoCompare.tsx` — add count-up, page meta
9. **Modify** remaining pages (Auth, History, Settings, Billing, ScoringRubric) — add page meta

