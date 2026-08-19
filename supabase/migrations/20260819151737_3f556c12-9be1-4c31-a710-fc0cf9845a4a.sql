
CREATE OR REPLACE FUNCTION public.get_daily_usage_count(p_action_type text)
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT COUNT(*)::integer FROM public.usage_tracking
  WHERE user_id = auth.uid() AND action_type = p_action_type
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_usage_count(p_action_type text)
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT COUNT(*)::integer FROM public.usage_tracking
  WHERE user_id = auth.uid() AND action_type = p_action_type
    AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC');
$$;

CREATE OR REPLACE FUNCTION public.is_user_verified(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT verified FROM public.user_verifications WHERE user_id = p_user_id AND p_user_id = auth.uid()),
    false
  )
$$;

REVOKE ALL ON FUNCTION public.get_daily_usage_count(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_monthly_usage_count(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_user_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_usage_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_usage_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_verified(uuid) TO authenticated;
