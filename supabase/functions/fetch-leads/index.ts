import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  getGoogleAccessToken,
  parseServiceAccountSecret,
} from "../_shared/google-auth.ts";

const SHEET_ID =
  Deno.env.get("GOOGLE_SHEET_ID_ADS") ||
  "1nU3uwwsyOHvbMjcx1Xu6HnHh2tmRL4SjISUJCOzhhqs";
const SHEET_TAB = "Leads";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

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
}

function rowToLead(headers: string[], row: string[]): SheetLead {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h.trim().toLowerCase()] = (row[i] ?? "").trim();
  });

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
    product_type: obj["product_type"] || obj["_ne_tür_bir_ürüne_ihtiyacınız_var?"] || "",
    quantity: obj["quantity"] || obj["kaç_adet_ürün_istiyorsunuz?"] || "",
    sirket_adi: obj["sirket_adi"] || obj["şirket_adı"] || "",
    adi_soyadi: obj["adi_soyadi"] || obj["adı_soyadı"] || "",
    eposta: obj["eposta"] || obj["e-posta"] || "",
    telefon: obj["telefon"] || obj["telefon_numarası"] || "",
    lead_status: obj["lead_status"] || "",
    company_name: obj["company_name"] || "",
    full_name: obj["full_name"] || "",
    email: obj["email"] || "",
    phone_number: obj["phone_number"] || "",
    special_comments: obj["special_comments"] || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const saSecret = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saSecret) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
    }

    const saKey = parseServiceAccountSecret(saSecret);
    const accessToken = await getGoogleAccessToken(saKey.client_email, saKey.private_key, SCOPES);

    const range = encodeURIComponent(`${SHEET_TAB}!A:Z`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;

    const sheetsRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetsRes.ok) {
      const errText = await sheetsRes.text();
      throw new Error(`Google Sheets API error [${sheetsRes.status}]: ${errText}`);
    }

    const sheetsData = await sheetsRes.json();
    const rows: string[][] = sheetsData.values || [];

    if (rows.length < 2) {
      return new Response(JSON.stringify({ leads: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[0];
    const allLeads = rows.slice(1).map((row) => rowToLead(headers, row));

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
