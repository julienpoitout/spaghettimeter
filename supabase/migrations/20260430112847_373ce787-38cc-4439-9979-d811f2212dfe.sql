CREATE POLICY "Users can view own analysis usage"
ON public.analysis_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);