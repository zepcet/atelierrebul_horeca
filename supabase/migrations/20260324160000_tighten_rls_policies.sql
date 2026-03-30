-- Tighten RLS: restrict DELETE (no deletes allowed via client)
-- Add policy to prevent anonymous access

-- Drop overly permissive policies and recreate with tighter controls
DROP POLICY IF EXISTS "Authenticated users can read lead enrichments" ON public.lead_enrichments;
DROP POLICY IF EXISTS "Authenticated users can insert lead enrichments" ON public.lead_enrichments;
DROP POLICY IF EXISTS "Authenticated users can update lead enrichments" ON public.lead_enrichments;
-- Recreate with explicit authenticated-only access
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
-- Explicitly deny all operations from anon role
CREATE POLICY "Deny anonymous read"
  ON public.lead_enrichments FOR SELECT
  TO anon
  USING (false);
CREATE POLICY "Deny anonymous insert"
  ON public.lead_enrichments FOR INSERT
  TO anon
  WITH CHECK (false);
CREATE POLICY "Deny anonymous update"
  ON public.lead_enrichments FOR UPDATE
  TO anon
  USING (false)
  WITH CHECK (false);
CREATE POLICY "Deny anonymous delete"
  ON public.lead_enrichments FOR DELETE
  TO anon
  USING (false);
-- Deny delete for authenticated users too (no client-side deletes)
CREATE POLICY "Deny authenticated delete"
  ON public.lead_enrichments FOR DELETE
  TO authenticated
  USING (false);
