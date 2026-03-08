

# Update Prices: Pro → $39, Scale → $99

All changes are string replacements across 4 files. No backend/edge function changes needed since the price IDs are already updated in secrets.

## Files to update

### 1. `src/pages/Landing.tsx`
- Line 286: `"$29"` → `"$39"`
- Line 300: `"$89"` → `"$99"`

### 2. `src/pages/Billing.tsx`
- Line 150: `$29` → `$39`
- Line 165: `$89` → `$99`

### 3. `src/pages/Settings.tsx`
- Line 313: `$29/mo` → `$39/mo`
- Line 319: `$89/mo` → `$99/mo`

### 4. `src/components/UpgradePrompt.tsx`
- Line 16: `"$29/mo"` → `"$39/mo"`
- Line 17: `"$89/mo"` → `"$99/mo"`
- Line 55: `$29/mo` → `$39/mo`

