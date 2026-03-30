import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  checkUrl,
  unifiedApolloSearch,
  computeEnrichmentQuality,
  type UnifiedSearchResult,
} from "../_shared/search-utils.ts";
import {
  checkRateLimit,
  rateLimitResponse,
  extractUserIdFromRequest,
} from "../_shared/rate-limit.ts";

interface LeadInput {
  lead_id: string;
  person_name: string;
  company_name: string;
  email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  const userId = extractUserIdFromRequest(req);
  const { allowed, retryAfterMs } = checkRateLimit(userId);
  if (!allowed) {
    return rateLimitResponse(retryAfterMs, corsHeaders);
  }

  try {
    const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY");
    if (!APOLLO_API_KEY) throw new Error("APOLLO_API_KEY is not configured");

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") || null;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || null;

    const body = await req.json();

    let leads: LeadInput[];
    if (body.leads) {
      leads = body.leads;
    } else if (body.company_name || body.person_name) {
      leads = [{
        lead_id: body.lead_id || "single",
        person_name: body.person_name || "",
        company_name: body.company_name || "",
        email: body.email || "",
      }];
    } else {
      return new Response(
        JSON.stringify({ error: "No leads provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Enrichment pipeline: ${leads.length} lead(s) — Apollo→Firecrawl→Perplexity`);

    const BATCH_SIZE = 5;
    const allResults: UnifiedSearchResult[] = [];

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map((l) => l.company_name || l.person_name).join(", ")}`);

      // Main enrichment pipeline (Apollo + Perplexity inline)
      const batchResults = await unifiedApolloSearch(
        batch,
        APOLLO_API_KEY,
        PERPLEXITY_API_KEY,
        FIRECRAWL_API_KEY,
      );

      // Post-pipeline: validate all website URLs
      for (const r of batchResults) {
        if (r.website) {
          const alive = await checkUrl(r.website);
          if (!alive) {
            console.log(`[${r.lead_id}] Website dead after pipeline: ${r.website}`);
            r.website = "";
            r.enrichment_quality = computeEnrichmentQuality(r);
          }
        }
      }

      allResults.push(...batchResults);

      if (i + BATCH_SIZE < leads.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const found = allResults.filter((r) => r.website || r.ig_username || r.linkedin_url || r.title);
    const quality = {
      full: allResults.filter((r) => r.enrichment_quality === "full").length,
      partial: allResults.filter((r) => r.enrichment_quality === "partial").length,
      minimal: allResults.filter((r) => r.enrichment_quality === "minimal").length,
      none: allResults.filter((r) => r.enrichment_quality === "none").length,
    };
    console.log(`Done. Enriched ${found.length}/${leads.length} leads. Quality: ${JSON.stringify(quality)}`);

    if (!body.leads && allResults.length === 1) {
      const r = allResults[0];
      const responseBody: Record<string, any> = {
        website: r.website,
        ig_username: r.ig_username,
        linkedin_url: r.linkedin_url,
        title: r.title,
        company_note: r.company_note,
        enrichment_quality: r.enrichment_quality,
      };
      if (body.debug) {
        responseBody._debug = allResults;
      }
      return new Response(
        JSON.stringify(responseBody),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ results: allResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Enrichment pipeline error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
