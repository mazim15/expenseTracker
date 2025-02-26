"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Expense, BudgetData } from '../types';

interface NotificationsProps {
  expenses: Expense[];
  budgetData?: BudgetData[];
}

export default function Notifications({ expenses, budgetData = [] }: NotificationsProps) {
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'success' | 'error' }[]>([]);

  useEffect(() => {
    const newNotifications: { id: string; message: string; type: 'info' | 'warning' | 'success' | 'error' }[] = [];
    
    // Check for budget warnings
    budgetData.forEach(budget => {
      if (budget.percentage !== undefined) {
        if (budget.percentage >= 90 && budget.percentage < 100) {
          newNotifications.push({
            id: `budget-warning-${budget.category}`,
            message: `You've used ${budget.percentage.toFixed(0)}% of your ${budget.category} budget.`,
            type: 'warning' as const
          });
        } else if (budget.percentage >= 100) {
          newNotifications.push({
            id: `budget-exceeded-${budget.category}`,
            message: `You've exceeded your ${budget.category} budget by PKR ${(budget.spent! - budget.limit).toFixed(2)}.`,
            type: 'error' as const
          });
        }
      }
    });
    
    // Check for high spending in a single day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayExpenses = expenses.filter(expense => {
      const expenseDate = expense.date.toDate();
      expenseDate.setHours(0, 0, 0, 0);
      return expenseDate.getTime() === today.getTime();
    });
    
    const todayTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    if (todayTotal > 5000) {
      newNotifications.push({
        id: 'high-spending-today',
        message: `You've spent PKR ${todayTotal.toFixed(2)} today, which is higher than usual.`,
        type: 'warning'
      });
    }
    
    setNotifications(newNotifications);
  }, [expenses, budgetData]);

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg flex items-start justify-between ${
            notification.type === 'error' 
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
              : notification.type === 'warning'
                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                : notification.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          } animate-in slide-in-from-right`}
        >
          <p className="pr-6">{notification.message}</p>
          <button 
            onClick={() => dismissNotification(notification.id)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
} 