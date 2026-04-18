"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  name: string;
  amount: number;
}

interface MonthlyBarChartProps {
  data: MonthlyData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background rounded-lg border p-2 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-primary text-sm">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const formatValue = (value: number) => formatCurrency(value, { notation: "compact" });

  // Debug log
  console.log("MonthlyBarChart data:", data);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div role="img" aria-label="Monthly expenses bar chart" className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={formatValue} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
