
# Match Auth Page Logo & Text Styling

## Problem
The user likes how the logo and "PitchGauge" text look on the Auth page, but the Landing and Scoring Rubric pages look worse with the current `items-end` alignment.

## Analysis
**Auth page (looks good):**
- Logo: `h-10 w-10` 
- Text: `text-4xl font-bold`
- Alignment: `items-end justify-center`

**Landing page header (looks bad):**
- Logo: `h-6 w-6` (too small)
- Text: `text-lg font-bold` (smaller)
- Alignment: `items-end`

**Scoring Rubric (looks bad):**
- Logo: `h-6 w-6` (too small)
- Text: `text-3xl font-bold` (large)
- Alignment: `items-end`

The issue is size proportion mismatch between logo and text.

## Solution

### 1. Landing.tsx (line 42-44)
Update header logo container:
- Change logo size: `h-6 w-6` → `h-8 w-8`
- This better matches the `text-lg` heading size

### 2. ScoringRubric.tsx (line 74-76)
Update page header:
- Change logo size: `h-6 w-6` → `h-9 w-9`
- This better matches the `text-3xl` heading size

### 3. Landing.tsx footer (line 378-380)
Keep as-is (`h-5 w-5` with default text) - footer should be smaller

## Result
Logo and text proportions will match the Auth page's balanced visual hierarchy across all pages.
