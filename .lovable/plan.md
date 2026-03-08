

# Ensure All Analyses Save to History and Can Be Retrieved

## Current State

| Feature | Auto-saves? | In History page? | Can view/restore? |
|---------|------------|------------------|-------------------|
| Single Analysis (Index) | Yes, auto-saves after analyze | Yes (Analyses tab) | No -- only export/delete |
| Comparison (Compare) | Manual "Save" button | Yes (Comparisons tab) | No -- only export/delete |
| Bulk Analysis (BulkAnalysis) | Yes, to `bulk_analyses` table | **No -- missing from History** | No |

## Gaps to Fix

1. **Bulk analyses are not shown in History page** -- the `bulk_analyses` table is never queried on the History page
2. **No "View" action on any history item** -- users can only export PDF or delete, but cannot view/restore the full analysis details
3. **Comparison auto-save** -- comparisons require a manual "Save" click; consider auto-saving after generation

## Plan

### 1. Add Bulk Analyses tab to History page (`src/pages/History.tsx`)
- Add a `BulkAnalysisHistory` interface matching the `bulk_analyses` table schema
- Load `bulk_analyses` in `loadHistory()` alongside the other two queries
- Add a third tab "Bulk Analyses" showing batch name, date, startup count, status, and score summary
- Support delete and export (reuse existing `exportBulkAnalysisToExcel`)
- Support search filtering on batch name

### 2. Add "View" buttons to all history items (`src/pages/History.tsx`)
- **Single Analyses**: Add an Eye/View icon button that opens a Dialog showing the full analysis (scorecard, memo, red flags, follow-up questions, investment thesis, benchmarking) -- similar to how Index.tsx renders results
- **Comparisons**: Add a View button that opens a Dialog showing the full comparison (rankings, insights, detailed scores, strengths/weaknesses) -- reuse Compare page's dialog layout
- **Bulk Analyses**: Add a View button that navigates to `/bulk-analysis` with state, or opens a dialog with rankings table

### 3. Auto-save comparisons after generation (`src/pages/Compare.tsx`)
- Call `saveComparison()` automatically after `generateComparisonInsights()` completes successfully, so users don't lose results if they forget to click Save
- Keep the manual Save button for re-saving updated results

### Files to modify
- **`src/pages/History.tsx`** -- Major changes: add bulk analyses loading, add View dialogs for all three types, add third tab
- **`src/pages/Compare.tsx`** -- Minor: auto-save after comparison generation

