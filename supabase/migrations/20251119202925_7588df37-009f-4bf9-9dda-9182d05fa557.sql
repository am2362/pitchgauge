-- Create bulk analyses table for batch startup analysis
CREATE TABLE public.bulk_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  batch_name text NOT NULL,
  total_startups integer NOT NULL,
  completed_startups integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  results jsonb,
  comparison_report jsonb,
  metadata jsonb
);

-- Enable RLS
ALTER TABLE public.bulk_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bulk analyses"
  ON public.bulk_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bulk analyses"
  ON public.bulk_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk analyses"
  ON public.bulk_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bulk analyses"
  ON public.bulk_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bulk_analyses_updated_at
  BEFORE UPDATE ON public.bulk_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();