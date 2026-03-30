import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

function priorityEmoji(p: number): string {
  switch (p) {
    case 1: return "🟢 P1";
    case 2: return "🔵 P2";
    case 3: return "🟡 P3";
    default: return "⚪ P4";
  }
}

function parseAdName(adName: string): string {
  if (!adName) return "—";
  return adName
    .replace(/^(static|video)_/, (_, type) => type === "video" ? "Video – " : "Statik – ")
    .replace(/caferest/i, "Cafe/Rest")
    .replace(/sirketekibinkurumsal/i, "Kurumsal Ekip")
    .replace(/etkinlikmuze/i, "Etkinlik/Müze")
    .replace(/factoryvideo/i, "Fabrika")
    .replace(/b2b_1\.video/i, "B2B Video");
}

function formatPhone(phone: string): string {
  return (phone || "").replace("p:", "").trim() || "—";
}

function platformLabel(platform: string): string {
  if (platform === "ig") return "Instagram";
  if (platform === "fb") return "Facebook";
  return platform || "—";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  const WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ error: "SLACK_WEBHOOK_URL is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { leads } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No leads to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      const company = lead.sirket_adi || lead.company_name || "—";
      const name = lead.adi_soyadi || lead.full_name || "—";
      const phone = formatPhone(lead.telefon || lead.phone_number);
      const email = lead.eposta || lead.email || "—";
      const platform = platformLabel(lead.platform);
      const adLabel = parseAdName(lead.ad_name);
      const priority = priorityEmoji(lead.priority || 4);
      const title = lead.title || "";
      const qty = lead.quantity || "—";

      const titlePart = title ? ` · ${title}` : "";
      const qtyPart = qty !== "—" ? ` · QTY ${qty}` : "";

      const text = [
        `${priority} *Yeni Lead — ${company}*${titlePart}${qtyPart}`,
        `👤 ${name} · 📞 ${phone} · 📧 ${email}`,
        `Kaynak: ${platform} · Reklam: ${adLabel}`,
      ].join("\n");

      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (resp.ok) {
        sent++;
      } else {
        const body = await resp.text();
        errors.push(`Lead ${lead.id}: ${resp.status} - ${body}`);
      }

      if (leads.length > 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: leads.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("notify-slack error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
