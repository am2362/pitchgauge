

# Remove "Or upgrade to Pro" Button from Bulk Analysis Lock Screen

## Change

In `src/components/UpgradePrompt.tsx`, remove the conditional block (lines ~48-56) that renders the secondary "Or upgrade to Pro — $39/mo" button when `currentTier === "free"` and `requiredTier === "scale"`.

This button is misleading on the Bulk Analysis page since Pro doesn't unlock bulk analysis — only Scale does.

## File
- `src/components/UpgradePrompt.tsx` — Remove the `{currentTier === "free" && requiredTier === "scale" && (...)}` block containing the outline Pro upgrade button.

