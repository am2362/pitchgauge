

# Admin Whitelist for Scale Tier Override

## Change — `src/hooks/useSubscription.ts`

Add a hardcoded whitelist array and an early-return check in `syncWithStripe`:

1. **Add constant** (after `TIER_LIMITS`):
```ts
const ADMIN_WHITELIST = [
  "amandayung808@gmail.com",
  "amandaywy2015@gmail.com",
  "c74661985@gmail.com",
];
```

2. **Early return in `syncWithStripe`** (after getting session, ~line 32-36): If `session.user.email` is in the whitelist, set tier to `"scale"`, skip Stripe check entirely, and return.

3. **Same check in `loadFromDB`**: Add the same override so the fallback path also respects the whitelist.

Single file modified: `src/hooks/useSubscription.ts`

