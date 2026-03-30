function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textToBase64url(text: string): string {
  return base64url(new TextEncoder().encode(text));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function createSignedJwt(email: string, privateKey: string, scopes: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = textToBase64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = textToBase64url(
    JSON.stringify({
      iss: email,
      scope: scopes,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${base64url(signature)}`;
}

export async function getGoogleAccessToken(email: string, privateKey: string, scopes: string): Promise<string> {
  const jwt = await createSignedJwt(email, privateKey, scopes);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed [${res.status}]: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
  const extracted = key.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/
  );
  let body = (extracted?.[1] ?? key).replace(/[^A-Za-z0-9+/=]/g, "");
  if (body.startsWith("nMII")) {
    body = body.slice(1);
  }
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}

export function parseServiceAccountSecret(secret: string): ServiceAccountCredentials {
  try {
    const parsed = JSON.parse(secret) as ServiceAccountCredentials & { web?: unknown };
    if (parsed.web && !parsed.private_key) {
      throw new Error("OAuth client JSON cannot be used as GOOGLE_SERVICE_ACCOUNT_KEY; use GOOGLE_OAUTH_CLIENT_JSON + GOOGLE_OAUTH_REFRESH_TOKEN");
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("Service account JSON is missing client_email or private_key");
    }
    return {
      client_email: parsed.client_email,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OAuth client JSON")) throw e;
    const fallbackEmail =
      Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") ||
      "reflectleadads@agency-bulk-upload-meta.iam.gserviceaccount.com";
    return {
      client_email: fallbackEmail,
      private_key: normalizePrivateKey(secret),
    };
  }
}

function parseOAuthWebCredentials(): { client_id: string; client_secret: string } | null {
  const raw = Deno.env.get("GOOGLE_OAUTH_CLIENT_JSON")?.trim();
  let clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")?.trim();
  let clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { web?: { client_id?: string; client_secret?: string }; installed?: { client_id?: string; client_secret?: string } };
      const w = parsed.web || parsed.installed;
      if (w?.client_id && w?.client_secret) {
        clientId = w.client_id;
        clientSecret = w.client_secret;
      }
    } catch {
      return null;
    }
  }
  if (clientId && clientSecret) return { client_id: clientId, client_secret: clientSecret };
  return null;
}

/** OAuth refresh_token flow (web / installed client JSON). */
export async function getGoogleAccessTokenFromRefresh(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth refresh failed [${res.status}]: ${err}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

/**
 * Sheets read access: prefer service account JWT; else OAuth refresh token + client JSON/ID.
 */
export async function getGoogleSheetsAccessToken(scopes: string): Promise<string> {
  const saRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY")?.trim();
  if (saRaw) {
    const trimmed = saRaw;
    if (trimmed.includes('"web"') && trimmed.includes("client_secret") && !trimmed.includes("private_key")) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_KEY contains OAuth client JSON. Set GOOGLE_OAUTH_CLIENT_JSON instead and add GOOGLE_OAUTH_REFRESH_TOKEN.",
      );
    }
    const saKey = parseServiceAccountSecret(trimmed);
    return getGoogleAccessToken(saKey.client_email, saKey.private_key, scopes);
  }

  const refresh = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN")?.trim();
  const oauth = parseOAuthWebCredentials();
  if (refresh && oauth) {
    return getGoogleAccessTokenFromRefresh(refresh, oauth.client_id, oauth.client_secret);
  }

  throw new Error(
    "Google Sheets auth not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY (service account JSON) " +
      "OR GOOGLE_OAUTH_CLIENT_JSON + GOOGLE_OAUTH_REFRESH_TOKEN (and enable Sheets API for the OAuth client).",
  );
}
