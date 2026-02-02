
# Fix Historical Analysis Display and Add Pitch Summary Export

## Overview

This plan addresses two issues:
1. Historical analyses show incorrect extracted pitch summaries because they aren't persisted to the database
2. Users cannot download the extracted pitch summary as PDF or JSON

## Problem Analysis

Currently when a PDF pitch deck is uploaded:
- The extracted pitch summary and slides are stored only in React state
- This data is NOT saved to the database alongside the analysis
- When viewing historical analyses, stale/incorrect extracted summaries may appear
- There's no way to export the extracted pitch summary

## Changes Required

### 1. Update `saveAnalysis()` in `Index.tsx`

Save the extracted pitch summary and slides to the `metadata` JSONB column:

```text
Current: metadata is not populated
After: metadata = {
  extractedPitchSummary: "...",
  extractedSlides: [...],
  sourceType: "pdf" | "text"
}
```

### 2. Update `HistoryItem` Interface in `Index.tsx`

Add `metadata` field to include the extracted pitch data and source type.

### 3. Update `viewHistoricalAnalysis()` in `Index.tsx`

When loading a historical analysis:
- If `metadata.sourceType === "pdf"` and `metadata.extractedPitchSummary` exists, restore it
- Otherwise, clear the extracted pitch summary state (for text-based analyses)

This ensures the UI shows the correct extracted summary for PDF-based analyses and hides it for text-based ones.

### 4. Add Export Buttons to `ExtractedPitchSummary` Component

Add two export options:
- **Export as JSON**: Download pitch summary + slides as structured JSON
- **Export as PDF**: Generate PDF with executive summary and slide breakdown

### 5. Create Export Function in `pdf-export.ts`

Add a new function `exportPitchSummaryToPDF()` that generates a formatted PDF containing:
- Executive Summary section with the pitch summary text
- Slide-by-slide breakdown (if slides are available)

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Update `HistoryItem` interface, `saveAnalysis()`, and `viewHistoricalAnalysis()` |
| `src/components/ExtractedPitchSummary.tsx` | Add export buttons for PDF and JSON |
| `src/lib/pdf-export.ts` | Add `exportPitchSummaryToPDF()` function |

## Data Flow

```text
PDF Upload Flow:
┌─────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────┐
│  PDF    │───▶│ parse-pdf    │───▶│ pitchSummary +  │───▶│ metadata │
│  File   │    │ edge func    │    │ slides          │    │ column   │
└─────────┘    └──────────────┘    └─────────────────┘    └──────────┘

History Load Flow:
┌──────────────┐    ┌─────────────────────────┐    ┌───────────────────────┐
│ Click        │───▶│ Check metadata.         │───▶│ Show/Hide Extracted   │
│ History Item │    │ sourceType              │    │ Pitch Summary         │
└──────────────┘    └─────────────────────────┘    └───────────────────────┘
```

## UI Updates

The `ExtractedPitchSummary` component header will include export buttons:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ✨ Extracted & Cleaned Pitch Summary              [JSON] [PDF] ⌄  │
│     AI-structured content from PDF                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Executive Summary                                                  │
│  ...                                                                │
├─────────────────────────────────────────────────────────────────────┤
│  Slide-by-Slide Breakdown                                           │
│  [Slide 1] [Slide 2] ...                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Technical Details

### Metadata Schema

The `metadata` JSONB column will store:

```typescript
interface AnalysisMetadata {
  sourceType: 'pdf' | 'text';
  extractedPitchSummary?: string;
  extractedSlides?: SlideContent[];
}
```

### Export Functions

**JSON Export:**
```typescript
const exportData = {
  pitchSummary: string,
  slides: SlideContent[],
  exportedAt: timestamp
};
// Download as .json file
```

**PDF Export:**
```typescript
exportPitchSummaryToPDF(pitchSummary: string, slides?: SlideContent[])
// Generates formatted PDF with:
// - Title and date
// - Executive Summary section
// - Slide breakdown (if available)
```

### State Management Updates

In `viewHistoricalAnalysis()`:
```typescript
// After loading analysis result
if (item.metadata?.sourceType === 'pdf' && item.metadata?.extractedPitchSummary) {
  setExtractedPitchSummary(item.metadata.extractedPitchSummary);
  setExtractedSlides(item.metadata.extractedSlides || null);
} else {
  // Clear for text-based analyses
  setExtractedPitchSummary(null);
  setExtractedSlides(null);
}
```

## Backward Compatibility

- Existing analyses without metadata will work normally (no extracted summary shown)
- The `sourceType` field allows distinguishing between PDF and text-based analyses
- No database schema changes required (using existing `metadata` JSONB column)
