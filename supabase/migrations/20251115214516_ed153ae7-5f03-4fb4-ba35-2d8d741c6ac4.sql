-- Create table for storing startup analyses
CREATE TABLE IF NOT EXISTS public.startup_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  startup_name TEXT,
  pitch_text TEXT NOT NULL,
  memo TEXT NOT NULL,
  scorecard JSONB NOT NULL,
  red_flags JSONB,
  follow_up_questions JSONB,
  investment_thesis TEXT,
  benchmarking JSONB,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.startup_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read and insert (public tool)
CREATE POLICY "Allow public read access" 
ON public.startup_analyses 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.startup_analyses 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_startup_analyses_created_at ON public.startup_analyses(created_at DESC);