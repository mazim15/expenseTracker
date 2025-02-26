"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CalendarIcon, 
  ClockIcon, 
  HashtagIcon, 
  PencilIcon, 
  TrashIcon,
  MapPinIcon,
  TagIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { ExpenseListProps } from '../types';
import toast from 'react-hot-toast';

// Add this utility function to format dates
const formatExpenseDate = (timestamp: any): string => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Define the Expense type locally if it's not exported from '../types'
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: {
    toDate: () => Date;
  };
  category: string;
  tags?: string[];
  location?: string;
  paymentMethod?: string;
}

export default function ExpenseList({ user, setExpenseToEdit }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'this-month' | 'this-year' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        expensesData.push({
          id: doc.id,
          ...doc.data()
        } as Expense);
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
        toast.success('Expense deleted successfully');
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  };

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchLower) ||
          expense.category.toLowerCase().includes(searchLower) ||
          expense.amount.toString().includes(searchLower) ||
          (expense.tags && expense.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))) ||
          (expense.location && expense.location.toLowerCase().includes(searchLower)) ||
          (expense.paymentMethod && expense.paymentMethod.toLowerCase().includes(searchLower))
      );
    }

    // Apply date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (activeFilter) {
      case 'today':
        result = result.filter((expense) => {
          const expenseDate = expense.date.toDate();
          return expenseDate >= today;
        });
        break;
      case 'this-month':
        result = result.filter((expense) => {
          const expenseDate = expense.date.toDate();
          return expenseDate >= startOfMonth;
        });
        break;
      case 'this-year':
        result = result.filter((expense) => {
          const expenseDate = expense.date.toDate();
          return expenseDate >= startOfYear;
        });
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          const startDate = new Date(customDateStart);
          const endDate = new Date(customDateEnd);
          endDate.setHours(23, 59, 59, 999); // End of the day
          
          result = result.filter((expense) => {
            const expenseDate = expense.date.toDate();
            return expenseDate >= startDate && expenseDate <= endDate;
          });
        }
        break;
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.date.toDate().getTime();
        const dateB = b.date.toDate().getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });

    return result;
  }, [expenses, searchTerm, activeFilter, customDateStart, customDateEnd, sortBy, sortOrder]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Your Expenses</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-r-lg border-y border-r border-gray-300 dark:border-gray-600"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <HashtagIcon className="w-4 h-4 mr-2" />
            All
          </button>
          
          <button
            onClick={() => setActiveFilter('today')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeFilter === 'today'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <ClockIcon className="w-4 h-4 mr-2" />
            Today
          </button>
          
          <button
            onClick={() => setActiveFilter('this-month')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeFilter === 'this-month'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            This Month
          </button>
          
          <button
            onClick={() => setActiveFilter('this-year')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeFilter === 'this-year'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            This Year
          </button>
          
          <button
            onClick={() => setActiveFilter('custom')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeFilter === 'custom'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Custom
          </button>
        </div>

        {activeFilter === 'custom' && (
          <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'} found
          </p>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">PKR {totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredExpenses.map((expense) => (
              <div 
                key={expense.id} 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{expense.description}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatExpenseDate(expense.date)}
                    </p>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {expense.category}
                      </span>
                      
                      {expense.paymentMethod && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          <CreditCardIcon className="w-3 h-3 mr-1" />
                          {expense.paymentMethod}
                        </span>
                      )}
                      
                      {expense.location && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          <MapPinIcon className="w-3 h-3 mr-1" />
                          {expense.location}
                        </span>
                      )}
                      
                      {expense.tags && expense.tags.map((tag: string) => (
                        <span 
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        >
                          <TagIcon className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
      </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      PKR {expense.amount.toFixed(2)}
                    </p>
                    
                    <div className="mt-2 flex space-x-2 justify-end">
                      <button
                        onClick={() => {
                          const expenseWithTimestamp = {
                            ...expense,
                            date: expense.date instanceof Timestamp ? expense.date : Timestamp.fromDate(expense.date.toDate())
                          };
                          setExpenseToEdit(expenseWithTimestamp);
                        }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No expenses found. Try adjusting your filters or add a new expense.</p>
          </div>
        )}
      </div>
    </div>
  );
}
