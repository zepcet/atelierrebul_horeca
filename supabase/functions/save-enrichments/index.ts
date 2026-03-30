import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { getServiceRoleKey } from "../_shared/service-role-key.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const { results } = await req.json();
    if (!results?.length) {
      return new Response(JSON.stringify({ saved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = getServiceRoleKey();
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing service role secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    let saved = 0;
    for (const r of results) {
      if (!r.lead_id) continue;
      const row = {
        lead_id: r.lead_id,
        title: r.title || "",
        website: r.website || "",
        linkedin_url: r.linkedin_url || "",
        ig_username: r.ig_username || "",
        company_note: r.company_note || "",
        enriched: true,
        enrichment_quality: r.enrichment_quality || "none",
        last_enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("lead_enrichments")
        .upsert(row, { onConflict: "lead_id" });
      if (error) {
        console.error(`Upsert failed for ${r.lead_id}:`, error.message);
      } else {
        saved++;
      }
    }

    return new Response(JSON.stringify({ saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
