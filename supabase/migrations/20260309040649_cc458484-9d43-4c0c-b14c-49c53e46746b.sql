-- Create admin_users table for server-side admin verification
-- This table is accessible only by service role for security
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but provide no policies (service role only access)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Insert admin emails (replace ADMIN_WHITELIST from client code)
INSERT INTO public.admin_users (email) VALUES
  ('amandayung808@gmail.com'),
  ('amandaywy2015@gmail.com'),
  ('c74661985@gmail.com');