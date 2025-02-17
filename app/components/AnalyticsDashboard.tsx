"use client";

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Expense {
  amount: number;
  category: string;
  date: Date | { toDate: () => Date } | string | null;
}

interface AnalyticsDashboardProps {
  expenses: Expense[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const getDateFromExpense = (expenseDate: Expense['date']): Date => {
  if (!expenseDate) {
    return new Date(); // Default to current date if null
  }
  
  if (expenseDate instanceof Date) {
    return expenseDate;
  }
  
  if (typeof expenseDate === 'object' && 'toDate' in expenseDate) {
    return expenseDate.toDate();
  }
  
  if (typeof expenseDate === 'string') {
    return new Date(expenseDate);
  }
  
  return new Date(); // Fallback
};

export default function AnalyticsDashboard({ expenses }: AnalyticsDashboardProps) {
  const categoryData = useMemo(() => {
    const categoryMap = new Map();
    expenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const monthMap = new Map();
    expenses.forEach(expense => {
      try {
        const date = getDateFromExpense(expense.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        const current = monthMap.get(monthYear) || 0;
        monthMap.set(monthYear, current + expense.amount);
      } catch (error) {
        console.error('Error processing date for expense:', expense, error);
      }
    });

    return Array.from(monthMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.name.split('/');
        const [bMonth, bYear] = b.name.split('/');
        return new Date(Number(aYear), Number(aMonth) - 1).getTime() - 
               new Date(Number(bYear), Number(bMonth) - 1).getTime();
      })
      .slice(-6); // Last 6 months
  }, [expenses]);

  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, expense) => sum + expense.amount, 0)
  , [expenses]);

  const averageExpense = useMemo(() => 
    expenses.length ? totalExpenses / expenses.length : 0
  , [expenses, totalExpenses]);

  const highestExpense = useMemo(() => 
    Math.max(...expenses.map(e => e.amount))
  , [expenses]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">PKR {totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Average Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">PKR {averageExpense.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Highest Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">PKR {highestExpense.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}