

# Move Logout Button Inline with Nav Buttons

The logout button is already in the same flex container as the nav buttons (lines 551-580). The only visual difference is it uses `variant="ghost"` instead of `variant="outline"`.

**Change:** Update the Logout button on line 576 from `variant="ghost"` to `variant="outline"` so it matches the other buttons visually and appears as part of the same group.

Single line change in `src/pages/Dashboard.tsx` line 576.

