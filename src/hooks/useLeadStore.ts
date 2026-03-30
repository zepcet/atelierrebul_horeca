import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PeriodKey, getDateRange, getPreviousDateRange } from "@/lib/date-periods";
import {
  Lead,
  CrmStatus,
  PipelineStage,
  computePriority,
  normalizeInstagramUsername,
  normalizeWebsiteUrl,
} from "@/data/leads";
import { toast } from "sonner";

const TZ_TURKEY_OFFSET = -180;

function toTurkeyWall(d: Date): Date {
  const utcMs = d.getTime();
  const localOffset = d.getTimezoneOffset();
  return new Date(utcMs + (localOffset - TZ_TURKEY_OFFSET) * 60_000);
}

function filterByRange(data: Lead[], from: Date, to: Date) {
  return data.filter((l) => {
    const d = toTurkeyWall(new Date(l.created_time));
    return d >= from && d <= to;
  });
}

export interface DashboardContext {
  allLeads: Lead[];
  setAllLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  period: PeriodKey;
  currentLeads: Lead[];
  previousLeads: Lead[];
  now: Date;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  newLeadIds: Set<string>;
  enrichingIds: Set<string>;
  lookingUpIds: Set<string>;
  handleUpdateComment: (id: string, comment: string) => void;
  handleUpdateCrmStatus: (id: string, status: CrmStatus) => void;
  handleUpdateCompanyNote: (id: string, note: string) => void;
  handleEnrichLead: (id: string) => void;
  handleLookupCompany: (id: string) => void;
  handleUpdatePipelineStage: (id: string, stage: PipelineStage) => void;
  handleUpdatePriority: (id: string, priority: number) => void;
  handleUpdateAmPerson: (id: string, name: string) => void;
  handleUpdateTitle: (id: string, title: string) => void;
  handleUpdateCompanyName: (id: string, name: string) => void;
  handleUpdateFullName: (id: string, name: string) => void;
  setPeriod: (period: PeriodKey) => void;
  handleSync: () => void;
  handleBulkEnrich: () => void;
  isBulkEnriching: boolean;
  bulkEnrichProgress: { done: number; total: number };
  /** Hide leads in the app only; does not change Google Sheets. */
  handleRemoveFromDashboard: (leadIds: string[]) => Promise<void>;
}

async function saveEnrichmentToDB(leadId: string, fullLead: Lead) {
  try {
    const normalizedWebsite = normalizeWebsiteUrl(fullLead.website);
    const normalizedIgUsername = normalizedWebsite
      ? ""
      : normalizeInstagramUsername(fullLead.ig_username);
    const row = {
      lead_id: leadId,
      title: fullLead.title || "",
      website: normalizedWebsite,
      linkedin_url: fullLead.linkedin_url || "",
      ig_username: normalizedIgUsername,
      am: fullLead.am ?? false,
      company_note: fullLead.company_note || "",
      crm_status: fullLead.crm_status || "",
      special_comments: fullLead.special_comments || "",
      enriched: fullLead.enriched ?? false,
      enrichment_quality: fullLead.enrichment_quality || "none",
      enrichment_attempts: fullLead.enrichment_attempts ?? 0,
      last_enriched_at: fullLead.last_enriched_at || null,
      pipeline_stage: fullLead.pipeline_stage || "new",
      priority_override: fullLead.priority_override ?? null,
      am_person: fullLead.am_person || "",
      company_name_override: fullLead.company_name_override ?? null,
      full_name_override: fullLead.full_name_override ?? null,
      updated_at: new Date().toISOString(),
    };
    await supabase
      .from("lead_enrichments")
      .upsert(row, { onConflict: "lead_id" });
  } catch (err) {
    console.error("Failed to save enrichment:", err);
  }
}

async function loadEnrichmentsFromDB(leads: Lead[]): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("lead_enrichments")
      .select("*");
    if (error) throw error;
    if (!data?.length) return leads;
    const enrichMap = new Map(data.map((e: any) => [e.lead_id, e]));
    return leads.map((l) => {
      const e = enrichMap.get(l.id);
      if (!e) return l;
      const mergedWebsite = normalizeWebsiteUrl(e.website || l.website || "");
      const mergedIg = mergedWebsite
        ? ""
        : normalizeInstagramUsername(
            (e as any).ig_username || l.ig_username || "",
          );
      return {
        ...l,
        title: (e.title && e.title !== "Unknown") ? e.title : (l.title || ""),
        website: mergedWebsite,
        linkedin_url: e.linkedin_url || l.linkedin_url || "",
        ig_username: mergedIg,
        am: e.am ?? l.am,
        company_note: e.company_note || l.company_note || "",
        crm_status: e.crm_status || l.crm_status || "",
        special_comments: e.special_comments || l.special_comments || "",
        enriched: e.enriched || l.enriched || false,
        enrichment_quality: (e as any).enrichment_quality || "none",
        enrichment_attempts: (e as any).enrichment_attempts ?? 0,
        last_enriched_at: (e as any).last_enriched_at || null,
        pipeline_stage:
          (e as any).pipeline_stage || l.pipeline_stage || "new",
        priority_override:
          (e as any).priority_override ?? l.priority_override ?? undefined,
        am_person: (e as any).am_person || l.am_person || "",
        company_name_override: (e as any).company_name_override || undefined,
        full_name_override: (e as any).full_name_override || undefined,
      };
    });
  } catch (err) {
    console.error("Failed to load enrichments:", err);
    return leads;
  }
}

function companyKey(lead: Lead): string {
  const company = (lead.sirket_adi || lead.company_name || "").toLowerCase().trim();
  const person = (lead.adi_soyadi || lead.full_name || "").toLowerCase().trim();
  return company || person || "";
}

export function useLeadStore(): DashboardContext {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [lookingUpIds, setLookingUpIds] = useState<Set<string>>(new Set());
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);
  const [bulkEnrichProgress, setBulkEnrichProgress] = useState({ done: 0, total: 0 });

  const hasSyncedRef = useRef(false);
  const isSyncingRef = useRef(false);
  const allLeadsRef = useRef(allLeads);
  allLeadsRef.current = allLeads;
  /** Sheet snapshot for “new lead” detection (independent of dashboard-hidden filter). */
  const lastKnownSheetLeadIdsRef = useRef<Set<string>>(new Set());
  const hiddenLeadIdsRef = useRef<Set<string>>(new Set());

  const now = useMemo(() => toTurkeyWall(new Date()), []);
  const currentRange = useMemo(
    () => getDateRange(period, now),
    [period, now],
  );
  const previousRange = useMemo(
    () => getPreviousDateRange(period, now),
    [period, now],
  );
  const currentLeads = useMemo(
    () => filterByRange(allLeads, currentRange.from, currentRange.to),
    [allLeads, currentRange],
  );
  const previousLeads = useMemo(
    () => filterByRange(allLeads, previousRange.from, previousRange.to),
    [allLeads, previousRange],
  );

  // ── Field-update handlers ──────────────────────────────────────────

  const handleUpdateComment = useCallback(
    (id: string, comment: string) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, special_comments: comment } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleUpdateCrmStatus = useCallback(
    (id: string, status: CrmStatus) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, crm_status: status } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
      if (status === "order") toast.success("Lead moved to Order");
    },
    [],
  );

  const handleUpdateCompanyNote = useCallback(
    (id: string, note: string) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, company_note: note } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleUpdatePipelineStage = useCallback(
    (id: string, stage: PipelineStage) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, pipeline_stage: stage } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleUpdatePriority = useCallback(
    (id: string, priority: number) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, priority_override: priority } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
      toast.success(`Priority set to P${priority}`);
    },
    [],
  );

  const handleUpdateAmPerson = useCallback(
    (id: string, name: string) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, am_person: name } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleUpdateTitle = useCallback(
    (id: string, title: string) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, title } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleUpdateCompanyName = useCallback(
    (id: string, name: string) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, company_name_override: name || undefined } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleUpdateFullName = useCallback(
    (id: string, name: string) => {
      setAllLeads((prev) => {
        const updated = prev.map((l) =>
          l.id === id ? { ...l, full_name_override: name || undefined } : l,
        );
        const lead = updated.find((l) => l.id === id);
        if (lead) saveEnrichmentToDB(id, lead);
        return updated;
      });
    },
    [],
  );

  const handleRemoveFromDashboard = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    const rows = leadIds.map((lead_id) => ({ lead_id }));
    const { error } = await supabase
      .from("dashboard_hidden_leads")
      .upsert(rows, { onConflict: "lead_id" });
    if (error) {
      console.error("dashboard_hidden_leads upsert:", error);
      toast.error("Could not remove from dashboard");
      return;
    }
    leadIds.forEach((id) => hiddenLeadIdsRef.current.add(id));
    setAllLeads((prev) => prev.filter((l) => !leadIds.includes(l.id)));
    setNewLeadIds((prev) => {
      const next = new Set(prev);
      leadIds.forEach((id) => next.delete(id));
      return next;
    });
    toast.success(
      leadIds.length === 1
        ? "Removed from dashboard"
        : `Removed ${leadIds.length} leads from dashboard`,
    );
  }, []);

  // ── Merge a single enrichment result into state ────────────────────

  const mergeEnrichmentResult = useCallback(
    (
      leadId: string,
      data: { website?: string; ig_username?: string; linkedin_url?: string; title?: string; company_note?: string; enrichment_quality?: string },
    ) => {
      setAllLeads((prev) => {
        const currentLead = prev.find((l) => l.id === leadId);
        const website = normalizeWebsiteUrl(data.website || currentLead?.website || "");
        const igUsername = website
          ? ""
          : normalizeInstagramUsername(data.ig_username || currentLead?.ig_username || "");

        const updated = prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                website: website || normalizeWebsiteUrl(l.website || ""),
                ig_username: website ? "" : igUsername,
                linkedin_url: data.linkedin_url || l.linkedin_url || "",
                title: (data.title && data.title !== "Unknown") ? data.title : (l.title || ""),
                company_note: data.company_note || l.company_note || "",
                enriched: true,
                enrichment_quality: data.enrichment_quality || l.enrichment_quality || "none",
                enrichment_attempts: (l.enrichment_attempts ?? 0) + 1,
                last_enriched_at: new Date().toISOString(),
              }
            : l,
        );
        const savedLead = updated.find((l) => l.id === leadId);
        if (savedLead) saveEnrichmentToDB(leadId, savedLead);
        return updated;
      });
    },
    [],
  );

  // ── Single-lead actions (manual buttons) ───────────────────────────

  const handleLookupCompany = useCallback(
    async (id: string) => {
      const lead = allLeadsRef.current.find((l) => l.id === id);
      if (!lead) return;
      const companyName = lead.sirket_adi || lead.company_name;
      if (!companyName) {
        toast.error("No company name to look up");
        return;
      }
      setLookingUpIds((prev) => new Set(prev).add(id));
      try {
        const personName = lead.adi_soyadi || lead.full_name || "";
        const email = lead.eposta || lead.email || "";
        const { data, error } = await supabase.functions.invoke(
          "search-lead-socials",
          { body: { lead_id: id, company_name: companyName, person_name: personName, email } },
        );
        if (error) throw error;
        if (data) {
          mergeEnrichmentResult(id, data);
        }
      } catch (err) {
        console.error("Lookup error:", err);
        toast.error(`Failed to look up ${companyName}`);
      } finally {
        setLookingUpIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }
    },
    [mergeEnrichmentResult],
  );

  const handleEnrichLead = useCallback(
    async (id: string) => {
      const lead = allLeadsRef.current.find((l) => l.id === id);
      if (!lead) return;
      const name = lead.adi_soyadi || lead.full_name;
      const company = lead.sirket_adi || lead.company_name;
      if (!name && !company) {
        toast.error("No name or company to enrich");
        return;
      }
      setEnrichingIds((prev) => new Set(prev).add(id));
      try {
        const email = lead.eposta || lead.email || "";
        const { data, error } = await supabase.functions.invoke(
          "search-lead-socials",
          { body: { lead_id: id, person_name: name || "", company_name: company || "", email } },
        );
        if (error) throw error;
        if (data) {
          mergeEnrichmentResult(id, data);
        }
      } catch (err) {
        console.error("Enrich error:", err);
        toast.error("Failed to enrich lead");
      } finally {
        setEnrichingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }
    },
    [mergeEnrichmentResult],
  );

  // ── Batch automation callbacks ─────────────────────────────────────

  const autoQAWebsites = useCallback(async () => {
    const leadsWithWebsites = allLeadsRef.current.filter((l) =>
      normalizeWebsiteUrl(l.website),
    );
    if (leadsWithWebsites.length === 0) return;
    console.log(`Auto QA: checking ${leadsWithWebsites.length} websites...`);
    try {
      const checks = leadsWithWebsites.map((l) => ({
        lead_id: l.id,
        company_name: l.sirket_adi || l.company_name || "",
        person_name: l.adi_soyadi || l.full_name || "",
        current_website: l.website || "",
      }));
      const batchSize = 10;
      let cleared = 0,
        ok = 0;
      for (let i = 0; i < checks.length; i += batchSize) {
        const batch = checks.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke(
          "qa-websites",
          { body: { checks: batch } },
        );
        if (error) {
          console.error("QA batch error:", error);
          continue;
        }
        if (data?.results) {
          for (const r of data.results) {
            if (r.status === "ok") {
              ok++;
              continue;
            }
            cleared++;
            setAllLeads((prev) => {
              const updated = prev.map((l) =>
                l.id === r.lead_id
                  ? { ...l, website: "" }
                  : l,
              );
              const lead = updated.find((l) => l.id === r.lead_id);
              if (lead) saveEnrichmentToDB(r.lead_id, lead);
              return updated;
            });
          }
        }
        if (i + batchSize < checks.length)
          await new Promise((r) => setTimeout(r, 500));
      }
      if (cleared > 0) {
        toast.info(
          `Website QA: ${ok} OK, ${cleared} broken URL${cleared > 1 ? "s" : ""} cleared`,
        );
      }
    } catch (err) {
      console.error("Auto QA error:", err);
    }
  }, []);

  const autoEnrichLeads = useCallback(
    async (leads: Lead[], forceBulk = false) => {
      const now = Date.now();

      const needsEnrichment = leads.filter((l) => {
        const hasIdentity =
          l.adi_soyadi || l.full_name || l.sirket_adi || l.company_name;
        if (!hasIdentity) return false;

        if (!l.enriched) return true;

        const quality = l.enrichment_quality || "none";
        const attempts = l.enrichment_attempts ?? 0;

        // Bulk mode: retry anything with none/minimal quality (up to 3 attempts)
        if (forceBulk) {
          return (quality === "none" || quality === "minimal") && attempts < 3;
        }

        // Normal mode: also require cooldown period since last attempt
        const lastEnriched = l.last_enriched_at ? new Date(l.last_enriched_at).getTime() : 0;
        const hoursSinceEnriched = (now - lastEnriched) / (60 * 60 * 1000);

        if ((quality === "none" || quality === "minimal") && attempts < 3 && hoursSinceEnriched >= 24) {
          return true;
        }

        return false;
      });

      if (needsEnrichment.length === 0) {
        toast.info("All leads are already enriched");
        autoQAWebsites();
        return;
      }

      // Company-level deduplication: only send one lead per unique company
      const seen = new Map<string, string[]>();
      const uniqueLeads: Lead[] = [];

      for (const lead of needsEnrichment) {
        const key = companyKey(lead);
        if (!key) continue;
        if (seen.has(key)) {
          seen.get(key)!.push(lead.id);
        } else {
          seen.set(key, [lead.id]);
          uniqueLeads.push(lead);
        }
      }

      console.log(`Auto enrich: ${needsEnrichment.length} leads (${uniqueLeads.length} unique companies)`);
      toast.info(`Enriching ${uniqueLeads.length} leads...`);
      setIsBulkEnriching(true);
      setBulkEnrichProgress({ done: 0, total: uniqueLeads.length });

      let consecutiveErrors = 0;
      let processed = 0;
      const batchSize = 5;
      for (let i = 0; i < uniqueLeads.length; i += batchSize) {
        // Circuit breaker: stop after 2 consecutive failures to avoid hammering
        if (consecutiveErrors >= 2) {
          console.log(`Auto enrich: stopping after ${consecutiveErrors} consecutive errors`);
          toast.error("Enrichment paused — API errors. Try again later.");
          break;
        }

        const batch = uniqueLeads.slice(i, i + batchSize);
        const enrichIds = batch.flatMap((l) => seen.get(companyKey(l)) || [l.id]);

        setEnrichingIds((prev) => {
          const next = new Set(prev);
          enrichIds.forEach((id) => next.add(id));
          return next;
        });

        try {
          const payload = batch.map((l) => ({
            lead_id: l.id,
            person_name: l.adi_soyadi || l.full_name || "",
            company_name: l.sirket_adi || l.company_name || "",
            email: l.eposta || l.email || "",
          }));

          const { data, error } = await supabase.functions.invoke(
            "search-lead-socials",
            { body: { leads: payload } },
          );

          if (error) {
            console.error("Auto-enrich batch error:", error);
            consecutiveErrors++;
            continue;
          }

          consecutiveErrors = 0;

          if (data?.results) {
            for (const r of data.results) {
              const website = normalizeWebsiteUrl(r.website || "");
              const igUsername = website
                ? ""
                : normalizeInstagramUsername(r.ig_username || "");

              const originalLead = batch.find((l) => l.id === r.lead_id);
              const key = originalLead ? companyKey(originalLead) : "";
              const siblingIds = key ? (seen.get(key) || [r.lead_id]) : [r.lead_id];

              for (const siblingId of siblingIds) {
                mergeEnrichmentResult(siblingId, {
                  website: r.website,
                  ig_username: r.ig_username,
                  linkedin_url: r.linkedin_url,
                  title: r.title,
                  company_note: r.company_note,
                  enrichment_quality: r.enrichment_quality,
                });
              }
            }
          }

          // Mark all leads in this batch as enriched even if Apollo found nothing,
          // so we don't burn credits re-querying the same leads on every sync.
          for (const lead of batch) {
            const key = companyKey(lead);
            const siblingIds = key ? (seen.get(key) || [lead.id]) : [lead.id];
            const alreadyMerged = data?.results?.some((r: any) => r.lead_id === lead.id &&
              (r.website || r.ig_username || r.linkedin_url || r.title || r.company_note));
            if (!alreadyMerged) {
              for (const siblingId of siblingIds) {
                mergeEnrichmentResult(siblingId, {});
              }
            }
          }
        } catch (err) {
          console.error("Auto-enrich batch error:", err);
        } finally {
          setEnrichingIds((prev) => {
            const next = new Set(prev);
            enrichIds.forEach((id) => next.delete(id));
            return next;
          });
          processed += batch.length;
          setBulkEnrichProgress({ done: processed, total: uniqueLeads.length });
        }

        if (i + batchSize < uniqueLeads.length)
          await new Promise((r) => setTimeout(r, 3000));
      }

      setIsBulkEnriching(false);
      toast.success(`Bulk enrichment complete (${processed}/${uniqueLeads.length})`);
      console.log("Auto enrich complete");
      autoQAWebsites();
    },
    [autoQAWebsites, mergeEnrichmentResult],
  );

  // ── Bulk enrich (manual one-time trigger) ────────────────────────

  const handleBulkEnrich = useCallback(() => {
    const leads = allLeadsRef.current;
    if (isBulkEnriching) {
      toast.info("Bulk enrichment already in progress");
      return;
    }
    autoEnrichLeads(leads, true);
  }, [autoEnrichLeads, isBulkEnriching]);

  // ── Fetch helpers ──────────────────────────────────────────────────

  const fetchWebsiteLeads = useCallback(async (): Promise<Lead[]> => {
    try {
      const { data, error } =
        await supabase.functions.invoke("fetch-website-leads");
      if (error) throw error;
      if (!data?.leads?.length) return [];
      return data.leads.map((wl: any, idx: number) => {
        const qty = wl["How much do you need? (units)"] || "";
        const cats = (wl["What kind of product do you need?"] || "")
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);
        let createdTime = "";
        const parts = (wl["Created At"] || "").match(
          /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/,
        );
        if (parts) {
          createdTime = `${parts[3]}-${parts[2]}-${parts[1]}T${parts[4]}:${parts[5]}:00+03:00`;
        }
        return {
          id: wl._row_id || `website-lead-${idx}`,
          created_time: createdTime,
          ad_id: "",
          ad_name: "",
          adset_id: "",
          adset_name: "",
          campaign_id: "",
          campaign_name: "",
          form_id: "",
          form_name: "",
          is_organic: true,
          platform: "web",
          product_type: cats.join(", "),
          quantity: qty,
          sirket_adi: "",
          adi_soyadi: `${wl["First Name"] || ""} ${wl["Last Name"] || ""}`.trim(),
          eposta: wl.Email || "",
          telefon: wl["Phone Number"] || "",
          lead_status: "",
          company_name: "",
          full_name: `${wl["First Name"] || ""} ${wl["Last Name"] || ""}`.trim(),
          email: wl.Email || "",
          phone_number: wl["Phone Number"] || "",
          special_comments: "",
        } as Lead;
      });
    } catch (err) {
      console.error("Website leads fetch error:", err);
      return [];
    }
  }, []);

  const fetchLeadsFromSheet = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const [adsResult, websiteLeads] = await Promise.all([
        supabase.functions.invoke("fetch-leads"),
        fetchWebsiteLeads(),
      ]);

      if (adsResult.error) throw adsResult.error;

      const adsLeads: Lead[] = adsResult.data?.leads || [];
      const incoming = [...adsLeads, ...websiteLeads];

      if (incoming.length) {
        let freshIds = new Set<string>();
        if (hasSyncedRef.current) {
          const prev = lastKnownSheetLeadIdsRef.current;
          freshIds = new Set(
            incoming.filter((l) => !prev.has(l.id)).map((l) => l.id),
          );
        }
        lastKnownSheetLeadIdsRef.current = new Set(
          incoming.map((l) => l.id),
        );
        hasSyncedRef.current = true;
        setNewLeadIds(freshIds);

        const enrichedIncoming = await loadEnrichmentsFromDB(incoming);
        const localMap = new Map(
          allLeadsRef.current.map((l) => [l.id, l]),
        );
        const merged = enrichedIncoming.map((l) => {
          const existing = localMap.get(l.id);
          return {
            ...l,
            special_comments:
              l.special_comments || existing?.special_comments || "",
            crm_status: l.crm_status || existing?.crm_status || "",
            ig_username: existing?.ig_username || l.ig_username || "",
            website: l.website || existing?.website || "",
            title: l.title || existing?.title || "",
            company_note: l.company_note || existing?.company_note || "",
            am: l.am ?? existing?.am,
            linkedin_url: l.linkedin_url || existing?.linkedin_url || "",
            enriched: l.enriched || existing?.enriched || false,
            enrichment_quality: l.enrichment_quality || existing?.enrichment_quality || "none",
            enrichment_attempts: l.enrichment_attempts ?? existing?.enrichment_attempts ?? 0,
            last_enriched_at: l.last_enriched_at || existing?.last_enriched_at || undefined,
            pipeline_stage:
              l.pipeline_stage || existing?.pipeline_stage || "new",
            priority_override:
              l.priority_override ??
              existing?.priority_override ??
              undefined,
            am_person: l.am_person || existing?.am_person || "",
          };
        });

        const visible = (merged as Lead[]).filter(
          (l) => !hiddenLeadIdsRef.current.has(l.id),
        );
        setAllLeads(visible);
        setLastSyncTime(new Date());

        const newCount = freshIds.size;
        toast.success(
          newCount > 0
            ? `Synced ${incoming.length} leads (${newCount} new)`
            : `Synced ${incoming.length} leads (no new)`,
        );

        if (freshIds.size > 0) {
          const newLeadsForSlack = (merged as Lead[])
            .filter(
              (l) =>
                freshIds.has(l.id) &&
                !l.is_organic &&
                !hiddenLeadIdsRef.current.has(l.id),
            )
            .map((l) => ({ ...l, priority: computePriority(l) }));
          supabase.functions
            .invoke("notify-slack", { body: { leads: newLeadsForSlack } })
            .then(({ error }) => {
              if (error) console.error("Slack notify error:", error);
              else
                toast.info(
                  `Sent ${newLeadsForSlack.length} new lead(s) to Slack`,
                );
            });
        }

        autoQAWebsites();
      } else {
        hasSyncedRef.current = true;
        toast.info("No leads found");
      }
    } catch (err: unknown) {
      console.error("Sync error:", err);
      toast.error("Failed to sync leads from Google Sheets");
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [fetchWebsiteLeads, autoQAWebsites]);

  const handleSync = useCallback(() => {
    fetchLeadsFromSheet();
  }, [fetchLeadsFromSheet]);

  // ── Mount effects: smart sync with visibility API ──────────────────

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data, error } = await supabase
          .from("dashboard_hidden_leads")
          .select("lead_id");
        if (!error && data?.length) {
          hiddenLeadIdsRef.current = new Set(
            data.map((r: { lead_id: string }) => r.lead_id),
          );
        }
      } catch (e) {
        console.error("Failed to load dashboard_hidden_leads:", e);
      }
      await fetchLeadsFromSheet();
    };

    void bootstrap();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        fetchLeadsFromSheet();
      }, 2 * 60 * 1000);
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        fetchLeadsFromSheet();
        startInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    allLeads,
    setAllLeads,
    period,
    currentLeads,
    previousLeads,
    now,
    isSyncing,
    lastSyncTime,
    newLeadIds,
    enrichingIds,
    lookingUpIds,
    handleUpdateComment,
    handleUpdateCrmStatus,
    handleUpdateCompanyNote,
    handleEnrichLead,
    handleLookupCompany,
    handleUpdatePipelineStage,
    handleUpdatePriority,
    handleUpdateAmPerson,
    setPeriod,
    handleSync,
    handleBulkEnrich,
    isBulkEnriching,
    bulkEnrichProgress,
    handleRemoveFromDashboard,
    handleUpdateTitle,
    handleUpdateCompanyName,
    handleUpdateFullName,
  };
}
