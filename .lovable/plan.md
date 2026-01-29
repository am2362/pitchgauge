

# Enhanced PDF Pitch Extraction with Intelligent Cleaning

## Overview

This plan adds a **text cleaning and structuring step** between raw PDF extraction and analysis. After extracting text from graphic-heavy PDFs, we'll use AI to clean, de-noise, and organize the content into a coherent pitch summary. Users will see both the cleaned summary and the full analysis.

## Architecture Flow

```text
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐    ┌──────────────────┐
│   PDF Upload    │───▶│  Text Extraction │───▶│   AI Cleaning     │───▶│   VC Analysis    │
│  (parse-pdf)    │    │  (Vision/pdfjs)  │    │   & Structuring   │    │  (analyze-startup│
└─────────────────┘    └──────────────────┘    └───────────────────┘    └──────────────────┘
                                                        │
                                                        ▼
                                              ┌────────────────────┐
                                              │ "Extracted & Cleaned│
                                              │   Pitch Summary"   │
                                              │ shown in UI output │
                                              └────────────────────┘
```

## Changes Required

### 1. Update `parse-pdf` Edge Function

Add a new AI-powered cleaning step that runs after extraction (both standard and Vision AI methods).

**New cleaning prompt will:**
- Remove noise (repeated words like "airbnb", watermarks, page numbers, symbols)
- Group text fragments into logical sentences/paragraphs per slide
- Preserve structure with slide numbers and headings
- Output a coherent pitch summary ready for analysis

**Return format change:**
```typescript
{
  text: string,           // Raw extracted text (for debugging)
  cleanedText: string,    // AI-cleaned and structured text
  pitchSummary: string,   // Coherent pitch summary for display
  pages: number,
  fileName: string,
  method: "text_extraction" | "vision_ai",
  slides?: Array<{        // Structured slide-by-slide breakdown
    slideNumber: number,
    heading?: string,
    content: string
  }>
}
```

### 2. Update `document-parser.ts` Client

Extend the `ParseResult` interface to include the cleaned text and pitch summary:

```typescript
interface ParseResult {
  text: string;           // Raw text
  cleanedText?: string;   // Cleaned/structured text
  pitchSummary?: string;  // Human-readable summary
  pages?: number;
  fileName?: string;
  slides?: Array<{
    slideNumber: number;
    heading?: string;
    content: string;
  }>;
}
```

### 3. Update `analyze-startup` Edge Function

Modify the system prompt to:
- Accept the cleaned text as the primary input
- Include raw key phrases for additional context
- Output a new `extractedPitchSummary` field in the analysis result

Add to the JSON response structure:
```json
{
  "extractedPitchSummary": "The cleaned and structured version of the pitch that was analyzed...",
  // ... existing fields
}
```

### 4. Update Frontend (`Index.tsx`)

- Store the cleaned pitch summary from PDF parsing
- Pass cleaned text (not raw) to the analysis function
- Display "Extracted & Cleaned Pitch Summary" section in analysis results
- Add a new tab or collapsible section showing the structured extraction

**New UI element (before analysis tabs):**
```
┌────────────────────────────────────────┐
│ 📄 Extracted Pitch Summary             │
│                                        │
│ Slide 1: Company Overview              │
│ Airbnb connects travelers with unique  │
│ accommodations worldwide...            │
│                                        │
│ Slide 2: The Problem                   │
│ Hotels are expensive and impersonal... │
│ ...                                    │
└────────────────────────────────────────┘
```

### 5. Update Analysis Result Interface

Add new field to the `AnalysisResult` interface:

```typescript
interface AnalysisResult {
  extractedPitchSummary?: string;  // NEW: Cleaned pitch summary
  startupName?: string;
  memo: string | Record<string, string>;
  // ... existing fields
}
```

## Technical Details

### AI Cleaning Prompt (in `parse-pdf`)

```text
You are a pitch deck text cleaner. Given raw extracted text from a PDF pitch deck:

1. REMOVE NOISE:
   - Repeated company names used as watermarks
   - Page numbers and navigation elements
   - Meaningless symbols (e.g., "000000", "S", "L", stray letters)
   - Repeated headers/footers
   
2. STRUCTURE BY SLIDE:
   - Identify slide boundaries from context
   - Extract headings/titles for each slide
   - Group fragmented text into coherent sentences
   
3. OUTPUT FORMAT:
   Return JSON with:
   {
     "pitchSummary": "A 2-3 paragraph executive summary of the entire pitch",
     "slides": [
       {
         "slideNumber": 1,
         "heading": "Company Overview",
         "content": "Full cleaned text from this slide..."
       }
     ],
     "cleanedText": "All cleaned slide content concatenated with slide markers"
   }
```

### Error Handling

- If cleaning fails, fall back to raw extracted text
- Log cleaning errors but don't block the analysis
- Always provide the raw text as backup

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/parse-pdf/index.ts` | Add AI cleaning step after extraction |
| `src/lib/document-parser.ts` | Extend interface, return cleaned text |
| `supabase/functions/analyze-startup/index.ts` | Accept cleaned text, output pitch summary |
| `src/pages/Index.tsx` | Display extracted pitch summary in results |

## Estimated Token Usage

- Cleaning step: ~500 input + ~1000 output tokens per PDF
- Uses the same `google/gemini-2.5-flash` model already in use
- Falls back gracefully if AI limits are reached

