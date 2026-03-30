const ALLOWED_ORIGINS = [
  "https://dffkqamssoiobdbwqlnw.supabase.co",
  "https://lovable.dev",
  "https://id-preview--nbapikonxwnuxvkgxoeb.lovable.app",
];

const CORS_HEADERS_BASE = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function extraCorsOrigins(): string[] {
  const raw = Deno.env.get("EXTRA_CORS_ORIGINS") || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o))) return true;
  if (extraCorsOrigins().includes(origin)) return true;
  if (origin.endsWith(".lovable.app") || origin.endsWith(".lovable.dev")) return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (origin === "http://localhost:8080" || origin.startsWith("http://localhost:")) return true;
  if (origin.startsWith("http://127.0.0.1:")) return true;
  return false;
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get("origin") || "";
  const isAllowed = isOriginAllowed(origin);
  // Credentialed fetches require a specific ACAO matching the page origin; unknown origins get a fixed value so the browser blocks.
  const allowOrigin = isAllowed && origin ? origin : ALLOWED_ORIGINS[0];

  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
  };
}

export function handleCorsOptions(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}
