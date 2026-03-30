import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, RefreshCw } from "lucide-react";
import { PeriodKey, periodOptions } from "@/lib/date-periods";

interface PeriodSelectorProps {
  selected: PeriodKey;
  onSelect: (period: PeriodKey) => void;
  onSync: () => void;
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
}

const formatSyncTime = (date: Date) => {
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PeriodSelector = ({ selected, onSelect, onSync, isSyncing, lastSyncTime }: PeriodSelectorProps) => {
  const selectedLabel = periodOptions.find((p) => p.key === selected)?.label;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-2 text-sm font-medium px-4">
            <CalendarDays className="h-4 w-4" />
            {selectedLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {periodOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className={opt.key === selected ? "bg-accent font-medium" : ""}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
          variant="default"
          className="h-9 w-9 p-0"
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        </Button>
      {lastSyncTime && (
        <span className="text-[10px] text-muted-foreground leading-none">
          {formatSyncTime(lastSyncTime)}
        </span>
      )}
    </div>
  );
};

export default PeriodSelector;
