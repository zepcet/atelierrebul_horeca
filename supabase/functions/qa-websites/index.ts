import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

interface WebsiteCheck {
  lead_id: string;
  current_website: string;
}

interface FixResult {
  lead_id: string;
  old_website: string;
  new_website: string;
  status: "ok" | "cleared";
}

function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).toString();
  } catch {
    return "";
  }
}

// Kept inline: this version has more blocked hosts and extension checks than
// the shared isCompanyWebsite in search-utils.ts.
function isLikelyCompanyWebsite(url: string): boolean {
  const normalized = normalizeWebsite(url);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.toLowerCase();
    const blockedHosts = [
      "instagram.com", "facebook.com", "linkedin.com", "x.com", "twitter.com", "youtube.com", "tiktok.com",
      "linktr.ee", "researchgate.net", "soundcloud.com", "slowfood.com", "sbb.gov.tr",
      "sanayi.gov.tr", "tarimorman.gov.tr", "unis.gop.edu.tr", "kilimgazetesi.de", "nsosyal.com",
    ];
    const blockedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];

    if (blockedHosts.some((domain) => host === domain || host.endsWith(`.${domain}`))) return false;
    if (blockedExtensions.some((ext) => pathname.endsWith(ext))) return false;
    return true;
  } catch {
    return false;
  }
}

async function checkUrl(url: string): Promise<boolean> {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http")) {
    formattedUrl = `https://${formattedUrl}`;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(formattedUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(formattedUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      return res.status < 500;
    } catch {
      return false;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    const checks: WebsiteCheck[] = body.checks || [];

    if (checks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No websites to check" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`QA checking ${checks.length} websites...`);

    const results: FixResult[] = await Promise.all(
      checks.map(async (c) => {
        const normalizedWebsite = normalizeWebsite(c.current_website);
        if (!normalizedWebsite || !isLikelyCompanyWebsite(normalizedWebsite)) {
          return { lead_id: c.lead_id, old_website: "", new_website: "", status: "cleared" as const };
        }
        const alive = await checkUrl(normalizedWebsite);
        return {
          lead_id: c.lead_id,
          old_website: normalizedWebsite,
          new_website: alive ? normalizedWebsite : "",
          status: alive ? ("ok" as const) : ("cleared" as const),
        };
      })
    );

    const ok = results.filter((r) => r.status === "ok").length;
    const cleared = results.filter((r) => r.status === "cleared").length;
    console.log(`QA done: ${ok} OK, ${cleared} cleared`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("QA error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
