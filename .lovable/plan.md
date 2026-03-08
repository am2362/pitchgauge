

# Remove "Single Pitch Analysis" Button from Top Navigation

Remove the "Single Pitch Analysis" button and the associated `pitchInputRef` from `src/pages/Index.tsx`.

## Changes
- **`src/pages/Index.tsx`**: Remove the `useRef` declaration for `pitchInputRef`, remove the "Single Pitch Analysis" `<Button>` from the nav bar, and remove the `ref={pitchInputRef}` from the pitch input Card.

