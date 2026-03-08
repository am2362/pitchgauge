CREATE OR REPLACE FUNCTION public.get_monthly_usage_count(p_action_type text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.usage_tracking
  WHERE user_id = auth.uid()
    AND action_type = p_action_type
    AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC');
$$;