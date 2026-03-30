ALTER TABLE public.lead_enrichments ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new';
