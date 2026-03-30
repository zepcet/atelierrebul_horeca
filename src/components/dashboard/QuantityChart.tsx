import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuantityChartProps {
  data: { range: string; count: number }[];
}

const COLORS = [
  "hsl(239, 84%, 67%)",
  "hsl(239, 70%, 75%)",
  "hsl(239, 50%, 82%)",
  "hsl(239, 30%, 88%)",
];

const QuantityChart = ({ data }: QuantityChartProps) => {
  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quantity Requested Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
            <YAxis
              dataKey="range"
              type="category"
              tick={{ fontSize: 12, fontFamily: "JetBrains Mono", fill: "hsl(215, 16%, 47%)" }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "6px",
                fontSize: 13,
                fontFamily: "JetBrains Mono",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default QuantityChart;
