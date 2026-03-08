

# Landing Page Messaging & "The Problem" Section Updates

## Changes — all in `src/pages/Landing.tsx`

### 1. Hero subtitle (line 70-72)
Replace the `<p>` text with:
> "Your AI-powered first layer of startup screening. Instantly triage deal flow, surface the signals that matter, and focus your attention where it counts — before your analysts dive deeper."

### 2. Disclaimer below hero CTAs (after line 80)
Add a new `<p>` with small muted text:
> "PitchScore is designed as an initial screening tool to support — not replace — human investment judgement."

### 3. Social proof section (lines 120-141)
Replace entirely. New heading: **"Built for investors who move fast"**. Below it, 4 badges/pills:
- "VC Deal Flow Screening"
- "Angel First-Pass Analysis"
- "Accelerator Batch Shortlisting"
- "Family Office Deal Review"

### 4. New "The Problem" section (insert between social proof and "How It Works")
- Heading: "The average VC sees 1,000+ pitches a year."
- Subheading: "Most get dismissed in minutes. Not because they weren't good — but because there wasn't enough time to look properly."
- 3 pain point cards (icons: `Layers`, `Users`, `Zap` or similar):
  1. **Deal flow overload** — "Hundreds of decks land in your inbox every month..."
  2. **Inconsistent evaluation** — "Different analysts score the same pitch differently..."
  3. **Time spent on the wrong deals** — "Hours spent on pitches that could have been ruled out in minutes..."
- Transition line below cards: "PitchScore gives you a consistent, structured first pass on every pitch in seconds — so your team focuses only on what deserves a second look."

### 5. Features section intro (lines 188-189)
Replace the `<h2>` subtitle. Keep "Features" badge. Change heading to current text, then add a `<p>` below:
> "PitchScore gives investors a fast, structured first look at any pitch — so you spend less time on triage and more time on the deals worth pursuing."

### 6. Update comparison mode description (line 201)
Change "up to 5" to "up to 10" to match the new limit.

### Icons needed
Add `AlertTriangle` or `Clock` import for pain point cards. Current imports already include `Layers`, `Users`, `Zap` which can be reused.

