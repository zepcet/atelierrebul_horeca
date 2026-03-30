import { Lead, computeTiers } from "@/data/leads";
import { Badge } from "@/components/ui/badge";
import { Instagram, Globe, ExternalLink, Building2, Phone, Mail, Package, Hash } from "lucide-react";
import { useMemo } from "react";

interface ConnectedLeadsProps {
  data: Lead[];
}

const tierColor: Record<number, string> = {
  1: "bg-heyday-sunset/12 text-heyday-midnight border-heyday-midnight/35",
  2: "bg-heyday-mint/30 text-heyday-charcoal border-heyday-charcoal/30",
  3: "bg-heyday-mint/22 text-heyday-charcoal border-heyday-charcoal/25",
  4: "bg-muted text-muted-foreground border-border",
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatPhone = (phone: string) => phone.replace("p:", "");

const ConnectedLeads = ({ data }: ConnectedLeadsProps) => {
  const tierMap = useMemo(() => computeTiers(data), [data]);

  if (data.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-card p-12 text-center">
        <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No connected leads yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Set a lead's status to "Connected" to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((lead) => {
        const tier = tierMap.get(lead.id) ?? 3;
        return (
          <div key={lead.id} className="border border-border rounded-lg bg-card p-4 hover:shadow-md transition-shadow space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {lead.sirket_adi || lead.company_name || "—"}
                </h3>
                <p className="text-xs text-muted-foreground">{lead.adi_soyadi || lead.full_name || "—"}</p>
              </div>
              <Badge variant="outline" className={`text-xs font-semibold ${tierColor[tier]}`}>
                T{tier}
              </Badge>
            </div>

            {/* Links */}
            <div className="flex items-center gap-3">
              {lead.ig_username && (
                <a href={`https://instagram.com/${lead.ig_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-heyday-midnight hover:opacity-90 hover:underline">
                  <Instagram className="h-3 w-3" />@{lead.ig_username}
                </a>
              )}
              {lead.website && (
                <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-heyday-midnight hover:opacity-90 hover:underline">
                  <ExternalLink className="h-3 w-3" />{lead.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />{lead.eposta || lead.email || "—"}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />{formatPhone(lead.telefon || lead.phone_number)}
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3" />{lead.product_type}
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3" />{lead.quantity}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Badge className="text-[10px] bg-heyday-mint/45 text-heyday-charcoal border-heyday-charcoal/28" variant="outline">Connected</Badge>
              <span className="text-[10px] font-mono text-muted-foreground">{formatDate(lead.created_time)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConnectedLeads;
