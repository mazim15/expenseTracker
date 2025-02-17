import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ArrowPathIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface RecurringExpensesProps {
  user: any;
  categories: string[];
}

export default function RecurringExpenses({ user, categories }: RecurringExpensesProps) {
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: '',
    description: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user) return;
    loadRecurringExpenses();
  }, [user]);

  const loadRecurringExpenses = async () => {
    const q = query(collection(db, 'users', user.uid, 'recurringExpenses'));
    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate()
    }));
    setRecurringExpenses(expenses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users', user.uid, 'recurringExpenses'), {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        startDate: new Date(newExpense.startDate),
        lastProcessed: new Date()
      });
      toast.success('Recurring expense added successfully!');
      setShowForm(false);
      setNewExpense({
        amount: '',
        category: '',
        description: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0]
      });
      loadRecurringExpenses();
    } catch (error) {
      toast.error('Error adding recurring expense');
    }
  };

  const deleteRecurringExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'recurringExpenses', id));
      toast.success('Recurring expense deleted');
      loadRecurringExpenses();
    } catch (error) {
      toast.error('Error deleting recurring expense');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Recurring Expenses</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Recurring
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <select
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Description"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={newExpense.frequency}
                onChange={e => setNewExpense({...newExpense, frequency: e.target.value as any})}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input
                type="date"
                value={newExpense.startDate}
                onChange={e => setNewExpense({...newExpense, startDate: e.target.value})}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all"
            >
              Save Recurring Expense
            </button>
          </form>
        )}
        
        <div className="space-y-4">
          {recurringExpenses.map(expense => (
            <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div>
                <div className="font-medium">{expense.description}</div>
                <div className="text-sm text-gray-500">
                  PKR {expense.amount.toFixed(2)} • {expense.category} • {expense.frequency}
                </div>
              </div>
              <button
                onClick={() => deleteRecurringExpense(expense.id)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
