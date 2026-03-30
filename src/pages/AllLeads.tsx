import { useMemo } from "react";
import { Users } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import LeadTable from "@/components/dashboard/LeadTable";
import SourcePieChart from "@/components/dashboard/SourcePieChart";
import DailyLeadsBySourceChart from "@/components/dashboard/DailyLeadsBySourceChart";
import KPICard from "@/components/dashboard/KPICard";

const AllLeads = () => {
  const {
    currentLeads, previousLeads, allLeads, newLeadIds, enrichingIds, lookingUpIds,
    handleUpdateComment, handleUpdateCrmStatus, handleUpdateCompanyNote,
    handleEnrichLead, handleLookupCompany, handleUpdatePriority, handleUpdateAmPerson,
    handleRemoveFromDashboard, handleUpdateTitle, handleUpdateCompanyName, handleUpdateFullName,
  } = useDashboard();

  const adsLeads = useMemo(() => currentLeads.filter((l) => !l.is_organic), [currentLeads]);
  const websiteLeads = useMemo(() => currentLeads.filter((l) => l.is_organic), [currentLeads]);
  const prevAdsLeads = useMemo(() => previousLeads.filter((l) => !l.is_organic), [previousLeads]);
  const prevWebsiteLeads = useMemo(() => previousLeads.filter((l) => l.is_organic), [previousLeads]);

  return (
    <div className="p-3 md:p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">All Leads ({currentLeads.length})</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard title="Total Leads" value={currentLeads.length} previousValue={previousLeads.length} />
        <KPICard title="Ads Leads" value={adsLeads.length} previousValue={prevAdsLeads.length} />
        <KPICard title="Website Leads" value={websiteLeads.length} previousValue={prevWebsiteLeads.length} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SourcePieChart data={currentLeads} />
        <div className="md:col-span-2">
          <DailyLeadsBySourceChart data={allLeads} />
        </div>
      </div>

      <LeadTable
        data={currentLeads}
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
    </div>
  );
};

export default AllLeads;
