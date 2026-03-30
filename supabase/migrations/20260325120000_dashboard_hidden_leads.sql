-- Leads hidden from the dashboard only (Google Sheets unchanged)
CREATE TABLE public.dashboard_hidden_leads (
  lead_id text PRIMARY KEY,
  hidden_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dashboard_hidden_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read dashboard_hidden_leads"
  ON public.dashboard_hidden_leads FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY "Allow insert dashboard_hidden_leads"
  ON public.dashboard_hidden_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
