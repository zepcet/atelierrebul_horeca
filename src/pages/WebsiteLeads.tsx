import { Globe, ArrowUpDown, ArrowUp, ArrowDown, X, Search, Linkedin, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { Lead, Priority, computePriority, getLeadPrimaryUrl, normalizeWebsiteUrl, AM_PEOPLE } from "@/data/leads";
import KPICard from "@/components/dashboard/KPICard";
import PieChartCard from "@/components/dashboard/PieChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

function computeWebsitePriority(qtyStr: string): Priority {
  const qty = parseInt(qtyStr, 10);
  if (isNaN(qty)) return 4;
  if (qty >= 100) return 1;
  if (qty >= 50) return 2;
  if (qty >= 16) return 3;
  return 4;
}

function qtyToScore(qtyStr: string): number {
  const qty = parseInt(qtyStr, 10);
  return isNaN(qty) ? 0 : qty;
}

const priorityConfig: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "Priority 1", emoji: "🟢", color: "bg-green-500/10 text-green-700 border-green-500/30" },
  2: { label: "Priority 2", emoji: "🟡", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
  3: { label: "Priority 3", emoji: "🔵", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  4: { label: "Priority 4", emoji: "⚪", color: "bg-muted text-muted-foreground border-border" },
};

const crmStatusColor: Record<string, string> = {
  contact: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  proposal: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  order: "bg-green-500/10 text-green-700 border-green-500/30",
  lost: "bg-red-500/10 text-red-700 border-red-500/30",
};
const crmStatusOrder: Record<string, number> = { contact: 1, proposal: 2, order: 3, lost: 4, "": 5 };

type SortDir = "asc" | "desc" | null;
type SortCol = "quantity" | "created_time" | "crm_status" | "tier" | null;

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const KNOWN_STATUSES = ["contact", "proposal", "order", "lost"];

const WebsiteLeads = () => {
  const {
    currentLeads, previousLeads, allLeads,
    handleUpdateComment, handleUpdateCrmStatus, handleUpdateCompanyNote,
    handleEnrichLead, enrichingIds, handleRemoveFromDashboard, handleUpdatePriority,
    handleUpdateTitle, handleUpdateCompanyName, handleUpdateFullName, handleUpdateAmPerson,
  } = useDashboard();

  const websiteLeads = useMemo(() => allLeads.filter((l) => l.is_organic), [allLeads]);
  const currentWebsiteLeads = useMemo(() => currentLeads.filter((l) => l.is_organic), [currentLeads]);
  const previousWebsiteLeads = useMemo(() => previousLeads.filter((l) => l.is_organic), [previousLeads]);

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

  const tierMap = useMemo(() => {
    const m = new Map<string, number>();
    websiteLeads.forEach((l) => {
      const p = l.priority_override ?? computeWebsitePriority(l.quantity);
      m.set(l.id, p);
    });
    return m;
  }, [websiteLeads]);

  const uniqueQty = useMemo(() => {
    const s = new Set<string>();
    websiteLeads.forEach((l) => s.add(l.quantity || "Unknown"));
    return Array.from(s).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [websiteLeads]);

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return websiteLeads;
    const q = searchQuery.toLowerCase();
    return websiteLeads.filter((l) =>
      (l.adi_soyadi || l.full_name || "").toLowerCase().includes(q) ||
      (l.eposta || l.email || "").toLowerCase().includes(q) ||
      (l.telefon || l.phone_number || "").toLowerCase().includes(q) ||
      (l.product_type || "").toLowerCase().includes(q)
    );
  }, [websiteLeads, searchQuery]);

  const filtered = useMemo(() => {
    return searched.filter((l) => {
      if (priorityFilter !== "all" && String(tierMap.get(l.id) ?? 4) !== priorityFilter) return false;
      if (qtyFilter !== "all" && (l.quantity || "Unknown") !== qtyFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "_none" && l.crm_status) return false;
        if (statusFilter !== "_none" && l.crm_status !== statusFilter) return false;
      }
      return true;
    });
  }, [searched, priorityFilter, qtyFilter, statusFilter, tierMap]);

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
      else { setSortCol(null); setSortDir(null); }
    } else { setSortCol(col); setSortDir("asc"); }
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
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const hasActiveFilters = priorityFilter !== "all" || qtyFilter !== "all" || statusFilter !== "all";
  const clearAllFilters = () => { setPriorityFilter("all"); setQtyFilter("all"); setStatusFilter("all"); };

  const thClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

  return (
    <div className="p-3 md:p-4 space-y-3">
      <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Website Leads ({websiteLeads.length})</h2>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard title="Total Leads" value={currentWebsiteLeads.length} previousValue={previousWebsiteLeads.length} />
      </div>

      {(() => {
        const buckets: Record<string, number> = { "16–50": 0, "50–100": 0, "100+": 0 };
        websiteLeads.forEach((l) => {
          const qty = parseInt(l.quantity || "0", 10);
          if (qty >= 100) buckets["100+"]++;
          else if (qty >= 50) buckets["50–100"]++;
          else buckets["16–50"]++;
        });
        const pieData = Object.entries(buckets)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value }));

        const now = new Date();
        const days: { date: string; label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          const label = d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
          days.push({ date: dateStr, label, count: 0 });
        }
        websiteLeads.forEach((l) => {
          const created = l.created_time ? l.created_time.split("T")[0] : "";
          const day = days.find((d) => d.date === created);
          if (day) day.count++;
        });

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PieChartCard title="Unit Quantity Breakdown" data={pieData} />
            <Card className="border border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Daily Website Leads (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={days} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 13, fontFamily: "JetBrains Mono" }} />
                    <Bar dataKey="count" name="Website Leads" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <div className="border border-border rounded-lg bg-card overflow-hidden">
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

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={clearAllFilters}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">{sorted.length} / {websiteLeads.length} lead</span>
          </div>

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

            {selectedIds.size > 0 && (
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
                  <TableHead className={`min-w-[130px] ${thClass} cursor-pointer`} onClick={() => toggleSort("created_time")}>
                    <div className="flex items-center">Date <SortIcon col="created_time" /></div>
                  </TableHead>
                  <TableHead className={`min-w-[90px] ${thClass} cursor-pointer`} onClick={() => toggleSort("tier")}>
                    <div className="flex items-center">Priority <SortIcon col="tier" /></div>
                  </TableHead>
                  <TableHead className={`min-w-[160px] ${thClass}`}>Company Name</TableHead>
                  <TableHead className={`min-w-[160px] ${thClass}`}>Name</TableHead>
                  <TableHead className={`min-w-[140px] ${thClass}`}>Title</TableHead>
                  <TableHead className={`min-w-[120px] ${thClass}`}>Category</TableHead>
                  <TableHead className={`min-w-[80px] ${thClass} cursor-pointer`} onClick={() => toggleSort("quantity")}>
                    <div className="flex items-center">Qty <SortIcon col="quantity" /></div>
                  </TableHead>
                  <TableHead className={`min-w-[130px] ${thClass}`}>Telephone</TableHead>
                  <TableHead className={`min-w-[180px] ${thClass}`}>E-Mail</TableHead>
                  <TableHead className={`min-w-[110px] ${thClass}`}>AM</TableHead>
                  <TableHead className={`min-w-[120px] ${thClass} cursor-pointer`} onClick={() => toggleSort("crm_status")}>
                    <div className="flex items-center">Status <SortIcon col="crm_status" /></div>
                  </TableHead>
                  <TableHead className={`min-w-[200px] ${thClass}`}>Notes</TableHead>
                  <TableHead className={`min-w-[100px] ${thClass}`}>Source</TableHead>
                  <TableHead className={`min-w-[70px] ${thClass} text-center`}>AI</TableHead>
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
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(lead.created_time)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={String(tier)}
                          onValueChange={(v) => handleUpdatePriority(lead.id, Number(v))}
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
                            onBlur={(e) => { handleUpdateCompanyName(lead.id, e.target.value); setEditingId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateCompanyName(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                          />
                        ) : (() => {
                          const name = lead.company_name_override || lead.sirket_adi || lead.company_name;
                          if (!name) return <span className="text-muted-foreground italic text-xs">Click to add…</span>;
                          const url = getLeadPrimaryUrl(lead) || null;
                          const hasWebsite = Boolean(normalizeWebsiteUrl(lead.website));
                          if (url) return (
                            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline flex items-center gap-1">
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
                            onBlur={(e) => { handleUpdateFullName(lead.id, e.target.value); setEditingId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateFullName(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                          />
                        ) : (() => {
                          const name = lead.full_name_override || lead.adi_soyadi || lead.full_name;
                          if (!name) return <span className="text-muted-foreground italic text-xs">Click to add…</span>;
                          return lead.linkedin_url ? (
                            <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline inline-flex items-center gap-1">
                              <Linkedin className="h-3 w-3 shrink-0" />{name}
                            </a>
                          ) : <span>{name}</span>;
                        })()}
                      </TableCell>
                      {/* TITLE */}
                      <TableCell className="cursor-text" onClick={() => setEditingId(`title_${lead.id}`)}>
                        {editingId === `title_${lead.id}` ? (
                          <Input
                            autoFocus
                            defaultValue={lead.title || ""}
                            className="h-7 text-xs"
                            onBlur={(e) => { handleUpdateTitle(lead.id, e.target.value); setEditingId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateTitle(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } if (e.key === "Escape") setEditingId(null); }}
                          />
                        ) : lead.title ? (
                          <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">{lead.title}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Click to add…</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(lead.product_type || "").split(",").map((c) => c.trim()).filter(Boolean).map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-xs font-normal">{cat}</Badge>
                          ))}
                          {!lead.product_type && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{lead.quantity || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{lead.telefon || lead.phone_number || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{lead.eposta || lead.email || "—"}</TableCell>
                      {/* AM */}
                      <TableCell>
                        <Select
                          value={lead.am_person || "_none"}
                          onValueChange={(v) => handleUpdateAmPerson(lead.id, v === "_none" ? "" : v)}
                        >
                          <SelectTrigger className={`h-7 text-xs w-[110px] border ${lead.am_person ? "border-primary/30" : "border-border"}`}>
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
                                        handleUpdateCrmStatus(lead.id, (v === "_none" ? "" : v) as any);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className={`h-7 text-xs w-[110px] border ${lead.crm_status ? (crmStatusColor[lead.crm_status] || "bg-purple-500/10 text-purple-700 border-purple-500/30") : "border-border"}`}>
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
                                    <button onClick={() => { handleUpdateCrmStatus(lead.id, "" as any); setCustomStatusEditId(null); }} className="text-muted-foreground hover:text-foreground">
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
                                    onBlur={(e) => { const v = e.target.value.trim(); if (v) handleUpdateCrmStatus(lead.id, v as any); setCustomStatusEditId(null); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) handleUpdateCrmStatus(lead.id, v as any); setCustomStatusEditId(null); } if (e.key === "Escape") setCustomStatusEditId(null); }}
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
                            defaultValue={lead.special_comments || ""}
                            className="h-7 text-xs"
                            onBlur={(e) => { handleUpdateComment(lead.id, e.target.value); setEditingId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateComment(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{lead.special_comments || "Click to add..."}</span>
                        )}
                      </TableCell>
                      {/* SOURCE */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">Website</Badge>
                      </TableCell>
                      {/* AI ENRICH */}
                      <TableCell className="text-center">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1">
                                {lead.enriched && (
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    lead.enrichment_quality === "full" ? "bg-green-500" :
                                    lead.enrichment_quality === "partial" ? "bg-yellow-500" :
                                    lead.enrichment_quality === "minimal" ? "bg-orange-500" :
                                    "bg-red-500"
                                  }`} />
                                )}
                                <Button
                                  variant={lead.enriched ? "ghost" : "outline"}
                                  size="sm"
                                  className={`h-7 w-7 p-0 ${!lead.enriched ? "border-primary/40 hover:bg-primary/10" : ""}`}
                                  onClick={() => handleEnrichLead(lead.id)}
                                  disabled={enrichingIds?.has(lead.id)}
                                >
                                  {enrichingIds?.has(lead.id) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className={`h-3.5 w-3.5 ${lead.enriched ? "text-muted-foreground" : "text-primary"}`} />
                                  )}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              <div className="space-y-0.5">
                                <div>Website: {normalizeWebsiteUrl(lead.website) ? "found" : "missing"}</div>
                                <div>LinkedIn: {lead.linkedin_url ? "found" : "missing"}</div>
                                <div>Title: {lead.title ? "found" : "missing"}</div>
                                {lead.enrichment_attempts ? (
                                  <div className="pt-1 border-t border-border mt-1">Attempts: {lead.enrichment_attempts}</div>
                                ) : null}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      {/* SUMMARY — manually editable */}
                      <TableCell className="cursor-pointer" onClick={() => setEditingId(`note_${lead.id}`)}>
                        {editingId === `note_${lead.id}` ? (
                          <Input
                            autoFocus
                            defaultValue={lead.company_note || ""}
                            className="h-7 text-xs"
                            onBlur={(e) => { handleUpdateCompanyNote(lead.id, e.target.value); setEditingId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { handleUpdateCompanyNote(lead.id, (e.target as HTMLInputElement).value); setEditingId(null); } }}
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
                onClick={(e) => {
                  e.preventDefault();
                  setDeletePending(true);
                  void (async () => {
                    try {
                      await handleRemoveFromDashboard([...selectedIds]);
                      setSelectedIds(new Set());
                      setConfirmDeleteOpen(false);
                    } finally {
                      setDeletePending(false);
                    }
                  })();
                }}
              >
                {deletePending ? "Removing…" : `Remove ${selectedIds.size === 1 ? "lead" : `${selectedIds.size} leads`}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default WebsiteLeads;
