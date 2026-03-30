export type CrmStatus = "contact" | "proposal" | "order" | "lost" | "" | (string & NonNullable<unknown>);
export type Priority = 1 | 2 | 3 | 4;
export type PipelineStage = "new" | "first_contact" | "meeting" | "proposal" | "production" | "delivery" | "lost";

export interface Lead {
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
  ig_username?: string;
  website?: string;
  tier?: number;
  crm_status?: CrmStatus;
  // Apollo enrichment fields
  title?: string;         // Job title (Founder, CEO, GM, etc.)
  company_note?: string;  // Sector, employees, location, revenue
  am?: boolean;           // Account Management worthy
  linkedin_url?: string;
  enriched?: boolean;     // Whether Apollo enrichment has been done
  enrichment_quality?: string;   // full | partial | minimal | none
  enrichment_attempts?: number;
  last_enriched_at?: string;
  pipeline_stage?: PipelineStage;
  priority_override?: number;
  am_person?: string;
  company_name_override?: string;
  full_name_override?: string;
}

export const leads: Lead[] = [
  { id: "956822140035738", created_time: "2026-03-14T05:11:58+03:00", ad_id: "120241672012850556", ad_name: "video_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1452771829576464", created_time: "2026-03-14T22:09:08+03:00", ad_id: "120241671768820556", ad_name: "static_etkinlikmuzea", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1999927194272753", created_time: "2026-03-15T16:46:02+03:00", ad_id: "120241671421880556", ad_name: "factoryvideo", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "fb", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "25958844420462409", created_time: "2026-03-16T12:07:13+03:00", ad_id: "120241671912660556", ad_name: "static_sirketekibinkurumsal", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "aksesuar", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1555210068920978", created_time: "2026-03-15T18:31:58+03:00", ad_id: "120241671912660556", ad_name: "static_sirketekibinkurumsal", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "925413170215348", created_time: "2026-03-13T21:45:59+03:00", ad_id: "120241671912660556", ad_name: "static_sirketekibinkurumsal", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "936833418741562", created_time: "2026-03-13T16:58:00+03:00", ad_id: "120241671912660556", ad_name: "static_sirketekibinkurumsal", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "50-100", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "2312148516226940", created_time: "2026-03-15T23:33:06+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "25993229176986981", created_time: "2026-03-15T10:26:02+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1264284012333923", created_time: "2026-03-14T22:59:07+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1948752839065212", created_time: "2026-03-14T22:26:54+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "50-100", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1215380707344557", created_time: "2026-03-14T22:24:50+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1587394875827205", created_time: "2026-03-14T17:58:07+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "3915636591902266", created_time: "2026-03-14T11:42:06+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "50-100", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "1631046384575924", created_time: "2026-03-13T19:13:03+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "930514243268811", created_time: "2026-03-13T17:41:03+03:00", ad_id: "120241671630160556", ad_name: "static_caferest", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
  { id: "34182887254693317", created_time: "2026-03-13T19:14:59+03:00", ad_id: "120241671877880556", ad_name: "static_konsermuzika", adset_id: "120241670205310556", adset_name: "mass Ad Set", campaign_id: "120241670205300556", campaign_name: "mass Campaign", form_id: "947137654532515", form_name: "B2B Lead Ad - 13.03-LATEST", is_organic: false, platform: "ig", product_type: "giyim", quantity: "16-50", sirket_adi: "", adi_soyadi: "", eposta: "", telefon: "", lead_status: "", company_name: "", full_name: "", email: "", phone_number: "", special_comments: "" },
];

// Category detection based on ad_name patterns
export function categorizeLeadByAd(adName: string): string {
  const lower = adName.toLowerCase();
  if (lower.includes("caferest")) return "Cafe / Restaurant";
  if (lower.includes("sirketekibinkurumsal") || lower.includes("kurumsal")) return "Corporate";
  if (lower.includes("konsermuzika") || lower.includes("etkinlikmuzea")) return "Event / Music";
  if (lower.includes("factory")) return "Factory";
  if (lower.includes("b2b")) return "B2B Video";
  return "Other";
}

export function getLeadCategories(data: Lead[]) {
  const categories: Record<string, number> = {};
  data.forEach((lead) => {
    const cat = categorizeLeadByAd(lead.ad_name);
    categories[cat] = (categories[cat] || 0) + 1;
  });
  return categories;
}

export function getQuantityBreakdown(data: Lead[]) {
  const breakdown: Record<string, number> = {};
  data.forEach((lead) => {
    const q = lead.quantity || "Unknown";
    breakdown[q] = (breakdown[q] || 0) + 1;
  });
  return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
}

export function getProductBreakdown(data: Lead[]) {
  const breakdown: Record<string, number> = {};
  data.forEach((lead) => {
    const p = lead.product_type || "Unknown";
    breakdown[p] = (breakdown[p] || 0) + 1;
  });
  return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
}

// Quantity to numeric score
export function qtyToScore(qty: string): number {
  const q = qty.toLowerCase().trim();
  if (q === "100+" || q === "100") return 40;
  if (q.includes("50-100") || q.includes("51-100")) return 30;
  if (q.includes("16-50")) return 20;
  if (q.includes("1-15")) return 10;
  return 5;
}

export function isExecutiveTitle(title?: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  const keywords = [
    "founder", "co-founder", "cofounder",
    "ceo", "chief executive",
    "gm", "general manager", "genel müdür",
    "owner", "sahib", "kurucu",
    "managing director", "md",
    "president", "başkan",
    "partner", "ortak",
    "direktör", "director",
    "müdür",
    "yönetici",
    "bireysel müşteri", "bireysel",
    "sahip",
  ];
  return keywords.some((kw) => t.includes(kw));
}

function qtyMinimum(qty: string): number {
  const q = qty.toLowerCase().trim();
  if (q === "100+" || q === "100") return 100;
  if (q.includes("50-100") || q.includes("51-100")) return 50;
  if (q.includes("16-50")) return 16;
  if (q.includes("1-15")) return 1;
  return 0;
}

// NEW Priority calculation:
// P1: Founder/CEO/GM + QTY 50+
// P2: Founder/CEO/GM (any QTY) OR QTY 100+
// P3: QTY 50-100
// P4: Others
export function computePriority(lead: Lead): Priority {
  const isExec = isExecutiveTitle(lead.title);
  const qtyMin = qtyMinimum(lead.quantity);

  if (isExec && qtyMin >= 50) return 1;
  if (isExec || qtyMin >= 100) return 2;
  if (qtyMin >= 50) return 3;
  return 4;
}

// Compute priority map for a set of leads
export function computeTiers(data: Lead[]): Map<string, number> {
  const tiers = new Map<string, number>();
  data.forEach((lead) => {
    tiers.set(lead.id, lead.priority_override ?? computePriority(lead));
  });
  return tiers;
}

export function effectivePriority(lead: Lead): Priority {
  return (lead.priority_override ?? computePriority(lead)) as Priority;
}

export const AM_PEOPLE = ["Hazal", "Engin"] as const;

const RESERVED_INSTAGRAM_PATHS = new Set([
  "p", "reel", "reels", "stories", "explore", "accounts",
  "directory", "about", "developer", "legal", "tv",
]);

export function normalizeInstagramUsername(input?: string | null): string {
  if (!input) return "";
  let value = input.trim();
  if (!value) return "";
  if (value.startsWith("@")) value = value.slice(1);
  if (value.includes("instagram.com")) {
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "instagram.com") return "";
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length !== 1) return "";
      value = segments[0] || "";
    } catch {
      return "";
    }
  }
  value = value.replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(value)) return "";
  if (RESERVED_INSTAGRAM_PATHS.has(value)) return "";
  return value;
}

export function normalizeWebsiteUrl(input?: string | null): string {
  if (!input) return "";
  const value = input.trim();
  if (!value) return "";
  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    return parsed.toString();
  } catch {
    return "";
  }
}

export function getLeadPrimaryUrl(lead: Lead): string {
  const website = normalizeWebsiteUrl(lead.website);
  if (website) return website;
  const igUsername = normalizeInstagramUsername(lead.ig_username);
  if (igUsername) return `https://www.instagram.com/${igUsername}/`;
  return "";
}
