CREATE TABLE public.lead_enrichments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  title TEXT DEFAULT '',
  website TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  am BOOLEAN DEFAULT false,
  company_note TEXT DEFAULT '',
  crm_status TEXT DEFAULT '',
  special_comments TEXT DEFAULT '',
  enriched BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read lead enrichments"
  ON public.lead_enrichments FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can insert lead enrichments"
  ON public.lead_enrichments FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can update lead enrichments"
  ON public.lead_enrichments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
