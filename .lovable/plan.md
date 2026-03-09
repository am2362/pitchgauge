
# Align Logo Icon Bottom with Text Baseline

## Current Issue
The logo icon is vertically centered with the "PitchGauge" text using `items-center`, which makes the icon appear slightly misaligned because its bottom doesn't align with the text baseline.

## Solution
Change flex alignment from `items-center` to `items-end` on all logo + text containers. This will align the bottom edge of the icon with the baseline of the text, creating a more visually balanced appearance.

## Files to Update

### 1. AppNavbar.tsx (line 46)
- Change: `className="flex items-center gap-2"` 
- To: `className="flex items-end gap-2"`

### 2. DemoNav.tsx (line 22)  
- Change: `className="flex items-center gap-2"`
- To: `className="flex items-end gap-2"`

### 3. Auth.tsx (line 125)
- Change: `className="flex items-center justify-center gap-2"`
- To: `className="flex items-end justify-center gap-2"`

### 4. Landing.tsx
- Line 42: Change `className="flex items-center gap-2"` to `className="flex items-end gap-2"`
- Line 378: Change `className="flex items-center gap-2 mb-2"` to `className="flex items-end gap-2 mb-2"`

### 5. ScoringRubric.tsx (line 74)
- Change: `className="flex items-center gap-2 mb-8"`
- To: `className="flex items-end gap-2 mb-8"`

## Result
The bottom of the gauge icon will now align with the text baseline across all pages (navigation bars, auth page, landing page, scoring rubric), creating a more polished and intentional visual alignment.
