"use client";

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Expense, BudgetData } from '../types';
import toast from 'react-hot-toast';

interface BudgetSectionProps {
  user: User;
  expenses: Expense[];
}

export default function BudgetSection({ user, expenses }: BudgetSectionProps) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch budgets from Firestore
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setIsLoading(true);
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'limits');
        const docSnap = await getDoc(budgetDocRef);
        
        if (docSnap.exists()) {
          setBudgets(docSnap.data() as Record<string, number>);
        }
      } catch (error) {
        console.error('Error fetching budgets:', error);
        toast.error('Failed to load budget data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, [user.uid]);

  // Calculate budget data based on expenses and budget limits
  useEffect(() => {
    const calculateBudgetData = () => {
      const data: BudgetData[] = [];
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Calculate spent amount for each category this month
      const categorySpent: Record<string, number> = {};
      
      expenses.forEach(expense => {
        if (expense.date && expense.date.toDate() >= startOfMonth) {
          categorySpent[expense.category] = (categorySpent[expense.category] || 0) + expense.amount;
        }
      });
      
      // Create budget data for each category with a budget
      Object.entries(budgets).forEach(([category, limit]) => {
        const spent = categorySpent[category] || 0;
        const remaining = Math.max(0, limit - spent);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        
        data.push({
          category,
          limit,
          spent,
          remaining,
          percentage
        });
      });
      
      // Sort by percentage used (descending)
      data.sort((a, b) => b.percentage - a.percentage);
      
      setBudgetData(data);
    };
    
    calculateBudgetData();
  }, [budgets, expenses]);

  // Save a new budget limit
  const handleAddBudget = async () => {
    if (!newCategory || !newLimit || isNaN(parseFloat(newLimit)) || parseFloat(newLimit) <= 0) {
      toast.error('Please enter a valid category and limit');
      return;
    }
    
    try {
      const updatedBudgets = {
        ...budgets,
        [newCategory]: parseFloat(newLimit)
      };
      
      const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'limits');
      await setDoc(budgetDocRef, updatedBudgets);
      
      setBudgets(updatedBudgets);
      setNewCategory('');
      setNewLimit('');
      
      toast.success('Budget limit added successfully');
    } catch (error) {
      console.error('Error adding budget:', error);
      toast.error('Failed to add budget limit');
    }
  };

  // Delete a budget limit
  const handleDeleteBudget = async (category: string) => {
    try {
      const updatedBudgets = { ...budgets };
      delete updatedBudgets[category];
      
      const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'limits');
      await setDoc(budgetDocRef, updatedBudgets);
      
      setBudgets(updatedBudgets);
      toast.success('Budget limit removed');
    } catch (error) {
      console.error('Error removing budget:', error);
      toast.error('Failed to remove budget limit');
    }
  };

  // Get all unique categories from expenses
  const getCategories = () => {
    const categories = new Set<string>();
    
    expenses.forEach(expense => {
      categories.add(expense.category);
    });
    
    return Array.from(categories);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Monthly Budget Limits</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {getCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Limit (PKR)
            </label>
            <input
              type="number"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="5000"
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="100"
            />
          </div>
        </div>
        
        <button
          onClick={handleAddBudget}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Budget Limit
        </button>
      </div>
      
      {budgetData.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Budget Progress</h2>
          
          <div className="space-y-6">
            {budgetData.map((budget) => (
              <div key={budget.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">{budget.category}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PKR {budget.spent.toFixed(2)} of PKR {budget.limit.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBudget(budget.category)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      budget.percentage >= 100 
                        ? 'bg-red-600' 
                        : budget.percentage >= 75 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, budget.percentage)}%` }}
                  ></div>
                </div>
                
                <p className="text-sm text-right">
                  {budget.percentage >= 100 ? (
                    <span className="text-red-600 dark:text-red-400">Over budget!</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      PKR {budget.remaining.toFixed(2)} remaining
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No budget limits set. Add your first budget limit above.</p>
        </div>
      )}
    </div>
  );
} 