-- Create comparison_analyses table
CREATE TABLE public.comparison_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  startup_names TEXT[] NOT NULL,
  pitches JSONB NOT NULL,
  analyses JSONB NOT NULL,
  comparison_insights JSONB,
  metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE public.comparison_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own comparisons"
ON public.comparison_analyses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comparisons"
ON public.comparison_analyses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
ON public.comparison_analyses
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_comparison_analyses_user_id ON public.comparison_analyses(user_id);
CREATE INDEX idx_comparison_analyses_created_at ON public.comparison_analyses(created_at DESC);