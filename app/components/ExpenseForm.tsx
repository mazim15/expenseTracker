// ExpenseForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ExpenseFormProps {
  user: any;
  expenseToEdit?: any;
  categories: string[];
  onCancelEdit?: () => void;
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function ExpenseForm({ 
  user, 
  expenseToEdit, 
  categories, 
  onCancelEdit, 
  setCategories 
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(expenseToEdit ? expenseToEdit.amount : '');
  const [description, setDescription] = useState(expenseToEdit ? expenseToEdit.description : '');
  const [category, setCategory] = useState(expenseToEdit ? expenseToEdit.category : 'food');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isRecurring, setIsRecurring] = useState(expenseToEdit ? expenseToEdit.isRecurring : false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly' | 'yearly'>(
    expenseToEdit ? expenseToEdit.recurringFrequency : 'monthly'
  );

  const saveCategoriesToDatabase = async (updatedCategories: string[]) => {
    if (user?.uid) {
      const categoriesDocRef = doc(db, 'users', user.uid, 'userCategories', 'categoriesDoc');
      await setDoc(categoriesDocRef, { categories: updatedCategories });
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      if (user?.uid) {
        const categoriesDocRef = doc(db, 'users', user.uid, 'userCategories', 'categoriesDoc');
        const docSnap = await getDoc(categoriesDocRef);
        if (docSnap.exists()) {
          setCategories(docSnap.data().categories || []);
        } else {
          const defaultCategories = [
            'food', 'clothing', 'housing', 'transportation', 
            'utilities', 'insurance', 'medical', 'saving', 'other'
          ];
          setCategories(defaultCategories);
          saveCategoriesToDatabase(defaultCategories);
        }
      }
    };
    fetchCategories();
    
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount);
      setDescription(expenseToEdit.description);
      setCategory(expenseToEdit.category);
      setIsRecurring(expenseToEdit.isRecurring || false);
      setRecurringFrequency(expenseToEdit.recurringFrequency || 'monthly');
    } else {
      setAmount('');
      setDescription('');
      setCategory('food');
      setIsRecurring(false);
      setRecurringFrequency('monthly');
    }
  }, [user?.uid, expenseToEdit, setCategories]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!amount || !description) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const expenseData = {
        amount: parseFloat(amount),
        description,
        category,
        date: serverTimestamp(),
        isRecurring,
        ...(isRecurring && { recurringFrequency }),
      };

      if (expenseToEdit) {
        const expenseDocRef = doc(db, 'users', user.uid, 'expenses', expenseToEdit.id);
        await updateDoc(expenseDocRef, expenseData);
        toast.success('Expense updated successfully!');
        onCancelEdit?.();
      } else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'expenses'), expenseData);
        
        if (isRecurring) {
          await addDoc(collection(db, 'users', user.uid, 'recurringExpenses'), {
            ...expenseData,
            startDate: new Date(),
            lastProcessed: new Date(),
            originalExpenseId: docRef.id
          });
        }
        
        toast.success('Expense added successfully!');
      }

      if (!expenseToEdit) {
        setAmount('');
        setDescription('');
        setIsRecurring(false);
        setRecurringFrequency('monthly');
      }
    } catch (error) {
      toast.error('Error processing expense');
      console.error('Error processing expense:', error);
    }
  };

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      saveCategoriesToDatabase(updatedCategories);
      setNewCategory('');
      setIsAddingCategory(false);
      toast.success('Category added successfully!');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <h2 className="text-2xl font-bold text-white">
          {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (PKR)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you spend on?"
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <div className="flex gap-2">
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
              This is a recurring expense
            </label>
          </div>

          {isRecurring && (
            <select
              value={recurringFrequency}
              onChange={(e) => setRecurringFrequency(e.target.value as 'weekly' | 'monthly' | 'yearly')}
              className="mt-2 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
        </div>

        {isAddingCategory && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Add New Category</h3>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
                className="block flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all"
          >
            {expenseToEdit ? 'Update Expense' : 'Add Expense'}
          </button>
          {expenseToEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full mt-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-4 focus:ring-gray-100 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="border-t border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Manage Categories</h3>
          <span className="text-sm text-gray-500">{categories.length} categories</span>
        </div>
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-700">{cat}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    const newName = prompt("Enter new category name", cat);
                    if (typeof newName === 'string' && newName.trim() !== "") {
                      const updatedCategories = categories.map((c, i) => 
                        i === index ? newName.trim() : c
                      );
                      setCategories(updatedCategories);
                      saveCategoriesToDatabase(updatedCategories);
                      toast.success('Category updated!');
                    }
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const confirmDelete = window.confirm(`Delete "${cat}" category?`);
                    if (confirmDelete) {
                      const updatedCategories = categories.filter((_, i) => i !== index);
                      setCategories(updatedCategories);
                      saveCategoriesToDatabase(updatedCategories);
                      if (category === cat) {
                        setCategory(updatedCategories[0] || 'food');
                      }
                      toast.success('Category deleted!');
                    }
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}