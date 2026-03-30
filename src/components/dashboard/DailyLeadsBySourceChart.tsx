import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/data/leads";

interface DailyLeadsBySourceChartProps {
  data: Lead[];
}

const DailyLeadsBySourceChart = ({ data }: DailyLeadsBySourceChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const days: { date: string; label: string; ads: number; website: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
      days.push({ date: dateStr, label, ads: 0, website: 0 });
    }

    data.forEach((lead) => {
      const leadDate = new Date(lead.created_time).toISOString().slice(0, 10);
      const day = days.find((d) => d.date === leadDate);
      if (day) {
        if (lead.is_organic) day.website++;
        else day.ads++;
      }
    });

    return days;
  }, [data]);

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Daily Leads by Source (Last 7 Days)
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
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, fontFamily: "Plus Jakarta Sans" }}
            />
            <Bar dataKey="ads" name="Ads Leads" fill="hsl(239, 84%, 67%)" radius={[4, 4, 0, 0]} barSize={20} stackId="stack" />
            <Bar dataKey="website" name="Website Leads" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} barSize={20} stackId="stack" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyLeadsBySourceChart;
