
-- Fix 1: Convert all RESTRICTIVE RLS policies to PERMISSIVE across all tables

-- bulk_analyses
DROP POLICY IF EXISTS "Users can delete their own bulk analyses" ON public.bulk_analyses;
DROP POLICY IF EXISTS "Users can insert their own bulk analyses" ON public.bulk_analyses;
DROP POLICY IF EXISTS "Users can update their own bulk analyses" ON public.bulk_analyses;
DROP POLICY IF EXISTS "Users can view their own bulk analyses" ON public.bulk_analyses;

CREATE POLICY "Users can delete their own bulk analyses" ON public.bulk_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bulk analyses" ON public.bulk_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bulk analyses" ON public.bulk_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own bulk analyses" ON public.bulk_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- comparison_analyses
DROP POLICY IF EXISTS "Users can create their own comparisons" ON public.comparison_analyses;
DROP POLICY IF EXISTS "Users can delete their own comparisons" ON public.comparison_analyses;
DROP POLICY IF EXISTS "Users can view their own comparisons" ON public.comparison_analyses;

CREATE POLICY "Users can create their own comparisons" ON public.comparison_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comparisons" ON public.comparison_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own comparisons" ON public.comparison_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- startup_analyses
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.startup_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.startup_analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.startup_analyses;
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.startup_analyses;

CREATE POLICY "Users can delete their own analyses" ON public.startup_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analyses" ON public.startup_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own analyses" ON public.startup_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own analyses" ON public.startup_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- usage_tracking
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_tracking;

CREATE POLICY "Users can insert their own usage" ON public.usage_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own usage" ON public.usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- user_verifications
DROP POLICY IF EXISTS "Users can view their own verification" ON public.user_verifications;

CREATE POLICY "Users can view their own verification" ON public.user_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix 2: Add explicit deny policy to admin_users
CREATE POLICY "Deny all access to admin_users" ON public.admin_users FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Fix 4: Scope is_user_verified to caller only
CREATE OR REPLACE FUNCTION public.is_user_verified(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verified FROM public.user_verifications WHERE user_id = p_user_id AND p_user_id = auth.uid()),
    false
  )
$$;
