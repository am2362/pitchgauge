

# Cap Comparison at 10 Startups + Remove Individual Analyze Buttons

## Changes

### 1. `src/pages/Compare.tsx` — `addPitch` function (line 156)
Add a guard: if `pitches.length >= 10`, show a toast ("Maximum 10 startups allowed") and return early instead of adding.

### 2. `src/pages/Compare.tsx` — "Add Startup" button (line 652)
Disable the button when `pitches.length >= 10`. Optionally show the count like "Add Startup (3/10)".

### 3. `src/pages/Compare.tsx` — Remove individual "Analyze" buttons (lines 818-821)
Delete the per-pitch `<Button onClick={() => analyzePitch(pitch.id)}>` block. The "Analyze All" button at the top (line 668) remains as the sole way to trigger analysis.

No backend changes needed — the edge function already accepts up to 10.

