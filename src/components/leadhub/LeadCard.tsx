import { Lead, effectivePriority, getLeadPrimaryUrl, normalizeWebsiteUrl } from "@/data/leads";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Linkedin } from "lucide-react";

const PRIORITY_CONFIG: Record<number, { emoji: string; bg: string; text: string }> = {
  1: { emoji: "🟢", bg: "bg-heyday-sunset/12", text: "text-heyday-midnight" },
  2: { emoji: "🟡", bg: "bg-heyday-mint/35", text: "text-heyday-charcoal" },
  3: { emoji: "🔵", bg: "bg-heyday-mint/22", text: "text-heyday-charcoal" },
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
                  <a href={url} target="_blank" rel="noreferrer" className="hover:text-heyday-midnight hover:underline" onClick={(e) => e.stopPropagation()}>
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
              <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-heyday-midnight" onClick={(e) => e.stopPropagation()}>
                <Linkedin className="h-3 w-3 flex-shrink-0" />
                {name}
              </a>
            ) : name}
          </p>
          {(phone || email) && (
            <div className="flex flex-col gap-0.5">
              {phone && (
                <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-muted-foreground hover:text-heyday-midnight truncate">
                   {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-muted-foreground hover:text-heyday-midnight truncate">
                  {email}
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {lead.am_person && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium border-heyday-midnight/40 text-heyday-midnight">
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
