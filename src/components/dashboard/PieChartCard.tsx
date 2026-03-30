import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_PALETTE, CHART_PIE_LABEL_FILLS } from "@/lib/brand-colors";

interface PieChartCardProps {
  title: string;
  data: { name: string; value: number }[];
}

const COLORS = [...CHART_PALETTE];

const PieChartCard = ({ title, data }: PieChartCardProps) => {
  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
              label={({ value, cx, cy, midAngle, innerRadius: ir, outerRadius: or, index }) => {
                const RADIAN = Math.PI / 180;
                const radius = (ir + or) / 2;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                const i = typeof index === "number" ? index : 0;
                const fill =
                  CHART_PIE_LABEL_FILLS[i % CHART_PIE_LABEL_FILLS.length];
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={fill}
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: "JetBrains Mono" }}
                  >
                    {value}
                  </text>
                );
              }}
              labelLine={false}
            >
              {data.map((_, index) => (
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

export default PieChartCard;
