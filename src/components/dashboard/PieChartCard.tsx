import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PieChartCardProps {
  title: string;
  data: { name: string; value: number }[];
}

const COLORS = [
  "hsl(239, 84%, 67%)",
  "hsl(239, 70%, 75%)",
  "hsl(239, 50%, 82%)",
  "hsl(239, 30%, 88%)",
  "hsl(239, 84%, 55%)",
  "hsl(239, 60%, 70%)",
];

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
              label={({ value, cx, cy, midAngle, innerRadius: ir, outerRadius: or }) => {
                const RADIAN = Math.PI / 180;
                const radius = (ir + or) / 2;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
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
