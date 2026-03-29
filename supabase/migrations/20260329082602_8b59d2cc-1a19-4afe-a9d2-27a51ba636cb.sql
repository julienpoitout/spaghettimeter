
-- Knowledge base table for spaghetti code analysis guidelines
CREATE TABLE public.spaghetti_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaghetti_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge is readable by everyone" ON public.spaghetti_knowledge FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert knowledge" ON public.spaghetti_knowledge FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update knowledge" ON public.spaghetti_knowledge FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete knowledge" ON public.spaghetti_knowledge FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_spaghetti_knowledge_updated_at
BEFORE UPDATE ON public.spaghetti_knowledge
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
