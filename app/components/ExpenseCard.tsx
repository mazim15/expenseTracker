"use client";

import React from 'react';
import { Expense, formatExpenseDate } from '../types';
import { PencilIcon, TrashIcon, TagIcon, MapPinIcon, CreditCardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  // Get category color based on category name
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      housing: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      transportation: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      utilities: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      insurance: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
      medical: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      saving: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
      clothing: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
      other: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };
    
    return colors[category.toLowerCase()] || colors.other;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{expense.description}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatExpenseDate(expense.date)}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">PKR {expense.amount.toFixed(2)}</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
              {expense.category}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          {expense.paymentMethod && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <CreditCardIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              <span>{expense.paymentMethod}</span>
            </div>
          )}
          
          {expense.location && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <MapPinIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              <span>{expense.location}</span>
            </div>
          )}
          
          {expense.isRecurring && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <ArrowPathIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              <span>Recurring ({expense.recurringFrequency})</span>
            </div>
          )}
          
          {expense.tags && expense.tags.length > 0 && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <TagIcon className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              <div className="flex flex-wrap gap-1">
                {expense.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 flex justify-end space-x-2">
        <button 
          onClick={() => onEdit(expense)}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button 
          onClick={() => onDelete(expense.id)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 