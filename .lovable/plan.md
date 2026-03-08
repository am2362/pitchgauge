

# Fix PDF Parsing 404 Error

## Root Cause

In `src/lib/document-parser.ts` line 49, the fetch URL uses `import.meta.env.VITE_EXTERNAL_SUPABASE_URL` which is **not defined** in the `.env` file. This results in `undefined/functions/v1/parse-pdf`, which returns a 404.

The `.env` only has `VITE_SUPABASE_URL`. The `supabase-external.ts` client correctly falls back to the Cloud client, but the raw `fetch()` call in `document-parser.ts` does not use that client — it constructs the URL manually from the wrong env var.

## Fix

**Single file change: `src/lib/document-parser.ts`**

1. Replace the `supabase-external` import with the standard Cloud client import
2. Change the fetch URL from `VITE_EXTERNAL_SUPABASE_URL` to `VITE_SUPABASE_URL`

```typescript
// Line 1: change import
import { supabase } from "@/integrations/supabase/client";

// Line 49: change URL
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf`
```

No other files change. The edge function exists, `config.toml` already has `verify_jwt = false`, and `LOVABLE_API_KEY` is available as a secret.

