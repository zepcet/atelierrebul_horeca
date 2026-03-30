import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60_000;

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

export function rateLimitResponse(retryAfterMs: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}

export function getSupabaseServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

export function extractUserIdFromRequest(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return "anonymous";
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return "anonymous";
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || "anonymous";
  } catch {
    return "anonymous";
  }
}
