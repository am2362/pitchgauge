

# Security Hardening Plan for PitchGauge

## Current State Assessment

**Good news -- several items are already handled:**
- API keys (GEMINI_API_KEY, STRIPE_SECRET_KEY, SERVICE_ROLE_KEY) are only accessed in edge functions, never in frontend code
- VITE_ prefixed vars only contain safe values (URL, anon key, project ID)
- Stripe webhook already verifies signatures via `stripe.webhooks.constructEventAsync`
- RLS is enabled on all 5 tables with proper user-scoped policies
- The `_shared/validation.ts` already provides input validation for edge functions
- `sanitizeErrorMessage()` already exists for safe error responses
- Auth headers are checked in most edge functions

**Issues to fix:**
- Console.log statements expose user IDs, emails, Stripe customer IDs, and price IDs in server logs
- Error messages in check-subscription, customer-portal, create-checkout leak internal details to clients
- No rate limiting on any edge function
- No request size limits
- No security headers on responses
- Frontend pitch text has no character limit enforcement before sending
- Excel upload allows up to 20MB (should be 5MB per requirements)
- No HTML sanitization on pitch text input

---

## Implementation Plan

### 1. Create shared security utilities

Create `supabase/functions/_shared/security.ts` with:
- **Security response headers** constant: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- **Rate limiter** using an in-memory Map (per-function instance) tracking requests per user per hour, returning 429 when exceeding 60/hour
- **Request size checker** that rejects payloads over 50KB
- **Safe response helper** that merges CORS + security headers into every response
- **Input sanitizer** function that strips HTML tags and limits text to 10,000 characters

### 2. Harden all 8 edge functions

For each edge function (analyze-startup, analyze-bulk-startups, compare-startups, generate-bulk-comparison, parse-pdf, check-subscription, create-checkout, customer-portal):

- Import and apply security headers to all responses (including CORS preflight)
- Add request payload size check (50KB limit, except parse-pdf which handles file uploads separately)
- Add per-user rate limiting (60 requests/user/hour)
- Remove or redact all `console.log` statements that expose user emails, Stripe customer IDs, or price IDs -- keep only generic operational logs like "Function started", "Processing complete"
- Ensure all error responses use generic messages (no internal error details, no stack traces)
- Ensure Authorization header is required and validated before any processing

**Stripe-specific (stripe-webhook):**
- Webhook already verifies signatures -- keep as-is
- Remove logs that expose customer IDs and subscription details
- Keep the 400 response on signature failure

**parse-pdf specific:**
- Exempt from 50KB payload limit (file uploads)
- Keep existing 20MB file size limit
- Add sanitization to extracted text before returning

### 3. Frontend input hardening

**Dashboard.tsx:**
- Add 10,000 character limit on pitch text textarea (both display and enforcement before API call)
- Strip HTML tags from pitch text before sending to edge function
- Add character counter UI element

**Compare.tsx:**
- Same 10,000 character limit per pitch input
- Strip HTML tags before sending

**BulkUploadCard.tsx / excel-parser.ts:**
- Reduce MAX_FILE_SIZE from 20MB to 5MB for Excel uploads
- Already validates .xlsx format -- confirm .xls is rejected (it is, since XLSX_MIME only matches .xlsx)

**document-parser.ts:**
- Already validates PDF type and 20MB limit -- no changes needed

### 4. Sanitize error handling in remaining edge functions

Update check-subscription, customer-portal, and create-checkout to use `sanitizeErrorMessage()` from `_shared/validation.ts` instead of returning raw error messages to clients.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/_shared/security.ts` | **Create** -- shared security headers, rate limiter, size checker, HTML sanitizer |
| `supabase/functions/analyze-startup/index.ts` | Modify -- add security headers, rate limiting, size check, sanitize pitch input, redact logs |
| `supabase/functions/analyze-bulk-startups/index.ts` | Modify -- add security headers, rate limiting, redact logs |
| `supabase/functions/compare-startups/index.ts` | Modify -- add security headers, rate limiting, size check, redact logs |
| `supabase/functions/generate-bulk-comparison/index.ts` | Modify -- add security headers, rate limiting, size check, redact logs |
| `supabase/functions/parse-pdf/index.ts` | Modify -- add security headers, rate limiting, redact logs |
| `supabase/functions/check-subscription/index.ts` | Modify -- add security headers, rate limiting, sanitize errors, redact logs |
| `supabase/functions/create-checkout/index.ts` | Modify -- add security headers, rate limiting, size check, sanitize errors, redact logs |
| `supabase/functions/customer-portal/index.ts` | Modify -- add security headers, rate limiting, sanitize errors, redact logs |
| `supabase/functions/stripe-webhook/index.ts` | Modify -- add security headers, redact sensitive logs (no rate limiting -- Stripe controls this) |
| `supabase/functions/_shared/validation.ts` | Modify -- add HTML stripping utility, update max pitch length to 10,000 |
| `src/pages/Dashboard.tsx` | Modify -- add 10,000 char limit + HTML strip on pitch text |
| `src/pages/Compare.tsx` | Modify -- add 10,000 char limit + HTML strip on pitch inputs |
| `src/components/bulk/BulkUploadCard.tsx` | Modify -- reduce file size limit display to 5MB |
| `src/lib/excel-parser.ts` | Modify -- reduce MAX_FILE_SIZE to 5MB |

### Note on rate limiting approach

Edge functions on Lovable Cloud are stateless (each invocation may hit a different instance), so in-memory rate limiting provides per-instance protection only. For robust rate limiting, we would need a database-backed counter. The plan will use the existing `usage_tracking` table to check request counts per user per hour via a lightweight query at the start of each function, providing true cross-instance rate limiting.

### Note on auth endpoint rate limiting

Lovable Cloud authentication is managed by the underlying auth service, which has its own built-in rate limiting. We cannot directly add IP-based rate limiting to auth endpoints. The edge function rate limiting will cover all custom endpoints.

