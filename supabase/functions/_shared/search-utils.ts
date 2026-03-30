// ── Utility: Instagram username extraction ────────────────────────
export function extractIgUsername(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname !== "instagram.com") return "";
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return "";
    const username = segments[0].toLowerCase();
    const skip = ["p", "reel", "reels", "stories", "explore", "accounts", "directory", "about", "developer", "legal", "tv"];
    if (!/^[a-z0-9._]{1,30}$/.test(username)) return "";
    if (skip.includes(username)) return "";
    return username;
  } catch {
    return "";
  }
}

// ── Utility: company website filter ───────────────────────────────
export function isCompanyWebsite(url: string): boolean {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
    const socialDomains = [
      "instagram.com", "facebook.com", "twitter.com", "x.com", "linkedin.com",
      "youtube.com", "tiktok.com", "pinterest.com", "reddit.com", "wikipedia.org",
      "google.com", "bing.com", "yahoo.com", "amazon.com", "etsy.com",
      "sahibinden.com", "hepsiburada.com", "trendyol.com", "n11.com",
      "sikayetvar.com", "eksisozluk.com", "linktr.ee", "researchgate.net",
      "soundcloud.com", "slowfood.com", "sbb.gov.tr", "sanayi.gov.tr",
      "tarimorman.gov.tr", "apollo.io", "crunchbase.com",
    ];
    return !socialDomains.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

// ── Utility: URL liveness check ───────────────────────────────────
export async function checkUrl(url: string): Promise<boolean> {
  let formatted = url.trim();
  if (!formatted.startsWith("http")) formatted = `https://${formatted}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(formatted, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MerchBot/1.0)" },
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(formatted, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MerchBot/1.0)" },
      });
      clearTimeout(timeout);
      return res.status < 500;
    } catch {
      return false;
    }
  }
}

// ── Utility: freemail detection ───────────────────────────────────
const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.tr", "hotmail.com",
  "hotmail.com.tr", "outlook.com", "outlook.com.tr", "live.com", "live.com.tr",
  "msn.com", "icloud.com", "me.com", "aol.com", "mail.com", "yandex.com",
  "yandex.com.tr", "protonmail.com", "proton.me", "zoho.com",
  "windowslive.com", "gmx.com", "gmx.de", "mail.ru",
]);

export function extractDomainFromEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain || FREEMAIL_DOMAINS.has(domain)) return "";
  return domain;
}

// ── Utility: LinkedIn URL validation ──────────────────────────────

interface LinkedInValidation {
  valid: boolean;
  type: "person" | "company" | "invalid";
  url: string;
}

export function validateLinkedInUrl(url: string): LinkedInValidation {
  if (!url) return { valid: false, type: "invalid", url: "" };

  let normalized = url.trim();
  if (!normalized.startsWith("http")) normalized = `https://${normalized}`;

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname.includes("linkedin.com")) {
      return { valid: false, type: "invalid", url: "" };
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return { valid: false, type: "invalid", url: "" };

    const kind = segments[0].toLowerCase();
    const slug = segments[1];

    // Reject Apollo's obfuscated hash URLs (e.g. /in/ACwAAB...)
    // These are placeholders Apollo returns when it can't resolve the full profile
    if (/^ACwAA[A-Za-z0-9_-]{10,}$/.test(slug)) {
      return { valid: false, type: "invalid", url: "" };
    }

    if (kind === "in") {
      const cleanUrl = `https://www.linkedin.com/in/${slug}`;
      return { valid: true, type: "person", url: cleanUrl };
    }

    if (kind === "company") {
      const cleanUrl = `https://www.linkedin.com/company/${slug}`;
      return { valid: true, type: "company", url: cleanUrl };
    }

    return { valid: false, type: "invalid", url: "" };
  } catch {
    return { valid: false, type: "invalid", url: "" };
  }
}

// ── Utility: Firecrawl search with retry ──────────────────────────

export async function firecrawlSearch(query: string, apiKey: string, limit = 5, retries = 1): Promise<any[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit }),
      });
      if (res.status === 429) {
        console.log(`Firecrawl rate limited (attempt ${attempt + 1}/${retries + 1}) — stopping to avoid worsening`);
        throw new Error("FIRECRAWL_RATE_LIMITED");
      }
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Firecrawl search error [${res.status}]:`, errorText);
        if (res.status === 402) {
          throw new Error(`FIRECRAWL_CREDITS_EXHAUSTED: ${errorText}`);
        }
        return [];
      }
      const data = await res.json();
      return data.data || [];
    } catch (err: any) {
      if (err?.message?.includes("FIRECRAWL_CREDITS_EXHAUSTED") || err?.message?.includes("FIRECRAWL_RATE_LIMITED")) throw err;
      console.error("Firecrawl search failed:", err);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return [];
    }
  }
  return [];
}

// ── Utility: Firecrawl scrape (for IG extraction from website) ────

export async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["links"],
        onlyMainContent: false,
        timeout: 10000,
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const links: string[] = data.data?.links || [];
    for (const link of links) {
      if (link.includes("instagram.com")) {
        const ig = extractIgUsername(link);
        if (ig) return ig;
      }
    }
    const markdown: string = data.data?.markdown || "";
    const igMatches = markdown.match(/instagram\.com\/([a-z0-9._]{1,30})/gi) || [];
    for (const m of igMatches) {
      const parts = m.split("/");
      const candidate = parts[parts.length - 1]?.toLowerCase();
      if (candidate && /^[a-z0-9._]{1,30}$/.test(candidate)) {
        const skip = ["p", "reel", "reels", "stories", "explore", "accounts"];
        if (!skip.includes(candidate)) return candidate;
      }
    }
    return "";
  } catch {
    return "";
  }
}

// ── Firecrawl: search for website ─────────────────────────────────

export async function firecrawlFindWebsite(
  companyName: string,
  personName: string,
  apiKey: string,
  industry?: string,
): Promise<string> {
  if (!apiKey || !companyName) return "";

  const queries: string[] = [
    `"${companyName}" resmi site:.com.tr OR site:.tr`,
    `"${companyName}" official website`,
  ];
  if (industry) {
    queries.push(`${companyName} ${industry} Turkey`);
  }
  if (personName) {
    queries.push(`${companyName} ${personName} company website`);
  }

  for (const query of queries) {
    try {
      const results = await firecrawlSearch(query, apiKey, 5, 1);
      for (const r of results) {
        const url = r.url || "";
        if (url && isCompanyWebsite(url)) {
          const alive = await checkUrl(url);
          if (alive) return url;
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("FIRECRAWL_CREDITS_EXHAUSTED") || err?.message?.includes("FIRECRAWL_RATE_LIMITED")) {
        console.log(`Firecrawl unavailable — stopping website search`);
        return "";
      }
    }
  }
  return "";
}

// ── Firecrawl: extract title from website about/team page ─────────

export async function firecrawlFindTitle(
  website: string,
  personName: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey || !website || !personName) return "";

  const firstName = personName.trim().split(/\s+/)[0]?.toLowerCase() || "";
  const lastName = personName.trim().split(/\s+/).slice(-1)[0]?.toLowerCase() || "";
  if (!firstName) return "";

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: website,
        formats: ["markdown"],
        onlyMainContent: false,
        timeout: 10000,
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const markdown: string = data.data?.markdown || "";
    if (!markdown) return "";

    const lower = markdown.toLowerCase();
    if (!lower.includes(firstName)) return "";

    const titlePatterns = [
      /(?:founder|ceo|owner|kurucu|genel\s*müdür|sahib|yönetici|direktör|manager|director|başkan|müdür|coo|cfo|cto|partner)/i,
    ];

    const lines = markdown.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      if (lineLower.includes(firstName) || (lastName && lineLower.includes(lastName))) {
        // Check this line and the next 2 lines for a title
        const window = lines.slice(i, i + 3).join(" ");
        for (const pattern of titlePatterns) {
          const match = window.match(pattern);
          if (match) {
            // Try to extract a clean title from context around the match
            const titleArea = window.substring(
              Math.max(0, window.toLowerCase().indexOf(match[0].toLowerCase()) - 30),
              window.toLowerCase().indexOf(match[0].toLowerCase()) + match[0].length + 30,
            ).trim();
            // Clean up: take just the title portion
            const cleaned = titleArea
              .replace(/[#*_\[\]()]/g, "")
              .replace(/\s+/g, " ")
              .trim();
            // Extract the most title-like portion
            const titleMatch = cleaned.match(
              /((?:Co-)?(?:Founder|CEO|Owner|Kurucu|Genel\s*Müdür|İşletme\s*Sahib\w*|Yönetici|Direktör|Manager|Director|Başkan|Müdür|COO|CFO|CTO|Partner)(?:\s*[&\/]\s*(?:CEO|COO|CFO|CTO|Partner|Director|Founder))?)/i,
            );
            if (titleMatch) return titleMatch[1].trim();
            return match[0].trim();
          }
        }
      }
    }
    return "";
  } catch {
    return "";
  }
}

// ── Company name matching with scoring ────────────────────────────

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşüâîû]/gi, "")
    .replace(/\s+/g, "");
}

function companyMatchScore(
  apolloName: string,
  queryName: string,
  apolloDomain: string | undefined,
  emailDomain: string | undefined,
): number {
  if (emailDomain && apolloDomain) {
    const aDom = apolloDomain.toLowerCase().replace(/^www\./, "");
    if (aDom === emailDomain.toLowerCase()) return 100;
  }

  const aN = normalizeForMatch(apolloName);
  const qN = normalizeForMatch(queryName);
  if (!aN || !qN) return 0;

  if (aN === qN) return 90;
  if (aN.includes(qN) || qN.includes(aN)) return 60;

  // Simple bigram overlap for fuzzy Turkish name matching
  const bigrams = (s: string) => {
    const b = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) b.add(s.slice(i, i + 2));
    return b;
  };
  const aB = bigrams(aN);
  const qB = bigrams(qN);
  if (aB.size === 0 || qB.size === 0) return 0;
  let overlap = 0;
  for (const b of aB) if (qB.has(b)) overlap++;
  const dice = (2 * overlap) / (aB.size + qB.size);
  return Math.round(dice * 80);
}

// ── Apollo.io API helpers ─────────────────────────────────────────

interface ApolloOrgResult {
  website_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  short_description?: string;
  industry?: string;
  name?: string;
  id?: string;
  primary_domain?: string;
  estimated_num_employees?: number;
  founded_year?: number;
}

interface ApolloPersonResult {
  linkedin_url?: string;
  title?: string;
  headline?: string;
  name?: string;
  organization?: {
    website_url?: string;
    short_description?: string;
    industry?: string;
    name?: string;
    primary_domain?: string;
  };
}

async function apolloSearchCompany(
  companyName: string,
  apiKey: string,
  emailDomain?: string,
): Promise<ApolloOrgResult | null> {
  if (!companyName && !emailDomain) return null;
  try {
    const body: Record<string, any> = {
      per_page: 5,
      page: 1,
    };
    if (emailDomain) {
      body.q_organization_domains_list = [emailDomain];
    } else {
      body.q_organization_name = companyName;
      body.organization_locations = ["Turkey"];
    }

    const res = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Apollo org search error [${res.status}]:`, await res.text());
      return null;
    }
    const data = await res.json();
    const orgs: any[] = data.organizations || data.accounts || [];
    if (!orgs.length) {
      console.log(`Apollo org search: no results for "${companyName}" (domain=${emailDomain || "none"})`);
      if (emailDomain && companyName) {
        return apolloSearchCompany(companyName, apiKey);
      }
      return null;
    }

    // Score each result and pick the best match
    let bestOrg = orgs[0];
    let bestScore = 0;

    for (const o of orgs) {
      const score = companyMatchScore(
        o.name || "",
        companyName || "",
        o.primary_domain,
        emailDomain,
      );
      if (score > bestScore) {
        bestScore = score;
        bestOrg = o;
      }
    }

    // If domain lookup returned results but none match the name well,
    // trust the domain match (score 0 is fine for domain-based lookups)
    if (!emailDomain && bestScore < 30) {
      console.log(`Apollo org match too weak (score=${bestScore}) for "${companyName}" — skipping`);
      return null;
    }

    return {
      website_url: bestOrg.website_url || bestOrg.primary_domain || "",
      linkedin_url: bestOrg.linkedin_url || "",
      facebook_url: bestOrg.facebook_url || "",
      twitter_url: bestOrg.twitter_url || "",
      short_description: bestOrg.short_description || "",
      industry: bestOrg.industry || "",
      name: bestOrg.name || "",
      id: bestOrg.id || "",
      primary_domain: bestOrg.primary_domain || "",
      estimated_num_employees: bestOrg.estimated_num_employees || undefined,
      founded_year: bestOrg.founded_year || undefined,
    };
  } catch (err) {
    console.error("Apollo org search failed:", err);
    return null;
  }
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// 1 CREDIT — uses people/match for precise person lookup by name+domain
async function apolloMatchPerson(
  personName: string,
  companyName: string,
  companyDomain: string | undefined,
  apiKey: string,
): Promise<ApolloPersonResult | null> {
  if (!personName) return null;
  const { first, last } = splitName(personName);
  if (!first) return null;

  try {
    const body: Record<string, any> = {
      first_name: first,
      last_name: last || undefined,
      organization_name: companyName || undefined,
    };
    if (companyDomain) {
      body.domain = companyDomain;
    }

    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Apollo people/match error [${res.status}]:`, errText);
      if (res.status === 429 || res.status === 403) return null;
      return null;
    }
    const data = await res.json();
    const person = data.person || data.match || null;
    if (!person) {
      console.log(`Apollo people/match: no match for "${personName}" at ${companyDomain || companyName}`);
      return null;
    }

    return {
      linkedin_url: person.linkedin_url || "",
      title: person.title || "",
      headline: person.headline || "",
      name: person.name || "",
      organization: person.organization ? {
        website_url: person.organization.website_url || "",
        short_description: person.organization.short_description || "",
        industry: person.organization.industry || "",
        name: person.organization.name || "",
        primary_domain: person.organization.primary_domain || "",
      } : undefined,
    };
  } catch (err) {
    console.error("Apollo people/match failed:", err);
    return null;
  }
}

// ── Perplexity helpers ────────────────────────────────────────────

async function perplexityCall(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<{ content: string; citations: string[] }> {
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Perplexity API error [${res.status}]: ${errText.slice(0, 200)}`);
      return { content: "", citations: [] };
    }
    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();
    const citations = data.citations || [];
    console.log(`Perplexity response for "${userPrompt.slice(0, 60)}...": content=${content.slice(0, 120)}, citations=${citations.length}`);
    return { content, citations };
  } catch (err) {
    console.error("Perplexity call failed:", err);
    return { content: "", citations: [] };
  }
}

async function perplexityFindTitle(
  personName: string,
  companyName: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey || !personName) return "";

  const searchQuery = companyName
    ? `What is ${personName}'s role or job title at ${companyName}?`
    : `${personName} job title role`;

  const { content } = await perplexityCall(
    "You find job titles of people at companies. Return ONLY the exact job title (e.g. 'Founder', 'CEO', 'Owner', 'Marketing Director', 'Kurucu', 'Genel Müdür', 'İşletme Sahibi'). If the person appears to be the owner or founder, return 'Owner'. If truly unknown, return exactly: UNKNOWN",
    searchQuery,
    apiKey,
  );
  if (!content || content === "UNKNOWN" || content.length > 100) return "";
  const cleaned = content.replace(/^["']|["']$/g, "").trim();
  if (cleaned.toLowerCase().includes("unknown") || cleaned.toLowerCase().includes("could not") || cleaned.toLowerCase().includes("i ") || cleaned.toLowerCase().includes("sorry")) return "";
  return cleaned;
}

async function perplexityFindLinkedIn(
  personName: string,
  companyName: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey || !personName) return "";

  const query = companyName
    ? `LinkedIn profile URL for ${personName} who works at "${companyName}". Return only the linkedin.com/in/... URL, nothing else.`
    : `${personName} linkedin.com/in profile URL`;

  const { content, citations } = await perplexityCall(
    "You are a web search assistant. Find the person's LinkedIn profile. Return ONLY the full LinkedIn URL (https://linkedin.com/in/...). If not found, return NONE.",
    query,
    apiKey,
  );

  for (const url of citations) {
    if (url.includes("linkedin.com/in/")) {
      const v = validateLinkedInUrl(url);
      if (v.valid && v.type === "person") return v.url;
    }
  }
  if (content && content !== "NONE") {
    const urlMatches = content.match(/https?:\/\/[^\s"')\]]+linkedin\.com\/in\/[^\s"')\]]+/g) || [];
    for (const raw of urlMatches) {
      const v = validateLinkedInUrl(raw);
      if (v.valid && v.type === "person") return v.url;
    }
  }

  return "";
}

// ── Perplexity: combined multi-field lookup (replaces separate calls) ──

async function perplexityCombinedLookup(
  personName: string,
  companyName: string,
  apiKey: string,
  missing: { website: boolean; title: boolean; linkedin: boolean },
): Promise<{ website: string; title: string; linkedin: string }> {
  const empty = { website: "", title: "", linkedin: "" };
  if (!apiKey || (!personName && !companyName)) return empty;

  const fields: string[] = [];
  if (missing.website) fields.push('website = official company domain only, no social/directory/marketplace sites');
  if (missing.title) fields.push('title = the person\'s job title at the company');
  if (missing.linkedin) fields.push('linkedin = person\'s LinkedIn profile URL (linkedin.com/in/... only)');

  const query = `For ${personName || "unknown"} at "${companyName || "unknown"}" in Turkey, find: ${fields.join("; ")}`;

  const { content, citations } = await perplexityCall(
    `You find business information for Turkish companies and people. Return ONLY valid JSON, no explanation, no markdown:\n{"website": "", "title": "", "linkedin": ""}\nwebsite = official company domain only, no social/directory sites\nlinkedin = person profile /in/ URL only\nUse empty strings for unknown fields.`,
    query,
    apiKey,
  );

  const result = { ...empty };

  for (const url of citations) {
    if (missing.linkedin && !result.linkedin && url.includes("linkedin.com/in/")) {
      const v = validateLinkedInUrl(url);
      if (v.valid && v.type === "person") result.linkedin = v.url;
    }
    if (missing.website && !result.website && isCompanyWebsite(url) && !url.includes("linkedin.com")) {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (!hostname.includes("tripadvisor") && !hostname.includes("foursquare") &&
            !hostname.includes("google") && !hostname.includes("yelp") &&
            !hostname.includes("zomato") && !hostname.includes("yemeksepeti") &&
            !hostname.includes("getir")) {
          result.website = url;
        }
      } catch { /* skip */ }
    }
  }

  if (content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (missing.website && !result.website && parsed.website) {
          const url = parsed.website.trim();
          if (url && url !== "NONE" && isCompanyWebsite(url) && !url.includes("linkedin.com")) {
            const alive = await checkUrl(url);
            if (alive) result.website = url;
          }
        }

        if (missing.linkedin && !result.linkedin && parsed.linkedin) {
          const v = validateLinkedInUrl(parsed.linkedin);
          if (v.valid && v.type === "person") result.linkedin = v.url;
        }

        if (missing.title && !result.title && parsed.title && parsed.title.length < 100) {
          const cleaned = parsed.title.replace(/^["']|["']$/g, "").trim();
          if (cleaned && !cleaned.toLowerCase().includes("unknown") && !cleaned.toLowerCase().includes("sorry")) {
            result.title = cleaned;
          }
        }
      }
    } catch { /* JSON parse failed */ }

    if (missing.linkedin && !result.linkedin) {
      const urlMatches = content.match(/https?:\/\/[^\s"')\]]+linkedin\.com\/in\/[^\s"')\]]+/g) || [];
      for (const raw of urlMatches) {
        const v = validateLinkedInUrl(raw);
        if (v.valid && v.type === "person") { result.linkedin = v.url; break; }
      }
    }

    if (missing.website && !result.website) {
      const urlMatches = content.match(/https?:\/\/[^\s"')\]>,]+/g) || [];
      for (const raw of urlMatches) {
        const cleaned = raw.replace(/[.)]+$/, "");
        if (isCompanyWebsite(cleaned) && !cleaned.includes("linkedin.com")) {
          try {
            const hostname = new URL(cleaned).hostname.toLowerCase();
            if (!hostname.includes("tripadvisor") && !hostname.includes("foursquare") &&
                !hostname.includes("yelp") && !hostname.includes("google")) {
              const alive = await checkUrl(cleaned);
              if (alive) { result.website = cleaned; break; }
            }
          } catch { /* skip */ }
        }
      }
    }
  }

  return result;
}

// ── Perplexity: extract website & title from a LinkedIn profile ───

async function perplexityExtractFromLinkedIn(
  linkedinUrl: string,
  personName: string,
  companyName: string,
  apiKey: string,
): Promise<{ website: string; title: string }> {
  const empty = { website: "", title: "" };
  if (!apiKey || !linkedinUrl) return empty;

  const query = `According to ${personName}'s LinkedIn profile at ${linkedinUrl}, what is their job title and what is the company website URL?`;

  const { content, citations } = await perplexityCall(
    "You extract information from LinkedIn profiles. Return ONLY a JSON object with two fields: title (job title) and website (company website URL). Use empty strings for unknown fields. No other text.",
    query,
    apiKey,
  );

  const result = { ...empty };

  // Check citations for company websites
  for (const url of citations) {
    if (!result.website && isCompanyWebsite(url) && !url.includes("linkedin.com")) {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (!hostname.includes("tripadvisor") && !hostname.includes("foursquare") &&
            !hostname.includes("google") && !hostname.includes("yelp")) {
          result.website = url;
        }
      } catch { /* skip */ }
    }
  }

  if (content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (!result.website && parsed.website && parsed.website !== "NONE") {
          const url = parsed.website.trim();
          if (isCompanyWebsite(url) && !url.includes("linkedin.com")) {
            const alive = await checkUrl(url);
            if (alive) result.website = url;
          }
        }

        if (!result.title && parsed.title && parsed.title.length < 100) {
          const cleaned = parsed.title.replace(/^["']|["']$/g, "").trim();
          if (cleaned && !cleaned.toLowerCase().includes("unknown")) {
            result.title = cleaned;
          }
        }
      }
    } catch { /* JSON parse failed */ }
  }

  return result;
}

async function perplexityInstagramFallback(
  companyName: string,
  personName: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) return "";
  const query = [companyName, personName].filter(Boolean).join(" ");
  if (!query) return "";

  const { content, citations } = await perplexityCall(
    "You find official Instagram accounts for Turkish businesses. Return ONLY the Instagram username (no @ prefix, no URL). If you cannot find it with certainty, return exactly: NONE",
    `What is the official Instagram username for "${query}"? Return only the username.`,
    apiKey,
  );

  for (const url of citations) {
    if (url.includes("instagram.com")) {
      const u = extractIgUsername(url);
      if (u) return u;
    }
  }

  if (content && content !== "NONE" && !content.includes(" ")) {
    const cleaned = content.replace(/^@/, "").replace(/['"]/g, "").toLowerCase().trim();
    if (/^[a-z0-9._]{1,30}$/.test(cleaned)) return cleaned;
  }
  return "";
}

async function perplexityVerifyWebsite(
  website: string,
  companyName: string,
  apiKey: string,
): Promise<boolean> {
  if (!apiKey || !website || !companyName) return true;
  const { content } = await perplexityCall(
    "You verify if a URL is the official website of a Turkish company. Reply with exactly YES or NO.",
    `Is ${website} the official website of "${companyName}"? Reply YES or NO only.`,
    apiKey,
  );
  const answer = content.toUpperCase().trim();
  if (answer.startsWith("NO")) return false;
  return true;
}

// ── Perplexity: find website ──────────────────────────────────────

async function perplexityFindWebsite(
  companyName: string,
  personName: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey || !companyName) return "";

  const searchQuery = `${companyName} official website`;

  const { content, citations } = await perplexityCall(
    "You find official websites for Turkish businesses. Return ONLY the full URL (e.g. https://example.com). Do NOT return social media, marketplace, or directory pages. If you cannot find it, return exactly: NONE",
    searchQuery,
    apiKey,
  );

  // Citations are actual URLs Perplexity visited — check them first
  for (const url of citations) {
    if (isCompanyWebsite(url)) {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        // Skip generic directories/review sites
        if (hostname.includes("tripadvisor") || hostname.includes("foursquare") ||
            hostname.includes("yelp") || hostname.includes("zomato") ||
            hostname.includes("yemeksepeti") || hostname.includes("getir") ||
            hostname.includes("google")) continue;
        const alive = await checkUrl(url);
        if (alive) return url;
      } catch { /* skip malformed */ }
    }
  }

  // Parse URLs from response text
  if (content && content !== "NONE") {
    const urlMatches = content.match(/https?:\/\/[^\s"')\]>,]+/g) || [];
    for (const raw of urlMatches) {
      const cleaned = raw.replace(/[.)]+$/, "");
      if (isCompanyWebsite(cleaned)) {
        try {
          const hostname = new URL(cleaned).hostname.toLowerCase();
          if (hostname.includes("tripadvisor") || hostname.includes("foursquare") ||
              hostname.includes("yelp") || hostname.includes("zomato") ||
              hostname.includes("yemeksepeti") || hostname.includes("getir") ||
              hostname.includes("google")) continue;
          const alive = await checkUrl(cleaned);
          if (alive) return cleaned;
        } catch { /* skip */ }
      }
    }
  }

  return "";
}

// ── Instagram URL liveness check ──────────────────────────────────

async function checkInstagramExists(username: string): Promise<boolean> {
  if (!username) return false;
  const url = `https://www.instagram.com/${username}/`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    clearTimeout(timeout);
    // Instagram returns 200 for existing profiles, 404 for non-existent
    // 302 redirects to login are also treated as valid (private profiles)
    return res.status === 200 || res.status === 302;
  } catch {
    // Network error — assume valid to avoid false negatives
    return true;
  }
}

// ── Perplexity: last-resort all-in-one query ─────────────────────

async function perplexityLastResort(
  personName: string,
  companyName: string,
  apiKey: string,
): Promise<{ website: string; linkedin: string; title: string }> {
  const empty = { website: "", linkedin: "", title: "" };
  if (!apiKey || (!personName && !companyName)) return empty;

  const query = `Find the official website, LinkedIn profile, and job title for ${personName} at "${companyName}" in Turkey. Return JSON: {"website":"","linkedin":"","title":""}`;

  const { content, citations } = await perplexityCall(
    "You find business information for Turkish companies and people. Return ONLY a JSON object with three fields: website (official URL), linkedin (person's linkedin.com/in/ URL), title (job title). Use empty strings for unknown fields. No other text.",
    query,
    apiKey,
  );

  const result = { ...empty };

  // Parse citations first — they're the most reliable
  for (const url of citations) {
    if (!result.linkedin && url.includes("linkedin.com/in/")) {
      const v = validateLinkedInUrl(url);
      if (v.valid && v.type === "person") result.linkedin = v.url;
    }
    if (!result.website && isCompanyWebsite(url)) {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (!hostname.includes("tripadvisor") && !hostname.includes("foursquare") &&
            !hostname.includes("yelp") && !hostname.includes("zomato") &&
            !hostname.includes("google")) {
          result.website = url;
        }
      } catch { /* skip */ }
    }
  }

  // Try to parse JSON from response
  if (content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (!result.website && parsed.website && parsed.website !== "NONE") {
          const url = parsed.website.trim();
          if (isCompanyWebsite(url)) {
            const alive = await checkUrl(url);
            if (alive) result.website = url;
          }
        }

        if (!result.linkedin && parsed.linkedin) {
          const v = validateLinkedInUrl(parsed.linkedin);
          if (v.valid && v.type === "person") result.linkedin = v.url;
        }

        if (!result.title && parsed.title && parsed.title.length < 100) {
          const cleaned = parsed.title.replace(/^["']|["']$/g, "").trim();
          if (cleaned && !cleaned.toLowerCase().includes("unknown")) {
            result.title = cleaned;
          }
        }
      }
    } catch { /* JSON parse failed, continue with citation-based results */ }

    // Fallback: extract LinkedIn URL from raw text
    if (!result.linkedin) {
      const urlMatches = content.match(/https?:\/\/[^\s"')\]]+linkedin\.com\/in\/[^\s"')\]]+/g) || [];
      for (const raw of urlMatches) {
        const v = validateLinkedInUrl(raw);
        if (v.valid && v.type === "person") {
          result.linkedin = v.url;
          break;
        }
      }
    }

    // Fallback: extract website URL from raw text
    if (!result.website) {
      const urlMatches = content.match(/https?:\/\/[^\s"')\]>,]+/g) || [];
      for (const raw of urlMatches) {
        const cleaned = raw.replace(/[.)]+$/, "");
        if (isCompanyWebsite(cleaned) && !cleaned.includes("linkedin.com")) {
          try {
            const hostname = new URL(cleaned).hostname.toLowerCase();
            if (!hostname.includes("tripadvisor") && !hostname.includes("foursquare") &&
                !hostname.includes("yelp") && !hostname.includes("google")) {
              const alive = await checkUrl(cleaned);
              if (alive) {
                result.website = cleaned;
                break;
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  }

  return result;
}

// ── Enrichment quality scoring ────────────────────────────────────

export function computeEnrichmentQuality(r: UnifiedSearchResult): string {
  let score = 0;
  if (r.website) score++;
  if (r.linkedin_url) score++;
  if (r.title) score++;
  if (score >= 3) return "full";
  if (score >= 2) return "partial";
  if (score >= 1) return "minimal";
  return "none";
}

// ── Main public types ─────────────────────────────────────────────

export interface UnifiedSearchResult {
  lead_id: string;
  website: string;
  ig_username: string;
  linkedin_url: string;
  title: string;
  company_note: string;
  confidence: string;
  enrichment_quality?: string;
}

export const PERPLEXITY_SYSTEM_PROMPT = `You are a precise Company & Person Intelligence Crawler specializing in Turkish businesses. Your job is to find REAL, VERIFIED data for each company/person pair.

For each lead, extract:
1. **website**: The company's official domain (NOT social media, NOT marketplace listings, NOT news articles). Must be the company's own website.
2. **instagram**: The company's official Instagram business/creator account URL. Personal accounts only if sole proprietor.
3. **linkedin**: The PERSON's LinkedIn profile URL (linkedin.com/in/...). Search "<person_name> <company_name> LinkedIn" to find their personal profile. Fall back to company LinkedIn page (linkedin.com/company/...) only if person's profile is not found.
4. **role**: The person's professional title/role at the company. This is CRITICAL — search their LinkedIn profile, company website "about/team" page, and news articles to find their actual title. Use the exact title found (e.g. "Co-Founder & CEO", "Marketing Director", "Satın Alma Müdürü", "Kurucu", "Genel Müdür"). If you find a LinkedIn profile, use the headline/title shown there. Do NOT guess — if truly unknown, use "Unknown".
5. **summary**: Max 2 sentences. Company sector + person context.
6. **confidence**: High (verified from multiple sources) | Medium (single source) | Low (inferred).

Output Format (strict JSON, no extra text):
{
  "results": [
    {
      "company": "Company Name",
      "website": "https://official-site.com",
      "instagram": "https://instagram.com/handle",
      "linkedin": "https://linkedin.com/in/person-name",
      "person": "Person Name",
      "role": "Co-Founder & CEO",
      "summary": "Brief factual summary.",
      "confidence": "High"
    }
  ]
}

Rules:
- NEVER hallucinate URLs. If you cannot find a real link, use "".
- Website must be the company's own domain. Exclude marketplaces, directories, news.
- For "Bireysel" (individual) entries, the person is likely the owner.
- If no data found at all: {"results": []}
- One result object per lead in the same order as the input.
- PRIORITIZE finding the person's LinkedIn profile and real title. This is the most valuable data point.`;

// ══════════════════════════════════════════════════════════════════
// MAIN ENRICHMENT PIPELINE (optimized)
// ══════════════════════════════════════════════════════════════════
//
// Flow per lead:
//   1. FREE  — Email domain detection
//   2. PAID  — Apollo people/match (1 credit) → title, LinkedIn, org website
//        → EARLY EXIT if all 3 fields found
//   3. FREE  — Apollo company search (ONLY if website still missing)
//   4. FREE  — Email domain as website fallback
//   5. PAID  — Firecrawl website search (ONLY if website still missing)
//   5b PAID  — Firecrawl title from website (ONLY if title missing + website exists)
//   6.       — Small-business owner heuristic
//   7. FREE  — ONE combined Perplexity call (if 2+ fields missing)
//              OR single-field Perplexity call (if only 1 field missing)
//   8. FREE  — perplexityExtractFromLinkedIn (ONLY if linkedin found AND website or title missing)
//   9. FREE  — Append company LinkedIn to note
//  10. FREE  — Instagram discovery (website scrape → Perplexity)
//
// Best case (Apollo full hit):  1 API call
// Typical case (partial):       2–3 API calls
// Worst case (no Apollo match): 4 API calls
// ══════════════════════════════════════════════════════════════════

export async function unifiedApolloSearch(
  leads: Array<{ lead_id: string; person_name: string; company_name: string; email?: string }>,
  apolloApiKey: string,
  perplexityApiKey: string | null,
  firecrawlApiKey?: string | null,
): Promise<UnifiedSearchResult[]> {
  if (leads.length === 0) return [];

  const results: UnifiedSearchResult[] = [];

  for (const lead of leads) {
    console.log(`[${lead.lead_id}] Enrichment start: "${lead.company_name}" / "${lead.person_name}" / "${lead.email || ""}"`);

    let website = "";
    let ig_username = "";
    let linkedin_url = "";
    let title = "";
    let company_note = "";
    let confidence = "Low";
    let companyDomain: string | undefined;
    let companyLinkedin = "";

    const emailDomain = extractDomainFromEmail(lead.email || "");

    // ── Step 1: Email domain detection ─────────────────────────────
    if (emailDomain) {
      console.log(`[${lead.lead_id}] Corporate email domain: ${emailDomain}`);
      companyDomain = emailDomain;
    }

    // ── Step 2: Apollo people/match FIRST (1 credit) ───────────────
    if (lead.person_name && (companyDomain || lead.company_name)) {
      console.log(`[${lead.lead_id}] Apollo people/match (1 credit): ${lead.person_name} @ ${companyDomain || lead.company_name}`);
      const matchResult = await apolloMatchPerson(
        lead.person_name,
        lead.company_name,
        companyDomain,
        apolloApiKey,
      );
      if (matchResult) {
        title = matchResult.title || matchResult.headline || "";
        const rawLinkedIn = matchResult.linkedin_url || "";
        const liV = validateLinkedInUrl(rawLinkedIn);
        if (liV.valid && liV.type === "person") {
          linkedin_url = liV.url;
          confidence = "High";
        } else if (liV.valid && liV.type === "company" && !companyLinkedin) {
          companyLinkedin = liV.url;
        }
        if (matchResult.organization?.website_url) {
          const orgUrl = matchResult.organization.website_url;
          const formatted = orgUrl.startsWith("http") ? orgUrl : `https://${orgUrl}`;
          if (isCompanyWebsite(formatted)) website = formatted;
          if (!companyDomain && matchResult.organization.primary_domain) {
            companyDomain = matchResult.organization.primary_domain;
          }
        }
        if (matchResult.organization) {
          const desc = [matchResult.organization.industry, matchResult.organization.short_description].filter(Boolean).join(" — ");
          if (desc) company_note = desc.slice(0, 300);
        }
        console.log(`[${lead.lead_id}] Apollo match: title="${title}", linkedin=${linkedin_url ? "yes" : "no"}, website=${website ? "yes" : "no"}`);

        // ── EARLY EXIT: all 3 fields found ─────────────────────────
        if (website && title && linkedin_url) {
          console.log(`[${lead.lead_id}] Apollo full hit — skipping enrichment stages`);
          if (companyLinkedin) {
            company_note = company_note
              ? `${company_note} | Company LI: ${companyLinkedin}`
              : `Company LI: ${companyLinkedin}`;
          }
          const result: UnifiedSearchResult = {
            lead_id: lead.lead_id, website, ig_username, linkedin_url, title, company_note, confidence,
          };
          result.enrichment_quality = computeEnrichmentQuality(result);
          results.push(result);
          console.log(`[${lead.lead_id}] Done: quality=${result.enrichment_quality}`);
          continue;
        }
      }
    }

    // ── Step 3: Apollo company search (ONLY if website still missing) ──
    if (!website && lead.company_name) {
      const orgResult = await apolloSearchCompany(lead.company_name, apolloApiKey, emailDomain || undefined);
      if (orgResult) {
        const rawUrl = orgResult.website_url || orgResult.primary_domain || "";
        if (rawUrl) {
          const formatted = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
          if (isCompanyWebsite(formatted)) website = formatted;
          companyDomain = orgResult.primary_domain || (() => {
            try { return new URL(formatted).hostname.replace(/^www\./, ""); } catch { return undefined; }
          })();
        }

        const liV = validateLinkedInUrl(orgResult.linkedin_url || "");
        if (liV.valid && liV.type === "company" && !companyLinkedin) {
          companyLinkedin = liV.url;
        }

        if (!company_note) {
          const noteParts: string[] = [];
          if (orgResult.industry) noteParts.push(orgResult.industry);
          if (orgResult.short_description) noteParts.push(orgResult.short_description);
          if (orgResult.estimated_num_employees) noteParts.push(`~${orgResult.estimated_num_employees} employees`);
          if (orgResult.founded_year) noteParts.push(`Founded ${orgResult.founded_year}`);
          company_note = noteParts.join(" — ").slice(0, 300);
        }
        if (confidence === "Low") confidence = "Medium";
        console.log(`[${lead.lead_id}] Apollo org: "${orgResult.name}" → website=${website ? "yes" : "no"}`);
      }
    }

    // ── Step 4: Email domain as website fallback ─────────────────────
    if (!website && emailDomain) {
      const candidateUrl = `https://${emailDomain}`;
      if (isCompanyWebsite(candidateUrl)) {
        const alive = await checkUrl(candidateUrl);
        if (alive) {
          website = candidateUrl;
          if (!companyDomain) companyDomain = emailDomain;
          console.log(`[${lead.lead_id}] Email domain verified as website: ${website}`);
          if (confidence === "Low") confidence = "Medium";
        }
      }
    }

    // ── Step 5: Firecrawl website search (ONLY if website missing) ──
    if (!website && firecrawlApiKey && lead.company_name) {
      console.log(`[${lead.lead_id}] Firecrawl website search...`);
      const fcWebsite = await firecrawlFindWebsite(
        lead.company_name, lead.person_name, firecrawlApiKey,
        company_note?.split(" — ")[0] || "",
      );
      if (fcWebsite) {
        website = fcWebsite;
        console.log(`[${lead.lead_id}] Firecrawl found website: ${website}`);
        if (confidence === "Low") confidence = "Medium";
      }
    }

    // ── Step 5b: Firecrawl title from website (ONLY if title missing + website exists) ──
    if (!title && website && firecrawlApiKey && lead.person_name) {
      console.log(`[${lead.lead_id}] Firecrawl title extraction from website...`);
      const fcTitle = await firecrawlFindTitle(website, lead.person_name, firecrawlApiKey);
      if (fcTitle) {
        title = fcTitle;
        console.log(`[${lead.lead_id}] Firecrawl found title: "${title}"`);
      }
    }

    // ── Step 6: Small-business owner heuristic ────────────────────────
    if (!title && lead.company_name) {
      const nameLower = lead.company_name.toLowerCase();
      const isLikelySoleProprietor = nameLower.includes("bireysel") || nameLower === lead.person_name?.toLowerCase();
      if (isLikelySoleProprietor) {
        title = "Owner";
        console.log(`[${lead.lead_id}] Heuristic: sole proprietor → title="Owner"`);
      }
    }

    // ── Step 7: Perplexity — smart combined or single-field call ─────
    if (perplexityApiKey && lead.person_name && lead.company_name) {
      const missingWebsite = !website;
      const missingTitle = !title;
      const missingLinkedin = !linkedin_url;
      const missingCount = (missingWebsite ? 1 : 0) + (missingTitle ? 1 : 0) + (missingLinkedin ? 1 : 0);

      if (missingCount >= 2) {
        console.log(`[${lead.lead_id}] Perplexity combined lookup (${missingCount} fields missing)...`);
        const px = await perplexityCombinedLookup(
          lead.person_name, lead.company_name, perplexityApiKey,
          { website: missingWebsite, title: missingTitle, linkedin: missingLinkedin },
        );
        if (px.website && !website) {
          website = px.website;
          console.log(`[${lead.lead_id}] Perplexity → website: ${website}`);
        }
        if (px.title && !title) {
          title = px.title;
          console.log(`[${lead.lead_id}] Perplexity → title: "${title}"`);
        }
        if (px.linkedin && !linkedin_url) {
          linkedin_url = px.linkedin;
          console.log(`[${lead.lead_id}] Perplexity → linkedin: ${linkedin_url}`);
        }
        if (website || title || linkedin_url) {
          if (confidence === "Low") confidence = "Medium";
        }
      } else if (missingCount === 1) {
        if (missingWebsite) {
          console.log(`[${lead.lead_id}] Perplexity single: website lookup...`);
          const w = await perplexityFindWebsite(lead.company_name, lead.person_name, perplexityApiKey);
          if (w) { website = w; console.log(`[${lead.lead_id}] Perplexity → website: ${website}`); }
        } else if (missingTitle) {
          console.log(`[${lead.lead_id}] Perplexity single: title lookup...`);
          const t = await perplexityFindTitle(lead.person_name, lead.company_name, perplexityApiKey);
          if (t) { title = t; console.log(`[${lead.lead_id}] Perplexity → title: "${title}"`); }
        } else if (missingLinkedin) {
          console.log(`[${lead.lead_id}] Perplexity single: LinkedIn lookup...`);
          const li = await perplexityFindLinkedIn(lead.person_name, lead.company_name, perplexityApiKey);
          if (li) { linkedin_url = li; console.log(`[${lead.lead_id}] Perplexity → linkedin: ${linkedin_url}`); }
        }
        if (confidence === "Low") confidence = "Medium";
      }
    }

    // ── Step 8: Extract from LinkedIn profile (ONLY if linkedin found AND gaps remain) ──
    if (linkedin_url && (!website || !title) && perplexityApiKey) {
      console.log(`[${lead.lead_id}] Extracting website/title from LinkedIn profile...`);
      const liData = await perplexityExtractFromLinkedIn(linkedin_url, lead.person_name, lead.company_name, perplexityApiKey);
      if (!website && liData.website) {
        website = liData.website;
        console.log(`[${lead.lead_id}] LinkedIn profile → website: ${website}`);
        if (confidence === "Low") confidence = "Medium";
      }
      if (!title && liData.title) {
        title = liData.title;
        console.log(`[${lead.lead_id}] LinkedIn profile → title: "${title}"`);
      }
    }

    // ── Step 9: Append company LinkedIn to note ────────────────────
    if (companyLinkedin) {
      company_note = company_note
        ? `${company_note} | Company LI: ${companyLinkedin}`
        : `Company LI: ${companyLinkedin}`;
    }

    // ── Step 10: Instagram discovery ────────────────────────────────
    if (!ig_username && website && firecrawlApiKey) {
      console.log(`[${lead.lead_id}] Scraping website for Instagram links...`);
      ig_username = await firecrawlScrape(website, firecrawlApiKey);
      if (ig_username) {
        console.log(`[${lead.lead_id}] Found IG from website: @${ig_username}`);
      }
    }

    if (!ig_username && perplexityApiKey) {
      console.log(`[${lead.lead_id}] Perplexity Instagram fallback...`);
      const candidate = await perplexityInstagramFallback(lead.company_name, lead.person_name, perplexityApiKey);
      if (candidate) {
        const exists = await checkInstagramExists(candidate);
        if (exists) {
          ig_username = candidate;
          console.log(`[${lead.lead_id}] Perplexity IG verified: @${ig_username}`);
        } else {
          console.log(`[${lead.lead_id}] Perplexity IG @${candidate} does not exist — discarding`);
        }
      }
    }

    const result: UnifiedSearchResult = {
      lead_id: lead.lead_id, website, ig_username, linkedin_url, title, company_note, confidence,
    };
    result.enrichment_quality = computeEnrichmentQuality(result);
    results.push(result);

    console.log(`[${lead.lead_id}] Done: quality=${result.enrichment_quality}, website=${website ? "yes" : "no"}, linkedin=${linkedin_url ? "yes" : "no"}, title="${title}", ig=${ig_username || "none"}`);
  }

  return results;
}

// ── Deprecated functions kept for backward compatibility ──────────

/** @deprecated use unifiedApolloSearch instead */
export async function unifiedPerplexitySearch(
  leads: Array<{ lead_id: string; person_name: string; company_name: string }>,
  apiKey: string,
): Promise<UnifiedSearchResult[]> {
  const empty = (id: string): UnifiedSearchResult => ({
    lead_id: id, website: "", ig_username: "", linkedin_url: "", title: "", company_note: "", confidence: "Low",
  });

  if (leads.length === 0) return [];

  const leadsDescription = leads
    .map((l, i) => `${i + 1}. Company: "${l.company_name || "N/A"}" — Person: "${l.person_name || "N/A"}"`)
    .join("\n");

  const userPrompt = `Find official website, Instagram, LinkedIn profile, and the person's professional title/role for these Turkish companies/people. For each person, search their LinkedIn profile (linkedin.com/in/...) to find their real job title:\n\n${leadsDescription}\n\nReturn exactly ${leads.length} result(s) in the same order.`;

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: PERPLEXITY_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Perplexity error [${res.status}]:`, errorText);
      return leads.map((l) => empty(l.lead_id));
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    let parsed: any = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse Perplexity JSON response");
    }

    const results: UnifiedSearchResult[] = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const r = parsed?.results?.[i];

      if (!r) {
        results.push(empty(lead.lead_id));
        continue;
      }

      let website = r.website || "";
      let ig_username = "";
      let linkedin_url = r.linkedin || "";
      const title = r.role || "";
      const company_note = r.summary || "";
      const confidence = r.confidence || "Low";

      if (r.instagram) {
        const match = r.instagram.match(/instagram\.com\/([^\/\?]+)/);
        ig_username = match ? match[1].toLowerCase().replace(/^@/, "") : "";
      }

      if (website && !isCompanyWebsite(website)) website = "";

      results.push({
        lead_id: lead.lead_id,
        website,
        ig_username,
        linkedin_url,
        title,
        company_note,
        confidence,
      });
    }

    for (const url of citations) {
      for (const result of results) {
        if (!result.ig_username && url.includes("instagram.com")) {
          const u = extractIgUsername(url);
          if (u) result.ig_username = u;
        }
        if (!result.linkedin_url && url.includes("linkedin.com")) {
          result.linkedin_url = url;
        }
      }
    }

    return results;
  } catch (err) {
    console.error("Perplexity unified search failed:", err);
    return leads.map((l) => empty(l.lead_id));
  }
}

/** @deprecated kept for backward compat */
export async function perplexitySearch(query: string, apiKey: string): Promise<{ content: string; citations: string[] }> {
  return perplexityCall(PERPLEXITY_SYSTEM_PROMPT, query, apiKey);
}

export interface ParsedPerplexity {
  website: string;
  ig_username: string;
  linkedin_url: string;
  title: string;
  company_note: string;
}

/** @deprecated kept for backward compat */
export function parsePerplexityResult(content: string, citations: string[]): ParsedPerplexity {
  let website = "";
  let ig_username = "";
  let linkedin_url = "";
  let title = "";
  let company_note = "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = parsed.results?.[0];
      if (result) {
        website = result.website || "";
        ig_username = result.instagram
          ? (result.instagram.match(/instagram\.com\/([^\/\?]+)/)?.[1] || "")
          : "";
        linkedin_url = result.linkedin || "";
        title = result.role || "";
        company_note = result.summary || "";
      } else {
        website = parsed.website || "";
        ig_username = parsed.ig_username || "";
      }
    }
  } catch {
    // scan citations below
  }

  for (const url of citations) {
    if (!ig_username && url.includes("instagram.com")) {
      const u = extractIgUsername(url);
      if (u) ig_username = u;
    }
    if (!website && isCompanyWebsite(url)) {
      website = url;
    }
    if (!linkedin_url && url.includes("linkedin.com")) {
      linkedin_url = url;
    }
  }

  ig_username = ig_username.replace(/^@/, "").toLowerCase().trim();
  return { website, ig_username, linkedin_url, title, company_note };
}
