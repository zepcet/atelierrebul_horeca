import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Check, X, Filter, Undo2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Lead, PipelineStage, effectivePriority } from "@/data/leads";
import { Button } from "@/components/ui/button";
import { LeadCard } from "./LeadCard";
import { toast } from "sonner";

type UndoEntry = { leadId: string; fromStage: PipelineStage }[];

const STAGES: { id: PipelineStage; label: string; emoji: string }[] = [
  { id: "new", label: "Yeni Lead", emoji: "🆕" },
  { id: "first_contact", label: "İlk Temas", emoji: "📞" },
  { id: "meeting", label: "Toplantı", emoji: "🤝" },
  { id: "proposal", label: "Teklif", emoji: "📄" },
  { id: "production", label: "Üretim", emoji: "⚙️" },
  { id: "delivery", label: "Teslim", emoji: "✅" },
  { id: "lost", label: "Lost", emoji: "✕" },
];

const PRIORITY_FILTERS: { value: number; label: string; emoji: string; bg: string; activeBg: string }[] = [
  { value: 1, label: "P1", emoji: "🟢", bg: "border-border text-muted-foreground hover:border-heyday-midnight/45", activeBg: "bg-heyday-sunset/12 text-heyday-midnight border-heyday-midnight/45" },
  { value: 2, label: "P2", emoji: "🟡", bg: "border-border text-muted-foreground hover:border-heyday-charcoal/25", activeBg: "bg-heyday-mint/35 text-heyday-charcoal border-heyday-charcoal/30" },
  { value: 3, label: "P3", emoji: "🔵", bg: "border-border text-muted-foreground hover:border-heyday-charcoal/22", activeBg: "bg-heyday-mint/22 text-heyday-charcoal border-heyday-charcoal/25" },
  { value: 4, label: "P4", emoji: "⚪", bg: "border-border text-muted-foreground hover:border-border", activeBg: "bg-muted text-foreground border-foreground/30" },
];

interface KanbanBoardProps {
  leads: Lead[];
  handleUpdatePipelineStage: (leadId: string, stage: PipelineStage) => void;
}

export function KanbanBoard({ leads, handleUpdatePipelineStage }: KanbanBoardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<PipelineStage | null>(null);
  const [activePriorities, setActivePriorities] = useState<Set<number>>(new Set());
  const undoStack = useRef<UndoEntry[]>([]);

  const pushUndo = useCallback((entries: UndoEntry) => {
    undoStack.current.push(entries);
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);

  const handleUndo = useCallback(() => {
    const last = undoStack.current.pop();
    if (!last) return;
    last.forEach(({ leadId, fromStage }) => handleUpdatePipelineStage(leadId, fromStage));
    toast.info(`Undid ${last.length} move(s)`);
  }, [handleUpdatePipelineStage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

  // Determine which priorities exist in this board's leads
  const availablePriorities = useMemo(() => {
    const s = new Set<number>();
    leads.forEach((l) => s.add(effectivePriority(l)));
    return s;
  }, [leads]);

  const togglePriorityFilter = useCallback((p: number) => {
    setActivePriorities((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }, []);

  // Filter leads by active priorities (empty = show all)
  const filteredLeads = useMemo(() => {
    if (activePriorities.size === 0) return leads;
    return leads.filter((l) => activePriorities.has(effectivePriority(l)));
  }, [leads, activePriorities]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo(() => {
    const map: Record<PipelineStage, Lead[]> = {
      new: [], first_contact: [], meeting: [], proposal: [],
      production: [], delivery: [], lost: [],
    };
    filteredLeads.forEach((l) => {
      const stage = l.pipeline_stage || "new";
      if (map[stage]) map[stage].push(l);
      else map.new.push(l);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => effectivePriority(a) - effectivePriority(b)));
    return map;
  }, [filteredLeads]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId as PipelineStage;
    const draggedId = result.draggableId;
    
    if (selectedIds.has(draggedId) && selectedIds.size > 1) {
      const undoEntries: UndoEntry = [];
      selectedIds.forEach((id) => {
        const lead = leads.find((l) => l.id === id);
        if (lead) undoEntries.push({ leadId: id, fromStage: lead.pipeline_stage || "new" });
        handleUpdatePipelineStage(id, newStage);
      });
      pushUndo(undoEntries);
      setSelectedIds(new Set());
      setBulkTarget(null);
    } else {
      const lead = leads.find((l) => l.id === draggedId);
      if (lead) pushUndo([{ leadId: draggedId, fromStage: lead.pipeline_stage || "new" }]);
      handleUpdatePipelineStage(draggedId, newStage);
    }
  }, [handleUpdatePipelineStage, selectedIds, leads, pushUndo]);

  const handleBulkMove = useCallback(() => {
    if (!bulkTarget || selectedIds.size === 0) return;
    const undoEntries: UndoEntry = [];
    selectedIds.forEach((id) => {
      const lead = leads.find((l) => l.id === id);
      if (lead) undoEntries.push({ leadId: id, fromStage: lead.pipeline_stage || "new" });
      handleUpdatePipelineStage(id, bulkTarget);
    });
    pushUndo(undoEntries);
    setSelectedIds(new Set());
    setBulkTarget(null);
  }, [bulkTarget, selectedIds, handleUpdatePipelineStage, leads, pushUndo]);

  const selectAllInColumn = useCallback((stage: PipelineStage) => {
    const ids = columns[stage].map((l) => l.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }, [columns]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Priority filter */}
      <div className="flex items-center gap-2 mb-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex items-center gap-1">
          {PRIORITY_FILTERS.filter((p) => availablePriorities.has(p.value)).map((p) => (
            <button
              key={p.value}
              onClick={() => togglePriorityFilter(p.value)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-all ${
                activePriorities.has(p.value) ? p.activeBg : p.bg
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
        {activePriorities.size > 0 && (
          <button
            onClick={() => setActivePriorities(new Set())}
            className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
          >
            Clear
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Undo last move (⌘Z)"
          >
            <Undo2 className="h-3 w-3" /> Undo
          </button>
          <span className="text-[10px] text-muted-foreground">
            {filteredLeads.length} / {leads.length} leads
          </span>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-heyday-sunset/8 border border-heyday-midnight/25">
          <span className="text-xs font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-1 ml-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => setBulkTarget(s.id)}
                className={`text-[10px] px-2 py-1 rounded border transition-all ${
                  bulkTarget === s.id
                    ? "bg-heyday-sunset text-heyday-midnight border-heyday-midnight/45"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          {bulkTarget && (
            <Button size="sm" className="h-6 text-[10px] ml-2" onClick={handleBulkMove}>
              <Check className="h-3 w-3 mr-1" /> Move
            </Button>
          )}
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkTarget(null); }}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-[220px] flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  onClick={() => selectAllInColumn(stage.id)}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-xs">{stage.emoji}</span>
                  <span className="text-[11px] font-semibold text-foreground">{stage.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {columns[stage.id].length}
                  </span>
                </button>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-lg p-1.5 space-y-1.5 overflow-y-auto transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-heyday-sunset/6 border-2 border-dashed border-heyday-midnight/35"
                        : "bg-muted/30 border border-border/50"
                    }`}
                  >
                    {columns[stage.id].map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "opacity-90 rotate-1" : ""}
                          >
                            <LeadCard
                              lead={lead}
                              isSelected={selectedIds.has(lead.id)}
                              onToggleSelect={toggleSelect}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {columns[stage.id].length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-[10px] text-muted-foreground/50 text-center py-8">
                        Drop leads here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
