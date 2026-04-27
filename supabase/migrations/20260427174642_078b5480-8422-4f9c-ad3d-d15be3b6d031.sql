
CREATE TABLE public.user_github_tokens (
  user_id uuid NOT NULL PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own github token"
  ON public.user_github_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own github token"
  ON public.user_github_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own github token"
  ON public.user_github_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own github token"
  ON public.user_github_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_github_tokens_set_updated_at
BEFORE UPDATE ON public.user_github_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
