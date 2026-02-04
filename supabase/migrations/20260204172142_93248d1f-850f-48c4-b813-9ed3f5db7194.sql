-- Append results to a bulk analysis without sending the full growing JSON array over the network.
-- This keeps requests small and prevents large UPDATE payload failures as batches grow.

CREATE OR REPLACE FUNCTION public.append_bulk_analysis_results(
  p_batch_id uuid,
  p_results jsonb
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_completed integer;
BEGIN
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' THEN
    RAISE EXCEPTION 'p_results must be a JSON array';
  END IF;

  UPDATE public.bulk_analyses b
  SET
    results = COALESCE(b.results, '[]'::jsonb) || p_results,
    completed_startups = jsonb_array_length(COALESCE(b.results, '[]'::jsonb) || p_results),
    updated_at = now()
  WHERE b.id = p_batch_id
    AND b.user_id = auth.uid()
  RETURNING b.completed_startups INTO v_completed;

  IF v_completed IS NULL THEN
    RAISE EXCEPTION 'Batch not found or unauthorized';
  END IF;

  RETURN v_completed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_bulk_analysis_results(uuid, jsonb) TO authenticated;