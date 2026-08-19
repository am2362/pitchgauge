
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_daily_usage_count(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_monthly_usage_count(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_user_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_usage_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_usage_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_verified(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can update their own bulk analyses" ON public.bulk_analyses;
CREATE POLICY "Users can update their own bulk analyses"
ON public.bulk_analyses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
