"use client";

import React, { useMemo } from 'react';
import { Expense } from '../types';
import { ArrowDownIcon, ArrowUpIcon, CurrencyDollarIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

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

interface DashboardSummaryProps {
  expenses: Expense[];
}

export default function DashboardSummary({ expenses }: DashboardSummaryProps) {
  // Calculate total expenses
  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, expense) => sum + expense.amount, 0)
  , [expenses]);
  
  // Calculate this month's expenses
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return expenses
      .filter(expense => {
        const expenseDate = getDateFromTimestamp(expense.date);
        return expenseDate && expenseDate >= startOfMonth;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);
  
  // Calculate last month's expenses
  const lastMonthExpenses = useMemo(() => {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return expenses
      .filter(expense => {
        const expenseDate = getDateFromTimestamp(expense.date);
        return expenseDate && expenseDate >= startOfLastMonth && expenseDate <= endOfLastMonth;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);
  
  // Calculate percentage change
  const percentageChange = useMemo(() => {
    if (lastMonthExpenses === 0) return 0;
    return ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
  }, [thisMonthExpenses, lastMonthExpenses]);
  
  // Get top category
  const topCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });
    
    let maxCategory = '';
    let maxAmount = 0;
    
    categoryMap.forEach((amount, category) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxCategory = category;
      }
    });
    
    return {
      name: maxCategory,
      amount: maxAmount,
      percentage: totalExpenses > 0 ? (maxAmount / totalExpenses) * 100 : 0
    };
  }, [expenses, totalExpenses]);
  
  // Get recent activity count
  const recentActivityCount = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return expenses.filter(expense => {
      const expenseDate = getDateFromTimestamp(expense.date);
      return expenseDate && expenseDate >= oneWeekAgo;
    }).length;
  }, [expenses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Expenses Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mr-4">
            <CurrencyDollarIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">PKR {totalExpenses.toFixed(2)}</h3>
          </div>
        </div>
      </div>
      
      {/* This Month Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 mr-4">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">PKR {thisMonthExpenses.toFixed(2)}</h3>
            
            {percentageChange !== 0 && (
              <div className="flex items-center mt-1 text-sm">
                {percentageChange > 0 ? (
                  <>
                    <ArrowUpIcon className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">{Math.abs(percentageChange).toFixed(1)}% from last month</span>
                  </>
                ) : (
                  <>
                    <ArrowDownIcon className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">{Math.abs(percentageChange).toFixed(1)}% from last month</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Top Category Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 mr-4">
            <ChartBarIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Category</p>
            {topCategory.name ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{topCategory.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  PKR {topCategory.amount.toFixed(2)} ({topCategory.percentage.toFixed(1)}%)
                </p>
              </>
            ) : (
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">No data</h3>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Activity Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Activity</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recentActivityCount}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">transactions this week</p>
          </div>
        </div>
      </div>
    </div>
  );
} 