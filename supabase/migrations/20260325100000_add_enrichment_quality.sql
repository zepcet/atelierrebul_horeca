-- Add enrichment quality tracking columns for smart re-enrichment
ALTER TABLE lead_enrichments
ADD COLUMN IF NOT EXISTS enrichment_quality TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS enrichment_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
