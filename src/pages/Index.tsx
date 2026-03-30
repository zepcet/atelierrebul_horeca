import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { leads as staticLeads, getLeadCategories, getQuantityBreakdown, getProductBreakdown } from "@/data/leads";
import { getDateRange } from "@/lib/date-periods";
import KPICard from "@/components/dashboard/KPICard";
import PieChartCard from "@/components/dashboard/PieChartCard";
import DailyLeadChart from "@/components/dashboard/DailyLeadChart";
import LeadTable from "@/components/dashboard/LeadTable";
import ConnectedLeads from "@/components/dashboard/ConnectedLeads";
import CampaignTable, { CampaignInsight } from "@/components/dashboard/CampaignTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDashboard } from "@/hooks/useDashboard";

const Index = () => {
  const {
    allLeads, currentLeads, previousLeads, now, period,
    newLeadIds, enrichingIds, lookingUpIds,
    handleUpdateComment, handleUpdateCrmStatus, handleUpdateCompanyNote,
    handleEnrichLead, handleLookupCompany, handleUpdatePriority, handleUpdateAmPerson,
    handleRemoveFromDashboard, handleUpdateTitle, handleUpdateCompanyName, handleUpdateFullName,
  } = useDashboard();

  const adsAllLeads = useMemo(() => allLeads.filter((l) => !l.is_organic), [allLeads]);
  const adsCurrentLeads = useMemo(() => currentLeads.filter((l) => !l.is_organic), [currentLeads]);
  const adsPreviousLeads = useMemo(() => previousLeads.filter((l) => !l.is_organic), [previousLeads]);

  const isSyncingMetaRef = useRef(false);
  const [campaigns, setCampaigns] = useState<CampaignInsight[]>([]);
  const [campaignTotals, setCampaignTotals] = useState<{
    impressions: number; clicks: number; spend: number; reach: number; leads: number; cost_per_lead: number; ctr: number;
  } | null>(null);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);

  const currentRange = useMemo(() => getDateRange(period, now), [period, now]);
  const connectedLeads = useMemo(() => adsCurrentLeads.filter((l) => l.crm_status === "order"), [adsCurrentLeads]);
  const categories = useMemo(() => getLeadCategories(adsCurrentLeads), [adsCurrentLeads]);
  const prevCategories = useMemo(() => getLeadCategories(adsPreviousLeads), [adsPreviousLeads]);
  const quantityData = useMemo(() => getQuantityBreakdown(adsCurrentLeads), [adsCurrentLeads]);
  const productData = useMemo(() => getProductBreakdown(adsCurrentLeads), [adsCurrentLeads]);

  const fetchMetaCampaigns = useCallback(async () => {
    if (isSyncingMetaRef.current) return;
    isSyncingMetaRef.current = true;
    setIsSyncingMeta(true);
    try {
      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const { data, error } = await supabase.functions.invoke("fetch-meta-campaigns", {
        body: { date_from: fmt(currentRange.from), date_to: fmt(currentRange.to) },
      });
      if (error) throw error;
      if (data?.campaigns) { setCampaigns(data.campaigns); setCampaignTotals(data.totals); }
    } catch (err: unknown) {
      console.error("Meta sync error:", err);
      toast.error("Failed to fetch Meta campaign data");
    } finally { setIsSyncingMeta(false); isSyncingMetaRef.current = false; }
  }, [currentRange]);

  const hasMountedRef = useRef(false);
  useEffect(() => { fetchMetaCampaigns(); hasMountedRef.current = true; }, []);
  useEffect(() => { if (hasMountedRef.current) { setCampaigns([]); setCampaignTotals(null); fetchMetaCampaigns(); } }, [period]);

  const allCategoryKeys = useMemo(() => {
    const keys = new Set([...Object.keys(categories), ...Object.keys(prevCategories)]);
    return Array.from(keys);
  }, [categories, prevCategories]);

  return (
    <div className="bg-background p-4 md:p-6 space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Ads Leads</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard title="Total Ads Leads" value={adsCurrentLeads.length} previousValue={adsPreviousLeads.length} />
        {allCategoryKeys.map((cat) => (
          <KPICard key={cat} title={`${cat} Leads`} value={categories[cat] || 0} previousValue={prevCategories[cat] ?? 0} />
        ))}
        <KPICard title="Ad Spend" value={campaignTotals ? `₺${campaignTotals.spend.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} subtitle={!campaignTotals ? "Syncing Meta data…" : undefined} />
        <KPICard title="Cost per Lead" value={campaignTotals && campaignTotals.cost_per_lead > 0 ? `₺${campaignTotals.cost_per_lead.toFixed(2)}` : "—"} subtitle={!campaignTotals ? "Syncing Meta data…" : campaignTotals.leads === 0 ? "No lead actions tracked" : undefined} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PieChartCard title="Quantity Requested Breakdown" data={quantityData} />
        <DailyLeadChart data={adsAllLeads} />
      </div>

      {/* Campaign Performance */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Meta Campaign Performance {isSyncingMeta && <span className="text-xs normal-case">(syncing…)</span>}
        </h2>
        <CampaignTable data={campaigns} />
      </div>

      {/* Lead Table */}
      <Tabs defaultValue="all" className="space-y-3">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All Ads Leads ({adsCurrentLeads.length})</TabsTrigger>
          <TabsTrigger value="connected" className="text-xs">Connected ({connectedLeads.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LeadTable
            data={adsCurrentLeads}
            onUpdateComment={handleUpdateComment}
            onUpdateCrmStatus={handleUpdateCrmStatus}
            onUpdateCompanyNote={handleUpdateCompanyNote}
            onEnrichLead={handleEnrichLead}
            onLookupCompany={handleLookupCompany}
            onUpdatePriority={handleUpdatePriority}
            onUpdateAmPerson={handleUpdateAmPerson}
            onUpdateTitle={handleUpdateTitle}
            onUpdateCompanyName={handleUpdateCompanyName}
            onUpdateFullName={handleUpdateFullName}
            newLeadIds={newLeadIds}
            isEnriching={enrichingIds}
            isLookingUp={lookingUpIds}
            onRemoveFromDashboard={handleRemoveFromDashboard}
          />
        </TabsContent>
        <TabsContent value="connected">
          <ConnectedLeads data={connectedLeads} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
