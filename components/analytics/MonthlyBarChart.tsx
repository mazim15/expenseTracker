"use client";

import { useId } from "react";
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
      <div className="bg-popover shadow-lift rounded-2xl border px-3 py-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-sm font-bold tabular-nums">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const id = useId().replace(/:/g, "");
  const formatValue = (value: number) => formatCurrency(value, { notation: "compact" });

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const lastIndex = data.length - 1;

  return (
    <div
      role="img"
      aria-label="Monthly expenses bar chart"
      className="text-muted-foreground h-full w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#0F766E" />
            </linearGradient>
            <linearGradient id={`bar-muted-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.15}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "currentColor", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickFormatter={formatValue}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "currentColor", fontSize: 11 }}
            width={64}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "currentColor", fillOpacity: 0.06, radius: 12 }}
          />
          <Bar
            dataKey="amount"
            radius={[12, 12, 12, 12]}
            maxBarSize={44}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={index === lastIndex ? `url(#bar-${id})` : `url(#bar-muted-${id})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
