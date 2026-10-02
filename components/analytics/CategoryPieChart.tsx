"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "@/lib/constants/categoryColors";
import { cn, formatCurrency } from "@/lib/utils";

interface ChartData {
  name: string;
  value: number;
  originalValue?: number;
}

interface CategoryPieChartProps {
  data: ChartData[];
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No category data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const active = activeIndex != null ? data[activeIndex] : null;

  return (
    <div
      role="img"
      aria-label="Expenses by category donut chart"
      className="flex h-full w-full flex-col gap-4"
    >
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="96%"
              paddingAngle={3}
              cornerRadius={8}
              stroke="none"
              animationDuration={900}
              animationEasing="ease-out"
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  opacity={activeIndex == null || activeIndex === index ? 1 : 0.35}
                  style={{ transition: "opacity 200ms" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-muted-foreground max-w-[60%] truncate text-xs font-medium">
            {active ? active.name : "Total"}
          </span>
          <span className="text-lg font-extrabold tracking-tight tabular-nums">
            {formatCurrency(active ? active.value : total, { notation: "compact" })}
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.map((item, index) => (
          <li
            key={item.name}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            className={cn(
              "flex items-center gap-2 transition-opacity",
              activeIndex != null && activeIndex !== index && "opacity-40",
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="text-muted-foreground min-w-0 flex-1 truncate">{item.name}</span>
            <span className="font-semibold tabular-nums">
              {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
