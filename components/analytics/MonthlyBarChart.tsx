"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

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
      <div className="bg-background border rounded-lg p-2 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const formatValue = (value: number) => formatCurrency(value, { notation: 'compact' });

  return (
    <div role="img" aria-label="Monthly expenses bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={formatValue} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}