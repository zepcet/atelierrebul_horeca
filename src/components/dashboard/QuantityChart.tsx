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
import { CHART_PALETTE } from "@/lib/brand-colors";

interface QuantityChartProps {
  data: { range: string; count: number }[];
}

const COLORS = CHART_PALETTE.slice(0, 4);

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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 22%, 88%)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(160, 12%, 28%)" }} />
            <YAxis
              dataKey="range"
              type="category"
              tick={{ fontSize: 12, fontFamily: "JetBrains Mono", fill: "hsl(160, 12%, 28%)" }}
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
