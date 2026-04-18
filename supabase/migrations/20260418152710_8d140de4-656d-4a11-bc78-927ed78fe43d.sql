-- 1) user_verifications: prevent client read of token column
REVOKE ALL ON TABLE public.user_verifications FROM authenticated, anon;
GRANT SELECT (id, user_id, verified, created_at) ON public.user_verifications TO authenticated;

-- 2) usage_tracking: explicit deny policies for UPDATE and DELETE
DROP POLICY IF EXISTS "Deny client updates on usage_tracking" ON public.usage_tracking;
DROP POLICY IF EXISTS "Deny client deletes on usage_tracking" ON public.usage_tracking;

CREATE POLICY "Deny client updates on usage_tracking"
ON public.usage_tracking
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client deletes on usage_tracking"
ON public.usage_tracking
FOR DELETE
TO authenticated
USING (false);