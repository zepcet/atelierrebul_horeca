import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  getGoogleAccessToken,
  parseServiceAccountSecret,
} from "../_shared/google-auth.ts";

const SHEET_ID =
  Deno.env.get("GOOGLE_SHEET_ID_WEBSITE") ||
  "1pj2OfUnRo_iAHh9zVCY_UM9Aadk1F1kSfRTtn0H5uJs";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  const corsHeaders = getCorsHeaders(req);

  try {
    const saSecret = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saSecret) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");

    const saKey = parseServiceAccountSecret(saSecret);
    const accessToken = await getGoogleAccessToken(saKey.client_email, saKey.private_key, SCOPES);

    // Resolve the actual sheet tab name dynamically
    let tabName = "";
    if (!tabName) {
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`;
      const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!metaRes.ok) throw new Error(`Sheets metadata error [${metaRes.status}]: ${await metaRes.text()}`);
      const metaData = await metaRes.json();
      tabName = metaData.sheets?.[0]?.properties?.title || "Sheet1";
    }

    const range = encodeURIComponent(`${tabName}!A:Z`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;
    const sheetsRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!sheetsRes.ok) throw new Error(`Google Sheets API error [${sheetsRes.status}]: ${await sheetsRes.text()}`);

    const sheetsData = await sheetsRes.json();
    const rows: string[][] = sheetsData.values || [];

    if (rows.length < 2) {
      return new Response(JSON.stringify({ leads: [], headers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[0].map((h: string) => h.trim());
    const rawLeads = rows.slice(1).map((row, idx) => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, i: number) => {
        obj[h] = (row[i] ?? "").trim();
      });
      obj._row_idx = String(idx);
      return obj;
    });

    // Deduplicate: same email + name + quantity + product = same lead
    const seen = new Map<string, Record<string, string>>();
    for (const lead of rawLeads) {
      const email = (lead["Email"] || "").toLowerCase().trim();
      const firstName = (lead["First Name"] || "").toLowerCase().trim();
      const lastName = (lead["Last Name"] || "").toLowerCase().trim();
      const qty = (lead["How much do you need? (units)"] || "").trim();
      const products = (lead["What kind of product do you need?"] || "")
        .split(",")
        .map((p: string) => p.trim().toLowerCase())
        .sort()
        .join(",");

      const key = `${email}|${firstName}|${lastName}|${qty}|${products}`;
      if (!seen.has(key)) {
        seen.set(key, lead);
      }
    }

    const leads = Array.from(seen.values()).map((obj) => {
      obj._row_id = obj["id"] || obj["ID"] || `website-lead-${obj._row_idx}`;
      delete obj._row_idx;
      return obj;
    });

    console.log(`Website leads: ${rawLeads.length} rows → ${leads.length} unique leads (${rawLeads.length - leads.length} duplicates removed)`);

    return new Response(JSON.stringify({ leads, headers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching website leads:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
