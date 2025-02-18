"use client";

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrashIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

interface Budget {
  category: string;
  amount: number;
}

interface Expense {
  category: string;
  amount: number;
  date: Timestamp;
}

interface BudgetManagerProps {
  user: User;
  categories: string[];
  expenses: Expense[];
}

export default function BudgetManager({ user, categories, expenses }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newAmount, setNewAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    const fetchBudgets = async () => {
      if (user?.uid) {
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'limits');
        const docSnap = await getDoc(budgetDocRef);
        if (docSnap.exists()) {
          setBudgets(docSnap.data().budgets || []);
        }
      }
    };
    fetchBudgets();
  }, [user?.uid]);

  const saveBudgets = async (updatedBudgets: Budget[]) => {
    if (user?.uid) {
      const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'limits');
      await setDoc(budgetDocRef, { budgets: updatedBudgets });
      setBudgets(updatedBudgets);
    }
  };

  const handleAddBudget = async () => {
    if (!selectedCategory || !newAmount) {
      toast.error('Please select a category and enter an amount');
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const existingBudgetIndex = budgets.findIndex(b => b.category === selectedCategory);
    let updatedBudgets: Budget[];

    if (existingBudgetIndex >= 0) {
      updatedBudgets = budgets.map((budget, index) =>
        index === existingBudgetIndex ? { ...budget, amount } : budget
      );
    } else {
      updatedBudgets = [...budgets, { category: selectedCategory, amount }];
    }

    await saveBudgets(updatedBudgets);
    setNewAmount('');
    setSelectedCategory('');
    toast.success('Budget updated successfully!');
  };

  const handleDeleteBudget = async (categoryToDelete: string) => {
    const updatedBudgets = budgets.filter(budget => budget.category !== categoryToDelete);
    await saveBudgets(updatedBudgets);
    toast.success('Budget deleted successfully!');
  };

  const calculateSpentAmount = (category: string): number => {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    return expenses
      .filter(expense => {
        const expenseDate = expense.date.toDate();
        return expense.category === category && 
               expenseDate >= firstDayOfMonth && 
               expenseDate <= currentDate;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Enter budget amount"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={handleAddBudget}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Set Budget
            </button>
          </div>

          <div className="space-y-4">
            {budgets.map((budget) => {
              const spent = calculateSpentAmount(budget.category);
              const percentage = (spent / budget.amount) * 100;
              const remaining = budget.amount - spent;
              
              return (
                <div key={budget.category} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-medium">{budget.category}</span>
                      <div className="text-sm text-gray-600">
                        Spent: {spent.toFixed(2)} / {budget.amount.toFixed(2)} PKR
                      </div>
                      <div className="text-sm text-gray-600">
                        Remaining: {remaining.toFixed(2)} PKR
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBudget(budget.category)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        percentage > 100 ? 'bg-red-600' :
                        percentage > 80 ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}