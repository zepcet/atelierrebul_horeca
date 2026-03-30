import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

function ensureActId(adAccountId: string) {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

function extractMetrics(row: any, dateFrom: string, dateTo: string) {
  const actions: { action_type: string; value: string }[] = row.actions || [];
  const costPerAction: { action_type: string; value: string }[] = row.cost_per_action_type || [];

  const linkClickAction = actions.find((a: any) => a.action_type === "link_click");
  const linkClicks = linkClickAction ? parseInt(linkClickAction.value, 10) : 0;

  const leadAction = actions.find((a: any) => a.action_type === "onsite_conversion.lead_grouped")
    || actions.find((a: any) => a.action_type === "offsite_complete_registration_add_meta_leads");
  const leadCost = costPerAction.find((a: any) => a.action_type === "onsite_conversion.lead_grouped")
    || costPerAction.find((a: any) => a.action_type === "offsite_complete_registration_add_meta_leads");

  const spend = parseFloat(row.spend || "0");
  const impressions = parseInt(row.impressions || "0", 10);

  return {
    impressions,
    clicks: linkClicks,
    spend,
    cpc: linkClicks > 0 ? spend / linkClicks : 0,
    cpm: parseFloat(row.cpm || "0"),
    ctr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    reach: parseInt(row.reach || "0", 10),
    actions,
    leads: leadAction ? parseInt(leadAction.value, 10) : 0,
    cost_per_lead: leadCost ? parseFloat(leadCost.value) : 0,
    date_start: row.date_start || dateFrom,
    date_stop: row.date_stop || dateTo,
  };
}

const INSIGHT_FIELDS = [
  "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
  "impressions", "clicks", "spend", "cpc", "cpm", "ctr", "reach", "actions", "cost_per_action_type",
].join(",");

async function fetchCampaigns(accessToken: string, adAccountId: string): Promise<any[]> {
  const actId = ensureActId(adAccountId);
  const url = `${META_BASE_URL}/${actId}/campaigns?fields=id,name,status,objective&limit=100&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta campaigns API error [${res.status}]: ${err}`);
  }
  const data = await res.json();
  return data.data || [];
}

async function fetchAdImagesByHashes(
  accessToken: string,
  adAccountId: string,
  hashes: string[]
): Promise<Map<string, string>> {
  const actId = ensureActId(adAccountId);
  const hashToImageUrl = new Map<string, string>();
  const uniqueHashes = [...new Set(hashes.filter(Boolean))];

  const chunkSize = 50;
  for (let i = 0; i < uniqueHashes.length; i += chunkSize) {
    const chunk = uniqueHashes.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const hashesParam = encodeURIComponent(JSON.stringify(chunk));
    const url = `${META_BASE_URL}/${actId}/adimages?fields=hash,permalink_url,url,original_width,original_height&hashes=${hashesParam}&limit=500&access_token=${accessToken}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error("Failed to fetch ad images by hash:", await res.text());
      continue;
    }

    const data = await res.json();
    for (const image of (data.data || [])) {
      const bestUrl = image.permalink_url || image.url || "";
      if (image.hash && bestUrl) {
        hashToImageUrl.set(image.hash, bestUrl);
      }
    }
  }

  return hashToImageUrl;
}

async function fetchAdCreatives(accessToken: string, adAccountId: string): Promise<Map<string, string>> {
  const actId = ensureActId(adAccountId);
  const thumbnailMap = new Map<string, string>();
  const ads: any[] = [];

  let url: string | null = `${META_BASE_URL}/${actId}/ads?fields=id,full_picture,creative{image_hash,image_url,thumbnail_url,object_story_spec}&limit=200&access_token=${accessToken}`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Failed to fetch ad creatives:", await res.text());
      break;
    }

    const data = await res.json();
    ads.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  const imageHashes = ads.flatMap((ad: any) => [
    ad.creative?.image_hash,
    ad.creative?.object_story_spec?.link_data?.image_hash,
    ad.creative?.object_story_spec?.video_data?.image_hash,
  ]).filter((hash: unknown): hash is string => typeof hash === "string" && hash.length > 0);

  const hashToImageUrl = await fetchAdImagesByHashes(accessToken, adAccountId, imageHashes);

  for (const ad of ads) {
    const imageHash = ad.creative?.image_hash
      || ad.creative?.object_story_spec?.link_data?.image_hash
      || ad.creative?.object_story_spec?.video_data?.image_hash
      || "";

    const imageUrl = (imageHash ? hashToImageUrl.get(imageHash) : undefined)
      || ad.full_picture
      || ad.creative?.image_url
      || ad.creative?.object_story_spec?.video_data?.image_url
      || ad.creative?.object_story_spec?.link_data?.image_url
      || ad.creative?.thumbnail_url
      || "";

    if (imageUrl) {
      thumbnailMap.set(ad.id, imageUrl);
    }
  }

  return thumbnailMap;
}

async function fetchInsightsAtLevel(
  accessToken: string,
  adAccountId: string,
  level: "campaign" | "adset" | "ad",
  dateFrom: string,
  dateTo: string
): Promise<any[]> {
  const actId = ensureActId(adAccountId);
  const url = `${META_BASE_URL}/${actId}/insights?fields=${INSIGHT_FIELDS}&level=${level}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&limit=500&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta insights API error [${res.status}] (level=${level}): ${err}`);
  }
  const data = await res.json();
  return data.data || [];
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) throw new Error("META_ACCESS_TOKEN is not configured. Set it in Supabase Edge Function secrets.");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!adAccountId) throw new Error("META_AD_ACCOUNT_ID is not configured");

    // Validate token by making a lightweight debug call
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    if (debugRes.ok) {
      const debugData = await debugRes.json();
      const tokenData = debugData.data;
      if (tokenData?.error) {
        throw new Error(`META_ACCESS_TOKEN is invalid: ${tokenData.error.message}. Generate a new long-lived token or System User token.`);
      }
      if (tokenData?.expires_at) {
        const expiresAt = new Date(tokenData.expires_at * 1000);
        const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / 86400000);
        if (daysUntilExpiry < 7) {
          console.warn(`META_ACCESS_TOKEN expires in ${daysUntilExpiry} days (${expiresAt.toISOString()}). Refresh soon!`);
        }
      }
    }

    let dateFrom: string;
    let dateTo: string;
    try {
      const body = await req.json();
      dateFrom = body.date_from || getDefaultDateFrom();
      dateTo = body.date_to || getDefaultDateTo();
    } catch {
      dateFrom = getDefaultDateFrom();
      dateTo = getDefaultDateTo();
    }

    const [campaignsList, campaignInsights, adsetInsights, adInsights, adCreatives] = await Promise.all([
      fetchCampaigns(accessToken, adAccountId),
      fetchInsightsAtLevel(accessToken, adAccountId, "campaign", dateFrom, dateTo),
      fetchInsightsAtLevel(accessToken, adAccountId, "adset", dateFrom, dateTo),
      fetchInsightsAtLevel(accessToken, adAccountId, "ad", dateFrom, dateTo),
      fetchAdCreatives(accessToken, adAccountId),
    ]);

    /** Only campaigns whose name contains this substring (e.g. c:horeca_obj:lead). */
    const campaignNameNeedle = (
      Deno.env.get("META_CAMPAIGN_NAME_SUBSTRING") || "horeca_obj:lead"
    ).toLowerCase();
    const leadCampaigns = campaignsList.filter(
      (c: any) =>
        typeof c.name === "string" &&
        c.name.toLowerCase().includes(campaignNameNeedle),
    );
    const leadCampaignIds = new Set(leadCampaigns.map((c: any) => String(c.id)));

    const filteredCampaignInsights = campaignInsights.filter((row: any) =>
      leadCampaignIds.has(String(row.campaign_id)),
    );
    const filteredAdsetInsights = adsetInsights.filter((row: any) =>
      leadCampaignIds.has(String(row.campaign_id)),
    );
    const filteredAdInsights = adInsights.filter((row: any) =>
      leadCampaignIds.has(String(row.campaign_id)),
    );

    const statusMap = new Map(leadCampaigns.map((c: any) => [c.id, c.status]));

    const adRows = filteredAdInsights.map((row: any) => ({
      ad_id: row.ad_id || "",
      ad_name: row.ad_name || "",
      adset_id: row.adset_id || "",
      campaign_id: row.campaign_id || "",
      thumbnail_url: adCreatives.get(row.ad_id) || "",
      ...extractMetrics(row, dateFrom, dateTo),
    }));

    const adsetRows = filteredAdsetInsights.map((row: any) => ({
      adset_id: row.adset_id || "",
      adset_name: row.adset_name || "",
      campaign_id: row.campaign_id || "",
      ...extractMetrics(row, dateFrom, dateTo),
      ads: adRows.filter((a: any) => a.adset_id === row.adset_id),
    }));

    const campaignRows = filteredCampaignInsights.map((row: any) => ({
      campaign_id: row.campaign_id || "",
      campaign_name: row.campaign_name || "",
      status: statusMap.get(row.campaign_id) || "UNKNOWN",
      ...extractMetrics(row, dateFrom, dateTo),
      adsets: adsetRows.filter((as: any) => as.campaign_id === row.campaign_id),
    }));

    const totals = campaignRows.reduce(
      (acc: any, row: any) => ({
        impressions: acc.impressions + row.impressions,
        clicks: acc.clicks + row.clicks,
        spend: acc.spend + row.spend,
        reach: acc.reach + row.reach,
        leads: acc.leads + row.leads,
      }),
      { impressions: 0, clicks: 0, spend: 0, reach: 0, leads: 0 }
    );

    const totalCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;
    const totalCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    return new Response(
      JSON.stringify({
        campaigns: campaignRows,
        totals: { ...totals, cost_per_lead: totalCPL, ctr: totalCTR },
        date_range: { from: dateFrom, to: dateTo },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching Meta campaigns:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
