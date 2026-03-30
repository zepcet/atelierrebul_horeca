import { useMemo } from "react";
import { Mail } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { effectivePriority } from "@/data/leads";
import { KanbanBoard } from "@/components/leadhub/KanbanBoard";

export default function LeadHubLow() {
  const { allLeads, handleUpdatePipelineStage } = useDashboard();

  const lowPriorityLeads = useMemo(
    () => allLeads.filter((l) => effectivePriority(l) >= 3),
    [allLeads]
  );

  return (
    <div className="p-3 md:p-4 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Lead Hub — P3 & P4</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
          💬 WA + Mail
        </span>
        <span className="text-xs text-muted-foreground">({lowPriorityLeads.length} leads)</span>
      </div>
      <KanbanBoard leads={lowPriorityLeads} handleUpdatePipelineStage={handleUpdatePipelineStage} />
    </div>
  );
}
