

# Fix Nav Layout — Move Badge Below Title

The header uses `flex items-center justify-between` with the left side containing the logo + badge + remaining analyses text, and the right side containing all nav buttons. The left side takes too much horizontal space, pushing Logout to wrap.

**Fix:** Stack the badge and remaining analyses below the title instead of beside it.

### Change in `src/pages/Dashboard.tsx` (lines 536-550)

Replace the left-side `div` from a single horizontal flex row to a stacked layout:
- Keep the icon + "PitchGauge" title on one line (reduce title from `text-5xl` to `text-4xl`)
- Move the Badge and remaining analyses text to a second line below the title

```
<div className="flex flex-col items-start">
  <div className="flex items-center gap-2">
    <TrendingUp className="h-8 w-8 text-primary" />
    <h1 className="text-4xl font-bold ...">PitchGauge</h1>
  </div>
  <div className="flex items-center gap-2 ml-10">
    <Badge ...>{tier}</Badge>
    {tier === "free" && <span ...>...</span>}
  </div>
</div>
```

This frees up enough horizontal space for all 7 nav buttons (including Logout) to fit on one line.

