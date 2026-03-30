ALTER TABLE public.lead_enrichments ADD COLUMN IF NOT EXISTS priority_override INTEGER DEFAULT NULL;
ALTER TABLE public.lead_enrichments ADD COLUMN IF NOT EXISTS am_person TEXT DEFAULT '';
