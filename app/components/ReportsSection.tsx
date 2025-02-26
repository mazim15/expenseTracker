"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Expense } from '../types';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/solid';

// Add this utility function to get date from timestamp
const getDateFromTimestamp = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  try {
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  } catch (error) {
    console.error('Error converting timestamp to date:', error);
    return null;
  }
};

interface ReportsSectionProps {
  expenses: Expense[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ReportsSection({ expenses }: ReportsSectionProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return expenses;
    }
    
    return expenses.filter(expense => {
      const expenseDate = getDateFromTimestamp(expense.date);
      return expenseDate && expenseDate >= cutoffDate;
    });
  }, [expenses, timeRange]);
  
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    filteredExpenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);
  
  const timeSeriesData = useMemo(() => {
    const dateMap = new Map<string, number>();
    
    // Determine date format based on time range
    const getDateKey = (date: Date) => {
      if (timeRange === 'week') {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (timeRange === 'month') {
        return date.toLocaleDateString('en-US', { day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };
    
    filteredExpenses.forEach(expense => {
      const expenseDate = getDateFromTimestamp(expense.date);
      if (expenseDate) {
        const dateKey = getDateKey(expenseDate);
        const current = dateMap.get(dateKey) || 0;
        dateMap.set(dateKey, current + expense.amount);
      }
    });
    
    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredExpenses, timeRange]);
  
  const totalSpent = useMemo(() => 
    filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  , [filteredExpenses]);
  
  // Calculate comparison with previous period
  const previousPeriodComparison = useMemo(() => {
    const now = new Date();
    let currentPeriodStart = new Date();
    let previousPeriodStart = new Date();
    let previousPeriodEnd = new Date();
    
    switch (timeRange) {
      case 'week':
        currentPeriodStart.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(now.getDate() - 14);
        previousPeriodEnd.setDate(now.getDate() - 7);
        break;
      case 'month':
        currentPeriodStart.setMonth(now.getMonth() - 1);
        previousPeriodStart.setMonth(now.getMonth() - 2);
        previousPeriodEnd.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        currentPeriodStart.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(now.getFullYear() - 2);
        previousPeriodEnd.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return { percentage: 0, isIncrease: false };
    }
    
    const previousPeriodExpenses = expenses.filter(expense => {
      const expenseDate = getDateFromTimestamp(expense.date);
      return expenseDate && expenseDate >= previousPeriodStart && expenseDate <= previousPeriodEnd;
    });
    
    const previousTotal = previousPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    if (previousTotal === 0) return { percentage: 0, isIncrease: false };
    
    const percentageChange = ((totalSpent - previousTotal) / previousTotal) * 100;
    
    return {
      percentage: Math.abs(Math.round(percentageChange)),
      isIncrease: percentageChange > 0
    };
  }, [expenses, filteredExpenses, timeRange, totalSpent]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Reports</h2>
        <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['week', 'month', 'year', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <p className="text-2xl font-bold">PKR {totalSpent.toFixed(2)}</p>
              {previousPeriodComparison.percentage > 0 && (
                <div className="flex items-center mt-2 text-sm">
                  {previousPeriodComparison.isIncrease ? (
                    <>
                      <ArrowUpIcon className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-red-500">{previousPeriodComparison.percentage}% from previous {timeRange}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownIcon className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-500">{previousPeriodComparison.percentage}% from previous {timeRange}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Average Daily Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              PKR {(totalSpent / (timeSeriesData.length || 1)).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div>
                <p className="text-2xl font-bold">{categoryData[0].name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  PKR {categoryData[0].value.toFixed(2)} ({Math.round((categoryData[0].value / totalSpent) * 100)}%)
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`PKR ${value}`, 'Amount']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                    name="Expense"
                  />
                </LineChart>
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
                  <Tooltip formatter={(value) => [`PKR ${value}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`PKR ${value}`, 'Amount']} />
                <Legend />
                <Bar dataKey="value" name="Amount" fill="#8884d8">
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 