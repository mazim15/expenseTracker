"use client";

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/constants/categoryColors';

interface ChartData {
  name: string;
  value: number;
  originalValue?: number;
}

interface CategoryPieChartProps {
  data: ChartData[];
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const tooltipFormatter = (value: number) => `${Number(value).toFixed(1)}%`;

  const legendFormatter = (value: string) => {
    const item = data.find(d => d.name === value);
    if (!item) return value;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const percent = ((item.value / total) * 100).toFixed(1);
    return `${value} (${percent}%)`;
  };

  return (
    <div role="img" aria-label="Expenses by category pie chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => {
            if (percent < 0.05) return null;
            return `${name} (${(percent * 100).toFixed(0)}%)`;
          }}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
        <Legend 
          layout="vertical" 
          align="right"
          verticalAlign="middle"
          formatter={legendFormatter}
        />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}