import { useMemo } from "react";
import { Crown } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { effectivePriority } from "@/data/leads";
import { KanbanBoard } from "@/components/leadhub/KanbanBoard";

export default function LeadHubHigh() {
  const { allLeads, handleUpdatePipelineStage } = useDashboard();

  const highPriorityLeads = useMemo(
    () => allLeads.filter((l) => effectivePriority(l) <= 2),
    [allLeads]
  );

  return (
    <div className="p-3 md:p-4 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-4 w-4 text-heyday-midnight" />
        <h2 className="text-sm font-semibold text-foreground">Lead Hub — P1 & P2</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-heyday-sunset/12 text-heyday-midnight border border-heyday-midnight/30 font-medium">
          📞 Telefon + LinkedIn
        </span>
        <span className="text-xs text-muted-foreground">({highPriorityLeads.length} leads)</span>
      </div>
      <KanbanBoard leads={highPriorityLeads} handleUpdatePipelineStage={handleUpdatePipelineStage} />
    </div>
  );
}
