import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  previousValue?: number | null;
}

const KPICard = ({ title, value, subtitle, previousValue }: KPICardProps) => {
  const currentNum = typeof value === "number" ? value : null;
  const showComparison = currentNum !== null && previousValue !== null && previousValue !== undefined;

  let changePercent = 0;
  let changeDirection: "up" | "down" | "flat" = "flat";

  if (showComparison && previousValue > 0) {
    changePercent = Math.round(((currentNum - previousValue) / previousValue) * 100);
    changeDirection = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  } else if (showComparison && previousValue === 0 && currentNum > 0) {
    changeDirection = "up";
    changePercent = 100;
  }

  return (
    <Card className="border border-border bg-card">
        <CardContent className="p-4 md:p-5">
        <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl md:text-3xl font-semibold font-mono text-foreground tracking-tight">
          {value}
        </p>
        {showComparison ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            {changeDirection === "up" && <TrendingUp className="h-3 w-3 text-foreground" />}
            {changeDirection === "down" && <TrendingDown className="h-3 w-3 text-muted-foreground" />}
            {changeDirection === "flat" && <Minus className="h-3 w-3 text-muted-foreground" />}
            <span
              className={`text-xs font-mono font-medium ${
                changeDirection === "up"
                  ? "text-foreground"
                  : changeDirection === "down"
                  ? "text-muted-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {changeDirection === "up" ? "+" : ""}
              {changePercent}%
            </span>
            <span className="text-xs text-muted-foreground">vs prev</span>
          </div>
        ) : subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default KPICard;
