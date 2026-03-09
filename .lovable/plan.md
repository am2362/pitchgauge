

# Plan: Standardize AI Temperature and Scoring Prompts

## Current State

| Function | Temperature | System Prompt | Anchoring |
|----------|------------|---------------|-----------|
| analyze-startup | 0 (good) | Detailed scoring rubric | Category ranges only, no specific anchors |
| compare-startups | **0.7 (too high)** | Minimal: "You are a VC analyst" | Rubric in user prompt, no anchors |
| analyze-bulk-startups | 0 (good, both paths) | Detailed scoring rubric | Category ranges only, no specific anchors |

## Changes

### 1. Set temperature to 0.1 on all three functions

- **analyze-startup** (line 98): Change `temperature: 0` → `temperature: 0.1`
- **compare-startups** (line 143): Change `temperature: 0.7` → `temperature: 0.1`
- **analyze-bulk-startups** (line 267/287): Change `temperature: 0` → `temperature: 0.1` (both Gemini direct and gateway paths)

### 2. Add consistency enforcement to all system prompts

Prepend to each function's system prompt:

> "You are a consistent startup evaluation AI. Always apply the same scoring criteria strictly. Do not vary scores based on writing style or tone — evaluate only on substance. A pitch with identical facts must always receive identical scores."

- **analyze-startup**: Add to existing system prompt (line 103)
- **compare-startups**: Replace the minimal system prompt (line 135) with the consistency directive plus existing comparison instructions
- **analyze-bulk-startups**: Add to the `systemPrompt` variable (line 185)

### 3. Add explicit score anchoring instructions to all scoring rubrics

Replace the category-specific scoring sections with detailed anchoring. Applied to analyze-startup and analyze-bulk-startups (both have identical rubric structures). Compare-startups doesn't generate scores itself (it compares existing scores), so it gets the anchoring context for interpreting scores.

Anchoring examples per category:

- **Team Quality**: "7/10 requires at minimum 2 founders with relevant domain experience and one prior startup or notable company background. 5/10 means founders have general business experience but no direct domain expertise or startup track record."
- **Market Size**: "7/10 requires explicit mention of TAM >$10B with evidence of growth. 5/10 means market is $1B-$10B with no strong growth signals."
- **Product Differentiation**: "7/10 requires a clearly articulated unique value proposition with some form of defensibility (IP, data moat, network effects). 5/10 means the product solves a real problem but could be easily replicated."
- **Traction**: "7/10 requires demonstrated revenue or significant user growth with specific numbers. 5/10 means some early users or pilots but no clear growth trajectory."
- **Business Model**: "7/10 requires a clearly scalable monetization strategy with evidence of unit economics. 5/10 means monetization path exists but margins or scalability are unproven."
- **Competitive Landscape**: "7/10 requires clear differentiation from named competitors with defensible positioning. 5/10 means some competitive awareness but no strong moat."

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/analyze-startup/index.ts` | Temperature → 0.1, add consistency preamble, add score anchors to rubric |
| `supabase/functions/compare-startups/index.ts` | Temperature → 0.1, replace system prompt with consistency + comparison directive |
| `supabase/functions/analyze-bulk-startups/index.ts` | Temperature → 0.1 (both code paths), add consistency preamble, add score anchors to rubric |

