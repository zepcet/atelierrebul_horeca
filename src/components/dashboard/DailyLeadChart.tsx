import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/data/leads";
import { CHART_ADS } from "@/lib/brand-colors";
import { useMemo } from "react";

interface DailyLeadChartProps {
  data: Lead[];
}

const DailyLeadChart = ({ data }: DailyLeadChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const days: { date: string; label: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
      days.push({ date: dateStr, label, count: 0 });
    }

    data.forEach((lead) => {
      const created = new Date(lead.created_time);
      if (Number.isNaN(created.getTime())) return;
      const leadDate = created.toISOString().slice(0, 10);
      const day = days.find((d) => d.date === leadDate);
      if (day) day.count++;
    });

    return days;
  }, [data]);

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Daily Lead Quantity (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: 13,
                fontFamily: "JetBrains Mono",
              }}
              formatter={(value: number) => [value, "Leads"]}
            />
            <Bar
              dataKey="count"
              fill={CHART_ADS}
              stroke="none"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyLeadChart;
