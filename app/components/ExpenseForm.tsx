"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon, MapPinIcon, TagIcon, CreditCardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ExpenseFormProps, PaymentMethod } from '../types';
import { Timestamp } from 'firebase/firestore';

export default function ExpenseForm({ 
  user, 
  expenseToEdit, 
  categories = [],
  onCancelEdit, 
  setCategories 
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(expenseToEdit ? expenseToEdit.amount.toString() : '');
  const [description, setDescription] = useState(expenseToEdit ? expenseToEdit.description : '');
  const [category, setCategory] = useState(expenseToEdit ? expenseToEdit.category : 'food');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // New fields
  const [tags, setTags] = useState<string[]>(expenseToEdit?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [location, setLocation] = useState(expenseToEdit?.location || '');
  const [paymentMethod, setPaymentMethod] = useState(expenseToEdit?.paymentMethod || '');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isRecurring, setIsRecurring] = useState(expenseToEdit?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly' | 'yearly' | undefined>(
    expenseToEdit?.recurringFrequency || undefined
  );
  const [expenseDate, setExpenseDate] = useState<string>(
    expenseToEdit?.date 
      ? new Date(expenseToEdit.date.toDate()).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  const saveCategoriesToDatabase = useCallback(async (updatedCategories: string[]) => {
    if (user?.uid) {
      const categoriesDocRef = doc(db, 'users', user.uid, 'userCategories', 'categoriesDoc');
      await setDoc(categoriesDocRef, { categories: updatedCategories });
    }
  }, [user?.uid]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.uid || !setCategories) return;
      
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
          await saveCategoriesToDatabase(defaultCategories);
      }
    };

    const fetchPaymentMethods = async () => {
      if (user?.uid) {
        const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists() && docSnap.data().paymentMethods) {
          setPaymentMethods(docSnap.data().paymentMethods);
        } else {
          // Default payment methods if none exist
          const defaultMethods: PaymentMethod[] = [
            { id: '1', name: 'Cash', type: 'cash' },
            { id: '2', name: 'Credit Card', type: 'credit' },
            { id: '3', name: 'Debit Card', type: 'debit' },
          ];
          setPaymentMethods(defaultMethods);
        }
      }
    };

    void fetchCategories();
    void fetchPaymentMethods();
    
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount.toString());
      setDescription(expenseToEdit.description);
      setCategory(expenseToEdit.category);
      setTags(expenseToEdit.tags || []);
      setLocation(expenseToEdit.location || '');
      setPaymentMethod(expenseToEdit.paymentMethod || '');
      setIsRecurring(expenseToEdit.isRecurring || false);
      setRecurringFrequency(expenseToEdit.recurringFrequency);
      
      if (expenseToEdit.date) {
        setExpenseDate(new Date(expenseToEdit.date.toDate()).toISOString().split('T')[0]);
      }
    } else {
      setAmount('');
      setDescription('');
      setCategory('food');
      setTags([]);
      setLocation('');
      setPaymentMethod('');
      setIsRecurring(false);
      setRecurringFrequency(undefined);
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
  }, [user?.uid, expenseToEdit, setCategories, saveCategoriesToDatabase]);

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
        date: Timestamp.fromDate(new Date(expenseDate)),
        tags,
        location,
        paymentMethod,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : null,
        updatedAt: serverTimestamp(),
      };

      if (expenseToEdit?.id) {
        const expenseDocRef = doc(db, 'users', user.uid, 'expenses', expenseToEdit.id);
        await updateDoc(expenseDocRef, expenseData);
        toast.success('Expense updated successfully!');
        onCancelEdit?.();
      } else {
        await addDoc(collection(db, 'users', user.uid, 'expenses'), {
          ...expenseData,
          createdAt: serverTimestamp(),
        });
        toast.success('Expense added successfully!');
      }

      if (!expenseToEdit) {
        setAmount('');
        setDescription('');
        setTags([]);
        setLocation('');
        setPaymentMethod('');
        setIsRecurring(false);
        setRecurringFrequency(undefined);
      }
    } catch (err) {
      console.error('Error processing expense:', err);
      toast.error('Error processing expense');
    }
  };

  const handleAddCategory = async () => {
    if (newCategory && !categories.includes(newCategory)) {
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      await saveCategoriesToDatabase(updatedCategories);
      setNewCategory('');
      setIsAddingCategory(false);
      toast.success('Category added successfully!');
    }
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <h2 className="text-2xl font-bold text-white">
          {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount (PKR)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you spend on?"
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <div className="flex gap-2">
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="px-4 py-3 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {isAddingCategory && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Add New Category</h3>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
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
                className="block flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <MapPinIcon className="w-5 h-5 text-gray-500" />
            <span>Location (Optional)</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where did you make this purchase?"
            className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <CreditCardIcon className="w-5 h-5 text-gray-500" />
            <span>Payment Method</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Select payment method</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.name}>{method.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <TagIcon className="w-5 h-5 text-gray-500" />
            <span>Tags</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span 
                key={tag} 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >
                {tag}
                <button 
                  type="button" 
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              className="block flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="recurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="recurring" className="ml-2 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <ArrowPathIcon className="w-5 h-5 mr-1 text-gray-500" />
              Recurring Expense
            </label>
          </div>
          
          {isRecurring && (
            <div className="pl-6 space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Frequency
              </label>
              <div className="flex space-x-4">
                {(['weekly', 'monthly', 'yearly'] as const).map((freq) => (
                  <label key={freq} className="inline-flex items-center">
                    <input
                      type="radio"
                      value={freq}
                      checked={recurringFrequency === freq}
                      onChange={() => setRecurringFrequency(freq)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {freq}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

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
              className="w-full mt-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="border-t border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Manage Categories</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{categories.length} categories</span>
        </div>
        <div className="space-y-2">
          {categories.map((cat: string, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-700 dark:text-gray-200">{cat}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={async () => {
                    const newName = prompt("Enter new category name", cat);
                    if (typeof newName === 'string' && newName.trim() !== "") {
                      const updatedCategories = categories.map((c: string, i: number) => 
                        i === index ? newName.trim() : c
                      );
                      setCategories(updatedCategories);
                      await saveCategoriesToDatabase(updatedCategories);
                      toast.success('Category updated!');
                    }
                  }}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmDelete = window.confirm(`Delete "${cat}" category?`);
                    if (confirmDelete) {
                      const updatedCategories = categories.filter((_: string, i: number) => i !== index);
                      setCategories(updatedCategories);
                      await saveCategoriesToDatabase(updatedCategories);
                      if (category === cat) {
                        setCategory(updatedCategories[0] || 'food');
                      }
                      toast.success('Category deleted!');
                    }
                  }}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
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