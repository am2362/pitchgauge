
-- Create user_verifications table
CREATE TABLE public.user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own verification status
CREATE POLICY "Users can view their own verification"
  ON public.user_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Security definer function to check verification
CREATE OR REPLACE FUNCTION public.is_user_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verified FROM public.user_verifications WHERE user_id = p_user_id),
    false
  )
$$;

-- Update handle_new_user trigger to also create verification row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active');
  INSERT INTO public.user_verifications (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;
