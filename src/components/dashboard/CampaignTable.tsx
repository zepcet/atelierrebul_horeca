import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronDown, Settings2, Save, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// ─── Types ───
interface MetricsRow {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  reach: number;
  leads: number;
  cost_per_lead: number;
  date_start: string;
  date_stop: string;
}

interface AdRow extends MetricsRow {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
}

interface AdsetRow extends MetricsRow {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  ads: AdRow[];
}

export interface CampaignInsight extends MetricsRow {
  campaign_id: string;
  campaign_name: string;
  status: string;
  adsets?: AdsetRow[];
  actions?: { action_type: string; value: string }[];
}

// ─── Column definitions ───
interface ColumnDef {
  key: string;
  sortKey: string;
  label: string;
  align?: "left" | "right";
  render: (row: any, level: "campaign" | "adset" | "ad") => React.ReactNode;
}

const statusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-heyday-sunset text-heyday-midnight border-heyday-midnight/45";
    case "PAUSED":
      return "bg-heyday-mint/45 text-heyday-charcoal border-heyday-charcoal/32";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "status",
    sortKey: "status",
    label: "Status",
    render: (row, level) =>
      level === "campaign" ? (
        <Badge variant="outline" className={`text-[10px] font-mono ${statusColor(row.status)}`}>
          {row.status}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    key: "spend",
    sortKey: "spend",
    label: "Spend",
    align: "right",
    render: (row) => <span className="font-mono text-sm">₺{fmt(row.spend)}</span>,
  },
  {
    key: "leads",
    sortKey: "leads",
    label: "Leads",
    align: "right",
    render: (row) => <span className="font-mono text-sm font-semibold">{row.leads}</span>,
  },
  {
    key: "cost_per_lead",
    sortKey: "cost_per_lead",
    label: "CPL",
    align: "right",
    render: (row) => (
      <span className="font-mono text-sm">
        {row.leads > 0 ? `₺${fmt(row.cost_per_lead)}` : "—"}
      </span>
    ),
  },
  {
    key: "ctr",
    sortKey: "ctr",
    label: "CTR %",
    align: "right",
    render: (row) => <span className="font-mono text-sm">{fmt(row.ctr)}%</span>,
  },
  {
    key: "cpm",
    sortKey: "cpm",
    label: "CPM",
    align: "right",
    render: (row) => <span className="font-mono text-sm">₺{fmt(row.cpm)}</span>,
  },
  {
    key: "cpc",
    sortKey: "cpc",
    label: "CPC",
    align: "right",
    render: (row) => <span className="font-mono text-sm">₺{fmt(row.cpc)}</span>,
  },
  {
    key: "clicks",
    sortKey: "clicks",
    label: "Link Clicks",
    align: "right",
    render: (row) => <span className="font-mono text-sm">{row.clicks.toLocaleString()}</span>,
  },
  {
    key: "impressions",
    sortKey: "impressions",
    label: "Impressions",
    align: "right",
    render: (row) => <span className="font-mono text-sm">{row.impressions.toLocaleString()}</span>,
  },
  {
    key: "reach",
    sortKey: "reach",
    label: "Reach",
    align: "right",
    render: (row) => <span className="font-mono text-sm">{row.reach.toLocaleString()}</span>,
  },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);

interface Preset {
  name: string;
  columns: string[];
}

const STORAGE_KEY = "campaign-table-columns";
const PRESETS_KEY = "campaign-table-presets";

function loadVisibleColumns(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_VISIBLE;
}

function loadPresets(): Preset[] {
  try {
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

// ─── Component ───
interface CampaignTableProps {
  data: CampaignInsight[];
}

const CampaignTable = ({ data }: CampaignTableProps) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadVisibleColumns);
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [newPresetName, setNewPresetName] = useState("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortFn = useMemo(() => {
    if (!sortKey) return null;
    return (a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    };
  }, [sortKey, sortDir]);

  const sortedData = useMemo(() => {
    if (!sortFn) return data;
    return [...data].sort(sortFn).map((campaign) => {
      if (!campaign.adsets) return campaign;
      return {
        ...campaign,
        adsets: [...campaign.adsets].sort(sortFn).map((adset) => {
          if (!adset.ads) return adset;
          return { ...adset, ads: [...adset.ads].sort(sortFn) };
        }),
      };
    });
  }, [data, sortFn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }, [presets]);

  const columns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns]
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const savePreset = () => {
    if (!newPresetName.trim()) return;
    setPresets((prev) => [
      ...prev.filter((p) => p.name !== newPresetName.trim()),
      { name: newPresetName.trim(), columns: visibleColumns },
    ]);
    setNewPresetName("");
  };

  const loadPreset = (preset: Preset) => {
    setVisibleColumns(preset.columns);
  };

  const deletePreset = (name: string) => {
    setPresets((prev) => prev.filter((p) => p.name !== name));
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAdset = (id: string) => {
    setExpandedAdsets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
        No campaign data available for this period.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Column customization */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toggle Columns</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1.5 py-1">
                    <Checkbox
                      checked={visibleColumns.includes(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              <div className="border-t border-border pt-2 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presets</p>
                {presets.map((p) => (
                  <div key={p.name} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-start text-xs h-7"
                      onClick={() => loadPreset(p)}
                    >
                      {p.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deletePreset(p.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1">
                  <Input
                    placeholder="Preset name…"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="h-7 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && savePreset()}
                  />
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={savePreset}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setVisibleColumns(DEFAULT_VISIBLE)}
              >
                Reset to default
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider min-w-[280px]">
                    Name
                  </TableHead>
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:bg-muted/70 transition-colors ${col.align === "right" ? "text-right" : ""}`}
                      onClick={() => handleSort(col.sortKey)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                        {col.label}
                        {sortKey === col.sortKey ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((campaign) => {
                  const isExpanded = expandedCampaigns.has(campaign.campaign_id);
                  const hasAdsets = campaign.adsets && campaign.adsets.length > 0;

                  return (
                    <>
                      {/* Campaign row */}
                      <TableRow
                        key={campaign.campaign_id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => hasAdsets && toggleCampaign(campaign.campaign_id)}
                      >
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-1.5">
                            {hasAdsets && (
                              isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            {!hasAdsets && <span className="w-4" />}
                            <span className="truncate max-w-[240px]">{campaign.campaign_name}</span>
                          </div>
                        </TableCell>
                        {columns.map((col) => (
                          <TableCell key={col.key} className={col.align === "right" ? "text-right" : ""}>
                            {col.render(campaign, "campaign")}
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Adset rows */}
                      {isExpanded &&
                        campaign.adsets?.map((adset) => {
                          const isAdsetExpanded = expandedAdsets.has(adset.adset_id);
                          const hasAds = adset.ads && adset.ads.length > 0;

                          return (
                            <>
                              <TableRow
                                key={adset.adset_id}
                                className="hover:bg-muted/20 transition-colors bg-muted/10 cursor-pointer"
                                onClick={() => hasAds && toggleAdset(adset.adset_id)}
                              >
                                <TableCell className="text-sm">
                                  <div className="flex items-center gap-1.5 pl-6">
                                    {hasAds && (
                                      isAdsetExpanded
                                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    )}
                                    {!hasAds && <span className="w-3.5" />}
                                    <Badge variant="secondary" className="text-[10px] mr-1 shrink-0">Ad Set</Badge>
                                    <span className="truncate max-w-[200px] text-muted-foreground">{adset.adset_name}</span>
                                  </div>
                                </TableCell>
                                {columns.map((col) => (
                                  <TableCell key={col.key} className={col.align === "right" ? "text-right" : ""}>
                                    {col.render(adset, "adset")}
                                  </TableCell>
                                ))}
                              </TableRow>

                              {/* Ad rows */}
                              {isAdsetExpanded &&
                                adset.ads?.map((ad: any) => (
                                  <TableRow
                                    key={ad.ad_id}
                                    className="hover:bg-muted/10 transition-colors bg-muted/5"
                                  >
                                    <TableCell className="text-sm">
                                      <div className="flex items-center gap-2 pl-14">
                                        {ad.thumbnail_url ? (
                                          <div className="group/thumb relative shrink-0">
                                            <img
                                              src={ad.thumbnail_url}
                                              alt={ad.ad_name}
                                              className="h-8 w-8 rounded object-cover border border-border cursor-pointer transition-all duration-200 group-hover/thumb:scale-[5] group-hover/thumb:z-[100] group-hover/thumb:relative group-hover/thumb:shadow-2xl group-hover/thumb:rounded-lg"
                                            />
                                          </div>
                                        ) : (
                                          <div className="h-8 w-8 rounded bg-muted border border-border shrink-0 flex items-center justify-center">
                                            <span className="text-[8px] text-muted-foreground">No img</span>
                                          </div>
                                        )}
                                        <Badge variant="outline" className="text-[10px] shrink-0">Ad</Badge>
                                        <span className="truncate max-w-[160px] text-muted-foreground">{ad.ad_name}</span>
                                      </div>
                                    </TableCell>
                                    {columns.map((col) => (
                                      <TableCell key={col.key} className={col.align === "right" ? "text-right" : ""}>
                                        {col.render(ad, "ad")}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                            </>
                          );
                        })}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};

export default CampaignTable;
