"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getExpensesByMonth } from "@/lib/expenses";
import { format, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/utils";

type MonthlyChartProps = {
  userId: string;
};

interface MonthlyData {
  month: string;
  amount: number;
  index?: number;
}

export default function MonthlyChart({ userId }: MonthlyChartProps) {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const currentDate = new Date();
        const months = [];
        
        // Get data for the last 6 months
        for (let i = 0; i < 6; i++) {
          const date = subMonths(currentDate, i);
          const month = date.getMonth();
          const year = date.getFullYear();
          
          const expenses = await getExpensesByMonth(userId, month, year);
          const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
          
          months.unshift({
            month: format(date, "MMM yyyy"),
            amount: total
          });
        }
        
        setData(months);
      } catch (error) {
        console.error("Error fetching monthly data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchData();
    }
  }, [userId]);
  
  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }
  
  const handleMouseOver = (data: MonthlyData, index: number) => {
    setActiveIndex(index);
  };
  
  const handleMouseLeave = () => {
    setActiveIndex(null);
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 10,
          right: 10,
          left: 10,
          bottom: 20,
        }}
        onMouseLeave={handleMouseLeave}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" />
        <YAxis 
          tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })}
        />
        <Tooltip 
          formatter={(value) => formatCurrency(Number(value))}
          labelFormatter={(label) => `Month: ${label}`}
          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
        />
        <Bar 
          dataKey="amount" 
          radius={[4, 4, 0, 0]} 
          onMouseOver={(data) => handleMouseOver(data, data.index)}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={index === activeIndex ? '#3b82f6' : 'rgba(59, 130, 246, 0.7)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
} 