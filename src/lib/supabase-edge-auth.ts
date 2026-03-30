import { supabase } from "@/integrations/supabase/client";

/** Edge Functions verify JWT at the gateway; stale access_tokens from getSession() cause 401. */
export async function refreshAuthIfNeededForFunctions(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.refresh_token) return;
  const exp = session.expires_at;
  if (exp != null && exp * 1000 > Date.now() + 120_000) return;
  await supabase.auth.refreshSession();
}
