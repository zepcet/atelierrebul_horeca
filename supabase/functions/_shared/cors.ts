const ALLOWED_ORIGINS = [
  "https://nbapikonxwnuxvkgxoeb.supabase.co",
  "https://lovable.dev",
  "https://id-preview--nbapikonxwnuxvkgxoeb.lovable.app",
];

const CORS_HEADERS_BASE = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get("origin") || "";
  const isAllowed =
    ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o)) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovable.dev") ||
    origin === "http://localhost:8080" ||
    origin.startsWith("http://localhost:");

  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    Vary: "Origin",
  };
}

export function handleCorsOptions(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}
