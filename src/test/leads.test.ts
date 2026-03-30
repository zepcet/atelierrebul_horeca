import { describe, it, expect } from "vitest";
import {
  computePriority,
  effectivePriority,
  normalizeInstagramUsername,
  normalizeWebsiteUrl,
  getLeadPrimaryUrl,
  isExecutiveTitle,
  qtyToScore,
  computeTiers,
  categorizeLeadByAd,
  getLeadCategories,
  getQuantityBreakdown,
  getProductBreakdown,
  type Lead,
} from "@/data/leads";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "test-1",
    created_time: "2026-03-20T10:00:00+03:00",
    ad_id: "", ad_name: "", adset_id: "", adset_name: "",
    campaign_id: "", campaign_name: "", form_id: "", form_name: "",
    is_organic: false, platform: "ig", product_type: "giyim",
    quantity: "16-50", sirket_adi: "Test Co", adi_soyadi: "John Doe",
    eposta: "john@test.com", telefon: "5551234567",
    lead_status: "", company_name: "Test Co", full_name: "John Doe",
    email: "john@test.com", phone_number: "5551234567",
    special_comments: "",
    ...overrides,
  };
}

describe("computePriority", () => {
  it("returns P1 for executive with QTY 50+", () => {
    const lead = makeLead({ title: "CEO", quantity: "50-100" });
    expect(computePriority(lead)).toBe(1);
  });

  it("returns P1 for founder with QTY 100+", () => {
    const lead = makeLead({ title: "Kurucu", quantity: "100+" });
    expect(computePriority(lead)).toBe(1);
  });

  it("returns P2 for executive with low QTY", () => {
    const lead = makeLead({ title: "Genel Müdür", quantity: "1-15" });
    expect(computePriority(lead)).toBe(2);
  });

  it("returns P2 for QTY 100+ without executive title", () => {
    const lead = makeLead({ title: "", quantity: "100+" });
    expect(computePriority(lead)).toBe(2);
  });

  it("returns P3 for QTY 50-100 without executive title", () => {
    const lead = makeLead({ title: "Worker", quantity: "50-100" });
    expect(computePriority(lead)).toBe(3);
  });

  it("returns P4 for non-executive with low QTY", () => {
    const lead = makeLead({ title: "Intern", quantity: "1-15" });
    expect(computePriority(lead)).toBe(4);
  });

  it("returns P4 when no title and low QTY", () => {
    const lead = makeLead({ title: undefined, quantity: "16-50" });
    expect(computePriority(lead)).toBe(4);
  });
});

describe("effectivePriority", () => {
  it("uses priority_override when set", () => {
    const lead = makeLead({ title: "Intern", quantity: "1-15", priority_override: 1 });
    expect(effectivePriority(lead)).toBe(1);
  });

  it("falls back to computePriority when no override", () => {
    const lead = makeLead({ title: "CEO", quantity: "50-100" });
    expect(effectivePriority(lead)).toBe(1);
  });

  it("handles override of 0 (falsy but valid)", () => {
    const lead = makeLead({ title: "CEO", quantity: "50-100", priority_override: 4 });
    expect(effectivePriority(lead)).toBe(4);
  });
});

describe("isExecutiveTitle", () => {
  it("detects CEO", () => expect(isExecutiveTitle("CEO")).toBe(true));
  it("detects Founder", () => expect(isExecutiveTitle("Co-Founder & CTO")).toBe(true));
  it("detects Kurucu", () => expect(isExecutiveTitle("Kurucu")).toBe(true));
  it("detects General Manager", () => expect(isExecutiveTitle("General Manager")).toBe(true));
  it("detects Genel Müdür", () => expect(isExecutiveTitle("Genel Müdür")).toBe(true));
  it("detects Owner", () => expect(isExecutiveTitle("Owner")).toBe(true));
  it("detects Partner", () => expect(isExecutiveTitle("Partner")).toBe(true));
  it("detects Ortak", () => expect(isExecutiveTitle("Ortak")).toBe(true));
  it("detects Direktör", () => expect(isExecutiveTitle("Direktör")).toBe(true));
  it("detects Director", () => expect(isExecutiveTitle("Director of Sales")).toBe(true));
  it("detects Müdür", () => expect(isExecutiveTitle("Pazarlama Müdürü")).toBe(true));
  it("detects Yönetici", () => expect(isExecutiveTitle("Yönetici")).toBe(true));
  it("detects Sahip", () => expect(isExecutiveTitle("İşletme Sahip")).toBe(true));
  it("detects Bireysel", () => expect(isExecutiveTitle("Bireysel Müşteri")).toBe(true));
  it("returns false for Worker", () => expect(isExecutiveTitle("Worker")).toBe(false));
  it("returns false for empty", () => expect(isExecutiveTitle("")).toBe(false));
  it("returns false for undefined", () => expect(isExecutiveTitle(undefined)).toBe(false));
});

describe("qtyToScore", () => {
  it("scores 100+ as 40", () => expect(qtyToScore("100+")).toBe(40));
  it("scores 50-100 as 30", () => expect(qtyToScore("50-100")).toBe(30));
  it("scores 16-50 as 20", () => expect(qtyToScore("16-50")).toBe(20));
  it("scores 1-15 as 10", () => expect(qtyToScore("1-15")).toBe(10));
  it("scores unknown as 5", () => expect(qtyToScore("unknown")).toBe(5));
  it("scores exact 100 as 40", () => expect(qtyToScore("100")).toBe(40));
});

describe("normalizeInstagramUsername", () => {
  it("handles plain username", () => {
    expect(normalizeInstagramUsername("cafeexample")).toBe("cafeexample");
  });

  it("strips @ prefix", () => {
    expect(normalizeInstagramUsername("@cafeexample")).toBe("cafeexample");
  });

  it("extracts from full URL", () => {
    expect(normalizeInstagramUsername("https://www.instagram.com/cafeexample/")).toBe("cafeexample");
  });

  it("extracts from URL without protocol", () => {
    expect(normalizeInstagramUsername("instagram.com/cafeexample")).toBe("cafeexample");
  });

  it("rejects reserved paths like /p/", () => {
    expect(normalizeInstagramUsername("https://instagram.com/p/abc123")).toBe("");
  });

  it("rejects URLs with too many path segments", () => {
    expect(normalizeInstagramUsername("https://instagram.com/user/posts/123")).toBe("");
  });

  it("returns empty for null/undefined", () => {
    expect(normalizeInstagramUsername(null)).toBe("");
    expect(normalizeInstagramUsername(undefined)).toBe("");
    expect(normalizeInstagramUsername("")).toBe("");
  });

  it("lowercases", () => {
    expect(normalizeInstagramUsername("CaFeExample")).toBe("cafeexample");
  });

  it("rejects invalid characters", () => {
    expect(normalizeInstagramUsername("cafe example!")).toBe("");
  });
});

describe("normalizeWebsiteUrl", () => {
  it("adds https if missing", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com/");
  });

  it("keeps existing protocol", () => {
    expect(normalizeWebsiteUrl("https://example.com")).toBe("https://example.com/");
  });

  it("returns empty for invalid URLs", () => {
    expect(normalizeWebsiteUrl("not a url")).toBe("");
  });

  it("returns empty for null/undefined", () => {
    expect(normalizeWebsiteUrl(null)).toBe("");
    expect(normalizeWebsiteUrl(undefined)).toBe("");
    expect(normalizeWebsiteUrl("")).toBe("");
  });
});

describe("getLeadPrimaryUrl", () => {
  it("prefers website over instagram", () => {
    const lead = makeLead({ website: "https://example.com", ig_username: "example" });
    expect(getLeadPrimaryUrl(lead)).toBe("https://example.com/");
  });

  it("falls back to instagram URL", () => {
    const lead = makeLead({ website: "", ig_username: "example" });
    expect(getLeadPrimaryUrl(lead)).toBe("https://www.instagram.com/example/");
  });

  it("returns empty when neither exists", () => {
    const lead = makeLead({ website: "", ig_username: "" });
    expect(getLeadPrimaryUrl(lead)).toBe("");
  });
});

describe("categorizeLeadByAd", () => {
  it("detects Cafe/Restaurant", () => {
    expect(categorizeLeadByAd("static_caferest")).toBe("Cafe / Restaurant");
  });

  it("detects Corporate", () => {
    expect(categorizeLeadByAd("static_sirketekibinkurumsal")).toBe("Corporate");
  });

  it("detects Event/Music", () => {
    expect(categorizeLeadByAd("static_konsermuzika")).toBe("Event / Music");
    expect(categorizeLeadByAd("static_etkinlikmuzea")).toBe("Event / Music");
  });

  it("detects Factory", () => {
    expect(categorizeLeadByAd("factoryvideo")).toBe("Factory");
  });

  it("falls back to Other", () => {
    expect(categorizeLeadByAd("something_random")).toBe("Other");
  });
});

describe("computeTiers", () => {
  it("respects priority_override", () => {
    const leads = [
      makeLead({ id: "a", title: "CEO", quantity: "50-100", priority_override: 4 }),
      makeLead({ id: "b", title: "", quantity: "1-15" }),
    ];
    const tiers = computeTiers(leads);
    expect(tiers.get("a")).toBe(4);
    expect(tiers.get("b")).toBe(4);
  });
});

describe("getLeadCategories", () => {
  it("counts categories correctly", () => {
    const leads = [
      makeLead({ ad_name: "static_caferest" }),
      makeLead({ ad_name: "static_caferest" }),
      makeLead({ ad_name: "factoryvideo" }),
    ];
    const cats = getLeadCategories(leads);
    expect(cats["Cafe / Restaurant"]).toBe(2);
    expect(cats["Factory"]).toBe(1);
  });
});

describe("getQuantityBreakdown", () => {
  it("groups by quantity", () => {
    const leads = [
      makeLead({ quantity: "16-50" }),
      makeLead({ quantity: "16-50" }),
      makeLead({ quantity: "100+" }),
    ];
    const breakdown = getQuantityBreakdown(leads);
    const map = new Map(breakdown.map((b) => [b.name, b.value]));
    expect(map.get("16-50")).toBe(2);
    expect(map.get("100+")).toBe(1);
  });
});

describe("getProductBreakdown", () => {
  it("groups by product type", () => {
    const leads = [
      makeLead({ product_type: "giyim" }),
      makeLead({ product_type: "giyim" }),
      makeLead({ product_type: "aksesuar" }),
    ];
    const breakdown = getProductBreakdown(leads);
    const map = new Map(breakdown.map((b) => [b.name, b.value]));
    expect(map.get("giyim")).toBe(2);
    expect(map.get("aksesuar")).toBe(1);
  });
});
