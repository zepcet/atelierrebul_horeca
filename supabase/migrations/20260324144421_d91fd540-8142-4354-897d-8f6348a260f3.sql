UPDATE public.lead_enrichments SET ig_username = '' WHERE coalesce(ig_username, '') <> '';
