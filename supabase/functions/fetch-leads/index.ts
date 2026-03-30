import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { getGoogleSheetsAccessToken } from "../_shared/google-auth.ts";

const DEFAULT_ADS_SHEET_ID =
  "1i1N6kgEilos9AfMnM1p9k8GQtTRlAlOOxfCY7q7NsDE";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

/** Comma-separated in GOOGLE_SHEET_IDS_ADS or GOOGLE_SHEET_ID_ADS; falls back to one default ID. */
function adsSpreadsheetIds(): string[] {
  const raw =
    Deno.env.get("GOOGLE_SHEET_IDS_ADS")?.trim() ||
    Deno.env.get("GOOGLE_SHEET_ID_ADS")?.trim() ||
    "";
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [DEFAULT_ADS_SHEET_ID];
}

/** A1 tab segment (always quoted — safe for spaces, Turkish chars, etc.). */
function sheetTabToA1Segment(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

async function resolveAdsSheetTab(
  accessToken: string,
  spreadsheetId: string,
): Promise<string> {
  const fromEnv = Deno.env.get("GOOGLE_SHEET_TAB_ADS")?.trim();
  if (fromEnv) return fromEnv;

  const metaUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(
      `Sheets metadata error [${metaRes.status}]: ${await metaRes.text()}`,
    );
  }
  const meta = await metaRes.json();
  const titles: string[] = (meta.sheets ?? [])
    .map((s: { properties?: { title?: string } }) => s.properties?.title)
    .filter((t: string | undefined): t is string => Boolean(t));
  if (!titles.length) throw new Error("Spreadsheet has no sheet tabs");

  const preferred = titles.find((t) => t.toLowerCase() === "leads");
  if (preferred) return preferred;

  return titles[0];
}

async function fetchAdsSheetRows(
  accessToken: string,
  spreadsheetId: string,
): Promise<string[][]> {
  const tabTitle = await resolveAdsSheetTab(accessToken, spreadsheetId);
  const range = encodeURIComponent(`${sheetTabToA1Segment(tabTitle)}!A:Z`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const sheetsRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!sheetsRes.ok) {
    const errText = await sheetsRes.text();
    throw new Error(
      `Google Sheets API error [${sheetsRes.status}] (${spreadsheetId}): ${errText}`,
    );
  }

  const sheetsData = await sheetsRes.json();
  return sheetsData.values || [];
}

interface SheetLead {
  id: string;
  created_time: string;
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  form_id: string;
  form_name: string;
  is_organic: boolean;
  platform: string;
  product_type: string;
  quantity: string;
  sirket_adi: string;
  adi_soyadi: string;
  eposta: string;
  telefon: string;
  lead_status: string;
  company_name: string;
  full_name: string;
  email: string;
  phone_number: string;
  special_comments: string;
  title: string;
}

function pickHeader(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const lk = k.trim().toLowerCase();
    const v = obj[lk];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function rowToLead(headers: string[], row: string[]): SheetLead {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h.trim().toLowerCase()] = (row[i] ?? "").trim();
  });

  const budgetQty = pickHeader(obj, [
    "what_is_your_anticipated_monthly_budget_for_these_products?",
    "what is your anticipated monthly budget for these products?",
  ]);
  const companyType = pickHeader(obj, [
    "which_best_describes_your_business?",
    "which best describes your business?",
  ]);
  const productInterest = pickHeader(obj, [
    "which_products_are_you_interested_in?",
    "which products are you interested in?",
  ]);

  return {
    id: obj["id"] || "",
    created_time: obj["created_time"] || "",
    ad_id: obj["ad_id"] || "",
    ad_name: obj["ad_name"] || "",
    adset_id: obj["adset_id"] || "",
    adset_name: obj["adset_name"] || "",
    campaign_id: obj["campaign_id"] || "",
    campaign_name: obj["campaign_name"] || "",
    form_id: obj["form_id"] || "",
    form_name: obj["form_name"] || "",
    is_organic: (obj["is_organic"] || "").toLowerCase() === "true",
    platform: obj["platform"] || "",
    product_type:
      productInterest ||
      obj["product_type"] ||
      obj["_ne_tür_bir_ürüne_ihtiyacınız_var?"] ||
      "",
    quantity:
      budgetQty ||
      obj["quantity"] ||
      obj["kaç_adet_ürün_istiyorsunuz?"] ||
      "",
    sirket_adi: obj["sirket_adi"] || obj["şirket_adı"] || "",
    adi_soyadi: obj["adi_soyadi"] || obj["adı_soyadı"] || "",
    eposta: obj["eposta"] || obj["e-posta"] || "",
    telefon: obj["telefon"] || obj["telefon_numarası"] || "",
    lead_status: obj["lead_status"] || "",
    company_name:
      companyType ||
      obj["company_name"] ||
      obj["sirket_adi"] ||
      obj["şirket_adı"] ||
      "",
    full_name: obj["full_name"] || "",
    email: obj["email"] || "",
    phone_number: obj["phone_number"] || "",
    special_comments: obj["special_comments"] || "",
    title: "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const accessToken = await getGoogleSheetsAccessToken(SCOPES);
    const spreadsheetIds = adsSpreadsheetIds();

    const seenIds = new Set<string>();
    const allLeads: SheetLead[] = [];

    for (const spreadsheetId of spreadsheetIds) {
      const rows = await fetchAdsSheetRows(accessToken, spreadsheetId);
      if (rows.length < 2) continue;

      const headers = rows[0];
      for (const dataRow of rows.slice(1)) {
        const lead = rowToLead(headers, dataRow);
        if (lead.id) {
          if (seenIds.has(lead.id)) continue;
          seenIds.add(lead.id);
        }
        allLeads.push(lead);
      }
    }

    let since: string | null = null;
    try {
      const body = await req.json();
      since = body?.since || null;
    } catch {
      // GET request or empty body -- return all
    }

    const leads = since
      ? allLeads.filter((l) => l.created_time && l.created_time >= since)
      : allLeads;

    return new Response(JSON.stringify({ leads, total: allLeads.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching leads:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
