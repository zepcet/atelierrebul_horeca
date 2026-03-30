import { useState, useMemo } from "react";
import { Lead, qtyToScore, computeTiers, CrmStatus, AM_PEOPLE, getLeadPrimaryUrl, normalizeWebsiteUrl, normalizeInstagramUsername } from "@/data/leads";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, X, Search, Sparkles, Loader2, Linkedin, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LeadTableProps {
  data: Lead[];
  onUpdateComment: (id: string, comment: string) => void;
  onUpdateCrmStatus: (id: string, status: CrmStatus) => void;
  onUpdateCompanyNote?: (id: string, note: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateCompanyName?: (id: string, name: string) => void;
  onUpdateFullName?: (id: string, name: string) => void;
  onLookupCompany?: (id: string) => void;
  onEnrichLead?: (id: string) => void;
  onUpdatePriority?: (id: string, priority: number) => void;
  onUpdateAmPerson?: (id: string, name: string) => void;
  newLeadIds?: Set<string>;
  isLookingUp?: Set<string>;
  isEnriching?: Set<string>;
  onRemoveFromDashboard?: (leadIds: string[]) => Promise<void>;
}

type SortDir = "asc" | "desc" | null;
type SortCol = "quantity" | "created_time" | "crm_status" | "tier" | null;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const formatPhone = (phone: string) => phone.replace("p:", "");

const crmStatusOrder: Record<string, number> = { contact: 1, proposal: 2, order: 3, lost: 4, "": 5 };
const crmStatusColor: Record<string, string> = {
  contact: "bg-heyday-mint/25 text-heyday-charcoal border-heyday-charcoal/28",
  proposal: "bg-heyday-sunset/10 text-heyday-midnight border-heyday-midnight/30",
  order: "bg-heyday-sunset text-heyday-midnight border-heyday-midnight/45",
  lost: "bg-heyday-mint/15 text-heyday-charcoal/65 border-heyday-charcoal/18",
};

const priorityConfig: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "Priority 1", emoji: "🟢", color: "bg-heyday-sunset/12 text-heyday-midnight border-heyday-midnight/35" },
  2: { label: "Priority 2", emoji: "🟡", color: "bg-heyday-mint/30 text-heyday-charcoal border-heyday-charcoal/30" },
  3: { label: "Priority 3", emoji: "🔵", color: "bg-heyday-mint/22 text-heyday-charcoal border-heyday-charcoal/25" },
  4: { label: "Priority 4", emoji: "⚪", color: "bg-muted text-muted-foreground border-border" },
};

const platformLabel: Record<string, string> = {
  ig: "Instagram",
  fb: "Facebook",
  web: "Website",
};

const KNOWN_STATUSES = ["contact", "proposal", "order", "lost"];

const LeadTable = ({ data, onUpdateComment, onUpdateCrmStatus, onUpdateCompanyNote, onUpdateTitle, onUpdateCompanyName, onUpdateFullName, onEnrichLead, onUpdatePriority, onUpdateAmPerson, newLeadIds, isEnriching, onRemoveFromDashboard }: LeadTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customStatusEditId, setCustomStatusEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [qtyFilter, setQtyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [amFilter, setAmFilter] = useState<string>("all");

  const isNew = (id: string) => newLeadIds?.has(id) ?? false;
  const tierMap = useMemo(() => computeTiers(data), [data]);

  const uniqueQty = useMemo(() => {
    const s = new Set<string>();
    data.forEach((l) => s.add(l.quantity || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((l) =>
      (l.sirket_adi || "").toLowerCase().includes(q) ||
      (l.company_name || "").toLowerCase().includes(q) ||
      (l.adi_soyadi || "").toLowerCase().includes(q) ||
      (l.full_name || "").toLowerCase().includes(q) ||
      (l.eposta || "").toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.telefon || "").toLowerCase().includes(q) ||
      (l.phone_number || "").toLowerCase().includes(q) ||
      (l.ad_name || "").toLowerCase().includes(q) ||
      (l.quantity || "").toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const filtered = useMemo(() => {
    return searched.filter((l) => {
      if (priorityFilter !== "all" && String(tierMap.get(l.id) ?? 4) !== priorityFilter) return false;
      if (qtyFilter !== "all" && (l.quantity || "Unknown") !== qtyFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "_none" && l.crm_status) return false;
        if (statusFilter !== "_none" && l.crm_status !== statusFilter) return false;
      }
      if (sourceFilter !== "all" && (l.platform || "") !== sourceFilter) return false;
      if (amFilter !== "all") {
        if (amFilter === "_unassigned" && l.am_person) return false;
        if (amFilter !== "_unassigned" && l.am_person !== amFilter) return false;
      }
      return true;
    });
  }, [searched, priorityFilter, qtyFilter, statusFilter, sourceFilter, amFilter, tierMap]);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortCol) {
        case "quantity": return (qtyToScore(a.quantity) - qtyToScore(b.quantity)) * dir;
        case "created_time": return (new Date(a.created_time).getTime() - new Date(b.created_time).getTime()) * dir;
        case "crm_status": return ((crmStatusOrder[a.crm_status || ""] || 5) - (crmStatusOrder[b.crm_status || ""] || 5)) * dir;
        case "tier": return ((tierMap.get(a.id) ?? 4) - (tierMap.get(b.id) ?? 4)) * dir;
        default: return 0;
      }
    });
    return arr;
  }, [filtered, sortCol, sortDir, tierMap]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sorted.map((l) => l.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasActiveFilters = priorityFilter !== "all" || qtyFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all" || amFilter !== "all";

  const clearAllFilters = () => {
    setPriorityFilter("all");
    setQtyFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setAmFilter("all");
  };

  const handleConfirmDelete = async () => {
    if (!onRemoveFromDashboard) return;
    setDeletePending(true);
    try {
      await onRemoveFromDashboard([...selectedIds]);
      setSelectedIds(new Set());
      setConfirmDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  };

  const thClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold text-foreground">Lead List</h2>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="1">🟢 Priority 1</SelectItem>
              <SelectItem value="2">🟡 Priority 2</SelectItem>
              <SelectItem value="3">🔵 Priority 3</SelectItem>
              <SelectItem value="4">⚪ Priority 4</SelectItem>
            </SelectContent>
          </Select>

          <Select value={qtyFilter} onValueChange={setQtyFilter}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[110px] border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All QTY</SelectItem>
              {uniqueQty.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[130px] border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="order">Order</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="ig">Instagram</SelectItem>
              <SelectItem value="fb">Facebook</SelectItem>
              <SelectItem value="web">Website</SelectItem>
            </SelectContent>
          </Select>

          <Select value={amFilter} onValueChange={setAmFilter}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[130px] border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All AM</SelectItem>
              <SelectItem value="_unassigned">Unassigned</SelectItem>
              {AM_PEOPLE.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={clearAllFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}

          <span className="text-xs text-muted-foreground ml-auto">{sorted.length} / {data.length} lead</span>
        </div>

        {/* Search Bar + Delete Button */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {onRemoveFromDashboard && selectedIds.size > 0 && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-medium"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete {selectedIds.size} selected
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Remove from dashboard only — rows stay in Google Sheets
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-[1600px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-10 bg-card w-[40px] min-w-[40px]">
                  <Checkbox checked={someSelected ? "indeterminate" : allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                {/* DATE */}
                <TableHead className={`min-w-[130px] ${thClass} cursor-pointer`} onClick={() => toggleSort("created_time")}>
                  <div className="flex items-center">Date <SortIcon col="created_time" /></div>
                </TableHead>
                {/* PRIORITY */}
                <TableHead className={`min-w-[90px] ${thClass} cursor-pointer`} onClick={() => toggleSort("tier")}>
                  <div className="flex items-center">Priority <SortIcon col="tier" /></div>
                </TableHead>
                {/* COMPANY NAME */}
                <TableHead className={`min-w-[160px] ${thClass}`}>Company Type</TableHead>
                {/* NAME */}
                <TableHead className={`min-w-[160px] ${thClass}`}>Name</TableHead>
                {/* TITLE */}
                <TableHead className={`min-w-[140px] ${thClass}`}>Title</TableHead>
                {/* QTY */}
                <TableHead className={`min-w-[80px] ${thClass} cursor-pointer`} onClick={() => toggleSort("quantity")}>
                  <div className="flex items-center">QTY <SortIcon col="quantity" /></div>
                </TableHead>
                {/* CATEGORY */}
                <TableHead className={`min-w-[120px] ${thClass}`}>Product Category</TableHead>
                {/* TELEPHONE */}
                <TableHead className={`min-w-[130px] ${thClass}`}>Telephone</TableHead>
                {/* E-MAIL */}
                <TableHead className={`min-w-[180px] ${thClass}`}>E-Mail</TableHead>
                {/* AM */}
                <TableHead className={`min-w-[80px] ${thClass}`}>AM</TableHead>
                {/* STATUS */}
                <TableHead className={`min-w-[120px] ${thClass} cursor-pointer`} onClick={() => toggleSort("crm_status")}>
                  <div className="flex items-center">Status <SortIcon col="crm_status" /></div>
                </TableHead>
                {/* NOTES */}
                <TableHead className={`min-w-[200px] ${thClass}`}>Notes</TableHead>
                {/* SOURCE */}
                <TableHead className={`min-w-[100px] ${thClass}`}>Source</TableHead>
                {/* AI ENRICH */}
                <TableHead className={`min-w-[70px] ${thClass} text-center`}>AI</TableHead>
                {/* AD NAME */}
                <TableHead className={`min-w-[200px] ${thClass}`}>Ad Name</TableHead>
                {/* SUMMARY */}
                <TableHead className={`min-w-[200px] ${thClass}`}>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((lead) => {
                const tier = tierMap.get(lead.id) ?? 4;
                const pc = priorityConfig[tier];
                return (
                  <TableRow key={lead.id} className="group transition-colors hover:bg-muted/50">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted/50 transition-colors w-[40px] min-w-[40px]">
                      <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleOne(lead.id)} />
                    </TableCell>
                    {/* DATE */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {isNew(lead.id) && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-heyday-sunset text-heyday-midnight border border-heyday-midnight/35 animate-pulse">New</Badge>
                        )}
                        {formatDate(lead.created_time)}
                      </div>
                    </TableCell>
                    {/* PRIORITY */}
                    <TableCell>
                      <Select
                        value={String(tier)}
                        onValueChange={(v) => onUpdatePriority?.(lead.id, Number(v))}
                      >
                        <SelectTrigger className={`h-7 text-xs w-[80px] border ${pc.color}`}>
                          <SelectValue>{pc.emoji} P{tier}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">🟢 P1</SelectItem>
                          <SelectItem value="2">🟡 P2</SelectItem>
                          <SelectItem value="3">🔵 P3</SelectItem>
                          <SelectItem value="4">⚪ P4</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* COMPANY NAME */}
                    <TableCell
                      className="font-medium text-sm cursor-text"
                      onClick={() => setEditingId(`company_${lead.id}`)}
                    >
                      {editingId === `company_${lead.id}` ? (
                        <Input
                          autoFocus
                          defaultValue={lead.company_name_override ?? (lead.sirket_adi || lead.company_name || "")}
                          className="h-7 text-xs"
                          onBlur={(e) => { onUpdateCompanyName?.(lead.id, e.target.value); setEditingId(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateCompanyName?.(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                        />
                      ) : (() => {
                        const name = lead.company_name_override || lead.sirket_adi || lead.company_name;
                        if (!name) return <span className="text-muted-foreground italic text-xs">Click to add…</span>;
                        const url = getLeadPrimaryUrl(lead) || null;
                        const hasWebsite = Boolean(normalizeWebsiteUrl(lead.website));
                        if (url) return (
                          <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-heyday-midnight hover:opacity-90 hover:underline flex items-center gap-1">
                            {!hasWebsite && <span className="text-[10px]">📱</span>}{name}
                          </a>
                        );
                        return <span>{name}</span>;
                      })()}
                    </TableCell>
                    {/* NAME */}
                    <TableCell
                      className="text-sm cursor-text"
                      onClick={() => setEditingId(`name_${lead.id}`)}
                    >
                      {editingId === `name_${lead.id}` ? (
                        <Input
                          autoFocus
                          defaultValue={lead.full_name_override ?? (lead.adi_soyadi || lead.full_name || "")}
                          className="h-7 text-xs"
                          onBlur={(e) => { onUpdateFullName?.(lead.id, e.target.value); setEditingId(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateFullName?.(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                        />
                      ) : (() => {
                        const name = lead.full_name_override || lead.adi_soyadi || lead.full_name;
                        if (!name) return <span className="text-muted-foreground italic text-xs">Click to add…</span>;
                        return (
                          <div className="flex items-center gap-1">
                            {lead.linkedin_url ? (
                              <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-heyday-midnight hover:opacity-90 hover:underline inline-flex items-center gap-1">
                                <Linkedin className="h-3 w-3 shrink-0" />{name}
                              </a>
                            ) : <span>{name}</span>}
                          </div>
                        );
                      })()}
                    </TableCell>
                    {/* TITLE */}
                    <TableCell className="cursor-text" onClick={() => setEditingId(`title_${lead.id}`)}>
                      {editingId === `title_${lead.id}` ? (
                        <Input
                          autoFocus
                          defaultValue={lead.title || ""}
                          className="h-7 text-xs"
                          onBlur={(e) => { onUpdateTitle?.(lead.id, e.target.value); setEditingId(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateTitle?.(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                        />
                      ) : lead.title ? (
                        <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">{lead.title}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Click to add…</span>
                      )}
                    </TableCell>
                    {/* QTY */}
                    <TableCell className="font-mono text-sm">{lead.quantity}</TableCell>
                    {/* CATEGORY */}
                    <TableCell className="text-xs">{lead.product_type || "—"}</TableCell>
                    {/* TELEPHONE */}
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatPhone(lead.telefon || lead.phone_number || "—")}</TableCell>
                    {/* E-MAIL */}
                    <TableCell className="font-mono text-xs text-muted-foreground">{lead.eposta || lead.email || "—"}</TableCell>
                    {/* AM */}
                    <TableCell>
                      <Select
                        value={lead.am_person || "_none"}
                        onValueChange={(v) => onUpdateAmPerson?.(lead.id, v === "_none" ? "" : v)}
                      >
                        <SelectTrigger className={`h-7 text-xs w-[110px] border ${lead.am_person ? "border-heyday-midnight/40" : "border-border"}`}>
                          <SelectValue placeholder="Assign">{lead.am_person || "—"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {AM_PEOPLE.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* STATUS */}
                    <TableCell>
                      <div className="flex flex-col gap-1 min-w-[130px]">
                        {(() => {
                          const isCustom = !!lead.crm_status && !KNOWN_STATUSES.includes(lead.crm_status);
                          const showInput = isCustom || customStatusEditId === lead.id;
                          return (
                            <>
                              <div className="flex items-center gap-1">
                                <Select
                                  value={isCustom ? "_custom" : (lead.crm_status || "_none")}
                                  onValueChange={(v) => {
                                    if (v === "_custom") {
                                      setCustomStatusEditId(lead.id);
                                    } else {
                                      setCustomStatusEditId(null);
                                      onUpdateCrmStatus(lead.id, (v === "_none" ? "" : v) as CrmStatus);
                                    }
                                  }}
                                >
                                  <SelectTrigger className={`h-7 text-xs w-[110px] border ${lead.crm_status ? (crmStatusColor[lead.crm_status] || "bg-heyday-sunset/10 text-heyday-midnight border-heyday-midnight/30") : "border-border"}`}>
                                    <SelectValue placeholder="Set status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">—</SelectItem>
                                    <SelectItem value="contact">Contact</SelectItem>
                                    <SelectItem value="proposal">Proposal</SelectItem>
                                    <SelectItem value="order">Order</SelectItem>
                                    <SelectItem value="lost">Lost</SelectItem>
                                    <SelectItem value="_custom">Custom…</SelectItem>
                                  </SelectContent>
                                </Select>
                                {lead.crm_status && (
                                  <button onClick={() => { onUpdateCrmStatus(lead.id, "" as CrmStatus); setCustomStatusEditId(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {showInput && (
                                <Input
                                  key={lead.id}
                                  autoFocus={customStatusEditId === lead.id}
                                  placeholder="Type custom status…"
                                  defaultValue={isCustom ? lead.crm_status : ""}
                                  className="h-6 text-xs"
                                  onBlur={(e) => { const v = e.target.value.trim(); if (v) onUpdateCrmStatus(lead.id, v as CrmStatus); setCustomStatusEditId(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) onUpdateCrmStatus(lead.id, v as CrmStatus); setCustomStatusEditId(null); } if (e.key === "Escape") setCustomStatusEditId(null); }}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    {/* NOTES */}
                    <TableCell className="cursor-pointer" onClick={() => setEditingId(lead.id)}>
                      {editingId === lead.id ? (
                        <Input
                          autoFocus
                          defaultValue={lead.special_comments}
                          className="h-7 text-xs"
                          onBlur={(e) => { onUpdateComment(lead.id, e.target.value); setEditingId(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateComment(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{lead.special_comments || "Click to add..."}</span>
                      )}
                    </TableCell>
                    {/* SOURCE */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {platformLabel[lead.platform] || lead.platform}
                      </Badge>
                    </TableCell>
                    {/* AI ENRICH */}
                    <TableCell className="text-center">
                      {onEnrichLead && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1">
                                {lead.enriched && (
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    lead.enrichment_quality === "full" ? "bg-heyday-sunset" :
                                    lead.enrichment_quality === "partial" ? "bg-heyday-mint-mid" :
                                    lead.enrichment_quality === "minimal" ? "bg-heyday-sunset/55" :
                                    "bg-heyday-midnight"
                                  }`} />
                                )}
                                <Button
                                  variant={lead.enriched ? "ghost" : "outline"}
                                  size="sm"
                                  className={`h-7 w-7 p-0 ${!lead.enriched ? "border-heyday-midnight/45 hover:bg-heyday-sunset/8" : ""}`}
                                  onClick={() => onEnrichLead(lead.id)}
                                  disabled={isEnriching?.has(lead.id)}
                                >
                                  {isEnriching?.has(lead.id) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className={`h-3.5 w-3.5 ${lead.enriched ? "text-muted-foreground" : "text-heyday-midnight"}`} />
                                  )}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              <div className="space-y-0.5">
                                <div>Website: {normalizeWebsiteUrl(lead.website) ? "found" : "missing"}</div>
                                <div>LinkedIn: {lead.linkedin_url ? "found" : "missing"}</div>
                                <div>Title: {lead.title ? "found" : "missing"}</div>
                                <div>Instagram: {normalizeInstagramUsername(lead.ig_username) ? "found" : "missing"}</div>
                                {lead.enrichment_attempts ? (
                                  <div className="pt-1 border-t border-border mt-1">Attempts: {lead.enrichment_attempts}</div>
                                ) : null}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    {/* AD NAME */}
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{lead.ad_name}</TableCell>
                    {/* SUMMARY */}
                    <TableCell className="cursor-pointer" onClick={() => setEditingId(`note_${lead.id}`)}>
                      {editingId === `note_${lead.id}` ? (
                        <Input
                          autoFocus
                          defaultValue={lead.company_note || ""}
                          className="h-7 text-xs"
                          onBlur={(e) => { onUpdateCompanyNote?.(lead.id, e.target.value); setEditingId(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { onUpdateCompanyNote?.(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{lead.company_note || "Click to add..."}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Confirmation dialog for bulk delete */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={(o) => { if (!deletePending) setConfirmDeleteOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size === 1
                ? "This lead will be hidden from the dashboard and Lead Hub. The row is not deleted from Google Sheets."
                : `${selectedIds.size} leads will be hidden from the dashboard and Lead Hub. Rows are not deleted from Google Sheets.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePending}
              onClick={(e) => { e.preventDefault(); void handleConfirmDelete(); }}
            >
              {deletePending ? "Removing…" : `Remove ${selectedIds.size === 1 ? "lead" : `${selectedIds.size} leads`}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadTable;
