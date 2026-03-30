import { Lead, effectivePriority, getLeadPrimaryUrl, normalizeWebsiteUrl } from "@/data/leads";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Linkedin } from "lucide-react";

const PRIORITY_CONFIG: Record<number, { emoji: string; bg: string; text: string }> = {
  1: { emoji: "🟢", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  2: { emoji: "🟡", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  3: { emoji: "🔵", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  4: { emoji: "⚪", bg: "bg-muted", text: "text-muted-foreground" },
};

function getSourceIcon(lead: Lead): string {
  if (lead.platform === "ig") return "📱";
  if (lead.platform === "fb") return "📘";
  if (lead.is_organic) return "🌐";
  return "🔍";
}

export function LeadCard({
  lead,
  isSelected,
  onToggleSelect,
}: {
  lead: Lead;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const priority = effectivePriority(lead);
  const pConfig = PRIORITY_CONFIG[priority];
  const companyName = lead.sirket_adi || lead.company_name || "—";
  const name = lead.adi_soyadi || lead.full_name || "—";
  const source = getSourceIcon(lead);
  const daysAgo = Math.floor((Date.now() - new Date(lead.created_time).getTime()) / 86400000);
  const quantity = lead.quantity;
  const email = lead.eposta || lead.email || "";
  const phone = lead.telefon || lead.phone_number || "";

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(lead.id)}
          className="mt-0.5 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pConfig.bg} ${pConfig.text}`}>
              {pConfig.emoji} P{priority}
            </span>
            
            <span className="text-[10px] text-muted-foreground ml-auto">{daysAgo}d</span>
          </div>
          <p className="text-xs font-semibold text-foreground truncate leading-tight">
            {(() => {
              const url = getLeadPrimaryUrl(lead) || null;
              const hasWebsite = Boolean(normalizeWebsiteUrl(lead.website));
              if (url) {
                return (
                  <a href={url} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {!hasWebsite && <span className="mr-0.5">📱</span>}
                    {companyName}
                  </a>
                );
              }
              return companyName;
            })()}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {lead.linkedin_url ? (
              <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary" onClick={(e) => e.stopPropagation()}>
                <Linkedin className="h-3 w-3 flex-shrink-0" />
                {name}
              </a>
            ) : name}
          </p>
          {(phone || email) && (
            <div className="flex flex-col gap-0.5">
              {phone && (
                <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-muted-foreground hover:text-primary truncate">
                   {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-muted-foreground hover:text-primary truncate">
                  {email}
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {lead.am_person && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium border-primary/30 text-primary">
                {lead.am_person}
              </Badge>
            )}
            {lead.title && (
              <span className="text-[10px] text-muted-foreground/70 truncate">{lead.title}</span>
            )}
            {quantity && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                {quantity}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
