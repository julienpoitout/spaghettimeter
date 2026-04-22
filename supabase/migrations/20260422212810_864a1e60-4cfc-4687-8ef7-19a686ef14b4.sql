CREATE TABLE public.shared_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  repo_url text NOT NULL,
  score numeric NOT NULL,
  explanation text NOT NULL,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.shared_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared analyses"
  ON public.shared_analyses FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create shared analyses"
  ON public.shared_analyses FOR INSERT
  TO public
  WITH CHECK (true);