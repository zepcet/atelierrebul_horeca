import { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/data/leads";

interface SourcePieChartProps {
  data: Lead[];
}

const COLORS = ["hsl(239, 84%, 67%)", "hsl(142, 71%, 45%)"];

const SourcePieChart = ({ data }: SourcePieChartProps) => {
  const chartData = useMemo(() => {
    const ads = data.filter((l) => !l.is_organic).length;
    const website = data.filter((l) => l.is_organic).length;
    return [
      { name: "Ads Leads", value: ads },
      { name: "Website Leads", value: website },
    ].filter((d) => d.value > 0);
  }, [data]);

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          Lead Source Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
              label={({ value, cx, cy, midAngle, innerRadius: ir, outerRadius: or }) => {
                const RADIAN = Math.PI / 180;
                const radius = (ir + or) / 2;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fill="white"
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: "JetBrains Mono" }}
                  >
                    {value}
                  </text>
                );
              }}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
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
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SourcePieChart;
