-- Allow manual override of company name, full name, and job title on any lead
ALTER TABLE public.lead_enrichments
  ADD COLUMN IF NOT EXISTS company_name_override text,
  ADD COLUMN IF NOT EXISTS full_name_override text;
