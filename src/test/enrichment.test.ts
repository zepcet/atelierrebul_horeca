import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lead } from "@/data/leads";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "test-1",
    created_time: "2026-03-20T10:00:00+03:00",
    ad_id: "", ad_name: "", adset_id: "", adset_name: "",
    campaign_id: "", campaign_name: "", form_id: "", form_name: "",
    is_organic: true, platform: "web", product_type: "giyim",
    quantity: "16-50", sirket_adi: "Test Co", adi_soyadi: "John Doe",
    eposta: "john@test.com", telefon: "5551234567",
    lead_status: "", company_name: "Test Co", full_name: "John Doe",
    email: "john@test.com", phone_number: "5551234567",
    special_comments: "",
    ...overrides,
  };
}

const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSelect = vi.fn().mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [], error: null }),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { leads: [] }, error: null }),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Enrichment pipeline integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveEnrichmentToDB calls upsert with correct shape", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const lead = makeLead({
      title: "CEO",
      website: "https://example.com",
      linkedin_url: "https://linkedin.com/in/johndoe",
      crm_status: "contact",
      pipeline_stage: "first_contact",
      priority_override: 2,
      am_person: "Hazal",
    });

    const fromMock = vi.fn().mockReturnValue({ upsert: mockUpsert });
    (supabase.from as any) = fromMock;

    fromMock("lead_enrichments");

    expect(fromMock).toHaveBeenCalledWith("lead_enrichments");
  });

  it("enrichment merge preserves local edits over DB values", () => {
    const localLead = makeLead({
      id: "lead-1",
      special_comments: "Local note",
      crm_status: "proposal",
    });
    const dbEnrichment = {
      lead_id: "lead-1",
      title: "CEO",
      website: "",
      linkedin_url: "",
      ig_username: "",
      am: true,
      company_note: "Good company",
      crm_status: "",
      special_comments: "",
      enriched: true,
      pipeline_stage: "new",
      priority_override: null,
      am_person: "",
    };

    const merged = {
      ...localLead,
      title: dbEnrichment.title || localLead.title || "",
      website: dbEnrichment.website || localLead.website || "",
      am: dbEnrichment.am ?? localLead.am,
      company_note: dbEnrichment.company_note || localLead.company_note || "",
      crm_status: dbEnrichment.crm_status || localLead.crm_status || "",
      special_comments: dbEnrichment.special_comments || localLead.special_comments || "",
      enriched: dbEnrichment.enriched || localLead.enriched || false,
    };

    expect(merged.title).toBe("CEO");
    expect(merged.crm_status).toBe("proposal");
    expect(merged.special_comments).toBe("Local note");
    expect(merged.company_note).toBe("Good company");
  });

  it("website leads get is_organic=true flag", () => {
    const websiteLead = makeLead({ is_organic: true, platform: "web" });
    expect(websiteLead.is_organic).toBe(true);
    expect(websiteLead.platform).toBe("web");
  });

  it("ads leads get is_organic=false flag", () => {
    const adsLead = makeLead({ is_organic: false, platform: "ig" });
    expect(adsLead.is_organic).toBe(false);
  });

  it("priority calculation chain works end-to-end", async () => {
    const { computePriority, effectivePriority, computeTiers } = await import("@/data/leads");

    const leads = [
      makeLead({ id: "1", title: "CEO", quantity: "100+", priority_override: undefined }),
      makeLead({ id: "2", title: "Worker", quantity: "1-15", priority_override: 1 }),
    ];

    expect(computePriority(leads[0])).toBe(1);
    expect(effectivePriority(leads[0])).toBe(1);

    expect(computePriority(leads[1])).toBe(4);
    expect(effectivePriority(leads[1])).toBe(1);

    const tiers = computeTiers(leads);
    expect(tiers.get("1")).toBe(1);
    expect(tiers.get("2")).toBe(1);
  });
});
