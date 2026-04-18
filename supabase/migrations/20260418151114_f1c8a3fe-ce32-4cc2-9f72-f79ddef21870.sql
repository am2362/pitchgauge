-- 1) user_verifications: prevent client-side reads of the token column
-- Drop the existing SELECT policy that exposed all columns including token
DROP POLICY IF EXISTS "Users can view their own verification" ON public.user_verifications;

-- Revoke all column privileges from authenticated, then re-grant only safe columns
REVOKE ALL ON public.user_verifications FROM authenticated;
GRANT SELECT (id, user_id, verified, created_at) ON public.user_verifications TO authenticated;

-- Recreate row-level SELECT policy (column access is now restricted via GRANT)
CREATE POLICY "Users can view their own verification (no token)"
ON public.user_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) subscriptions: explicitly deny client-side INSERT/UPDATE/DELETE
-- Service role bypasses RLS, so server-side updates (webhook, edge functions) still work
CREATE POLICY "Deny client inserts on subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny client updates on subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client deletes on subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (false);