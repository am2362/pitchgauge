
# Implement Consistent Scoring Rubric Across All Analysis Functions + Info Page

## Overview
Embed the detailed 1-10 scoring rubric into all AI prompts (single pitch, bulk, and compare functions) so scores are applied consistently, and add a new `/scoring-rubric` page so users understand how startups are evaluated.

## Changes

### 1. Update single pitch analysis prompt
**File:** `supabase/functions/analyze-startup/index.ts`

Replace the generic `SCORING CRITERIA` block (lines 139-146) with the full rubric including category-specific thresholds (1-3 critical, 4-6 mediocre, 7-8 strong, 9-10 outstanding) and the requirement to include reasoning explaining "why X not Y". Also rename "Competitive Landscape" guidelines to match the existing scorecard key.

### 2. Update bulk analysis prompt
**File:** `supabase/functions/analyze-bulk-startups/index.ts`

Replace the generic scoring section in `analyzeStartup()` (lines 197-243) with the same detailed rubric. The bulk prompt uses slightly different field names (Product vs ProductDifferentiation) so the rubric wording will match accordingly.

### 3. Update compare startups prompt
**File:** `supabase/functions/compare-startups/index.ts`

Add the rubric context to the comparison prompt (line 68 onward) so the AI applies the same scoring lens when ranking and comparing startups. This ensures comparison insights reference the rubric thresholds.

### 4. Create Scoring Rubric page
**File:** `src/pages/ScoringRubric.tsx` (new)

A clean, readable page explaining:
- The general 1-10 scale (1-3 critical weakness, 4-6 mediocre, 7-8 strong, 9-10 outstanding)
- Each of the 6 categories with their specific thresholds
- A note that scores always include reasoning

Uses existing UI components (Card, Badge, Table) for a polished look. Includes a back button to navigate home.

### 5. Add route and navigation link
**File:** `src/App.tsx` -- add `/scoring-rubric` route

**File:** `src/pages/Index.tsx` -- add a "Scoring Rubric" button in the navigation bar alongside Compare, History, Bulk Analysis, and Settings.

## Technical Details

### The rubric text injected into all prompts:
```text
SCORING RUBRIC (1-10, integers only, apply consistently):

General Scale:
- 1-3: Critical weakness / missing / fatal flaw (high risk of failure)
- 4-6: Mediocre / average / partial (uncompelling; needs major fixes)
- 7-8: Strong / good evidence (attractive, competitive)
- 9-10: Outstanding / exceptional (top decile, clear advantage)

Category-Specific:
- Team Quality: 1-3 no info/inexperienced/red flags; 4-6 some experience but gaps; 7-8 proven founders (exits, domain expertise); 9-10 exceptional track record
- Market Size: 1-3 tiny TAM (<$500M)/shrinking; 4-6 decent ($1B-$10B)/slow growth; 7-8 large/growing ($10B+); 9-10 massive ($50B+ with tailwinds)
- Product Differentiation: 1-3 generic/no moat; 4-6 some features, easily replicable; 7-8 clear unique value/IP; 9-10 defensible moat (patents, network effects)
- Traction: 1-3 none/anecdotal; 4-6 early signals, not scaling; 7-8 strong metrics (growing revenue/users); 9-10 explosive/validated PMF
- Business Model: 1-3 unclear/unsustainable; 4-6 viable but thin margins; 7-8 scalable, high-margin potential; 9-10 proven, recurring, capital-efficient
- Competitive Landscape: 1-3 saturated/no barriers; 4-6 competitive but some edge; 7-8 differentiated position; 9-10 minimal competition or dominant potential

ALWAYS include reasoning explaining the exact score (e.g., why 5 not 6).
```

### Files modified:
- `supabase/functions/analyze-startup/index.ts` -- replace scoring criteria in prompt
- `supabase/functions/analyze-bulk-startups/index.ts` -- replace scoring criteria in prompt
- `supabase/functions/compare-startups/index.ts` -- add rubric context to comparison prompt
- `src/pages/ScoringRubric.tsx` -- new page
- `src/App.tsx` -- add route
- `src/pages/Index.tsx` -- add nav button
