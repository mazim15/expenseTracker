"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  TrashIcon, 
  PencilSquareIcon, 
  ChartBarIcon, 
  CalendarIcon, 
  MagnifyingGlassIcon, 
  DocumentIcon 
} from '@heroicons/react/24/outline';
import { Expense, DateInput } from '../types';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';

interface ExpenseListProps {
  user: User | null;
  categories: string[];
  setExpenseToEdit: (expense: Expense | null) => void;
}

interface FilterButtonProps {
  label: string;
  value: 'all' | 'today' | 'this-month' | 'yearly' | 'custom';
  icon: React.ComponentType<{ className?: string }>;
}

const formatExpenseDate = (date: DateInput): string => {
  if (!date) return 'No date';

  try {
    return date.toDate().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const getDateFromTimestamp = (timestamp: DateInput): Date | null => {
  if (!timestamp) return null;
  try {
    return timestamp.toDate();
  } catch (error) {
    console.error('Error converting timestamp to date:', error);
    return null;
  }
};

export default function ExpenseList({ user, setExpenseToEdit }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'this-month' | 'yearly' | 'custom'>('all');
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          amount: data.amount || 0,
          description: data.description || '',
          category: data.category || 'Uncategorized',
          date: data.date,
          receiptUrl: data.receiptUrl || null,
          receiptFileName: data.receiptFileName || null,
          isRecurring: data.isRecurring || false,
          recurringFrequency: data.recurringFrequency || null,
        });
      });
      setExpenses(expensesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const filterExpenses = () => {
      let filtered = [...expenses];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filter) {
        case 'today': {
          const startOfDay = new Date(today);
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          filtered = expenses.filter(expense => {
            const expenseDate = getDateFromTimestamp(expense.date);
            return expenseDate && expenseDate >= startOfDay && expenseDate <= endOfDay;
          });
          break;
        }
        case 'this-month': {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          filtered = expenses.filter(expense => {
            const expenseDate = getDateFromTimestamp(expense.date);
            return expenseDate && expenseDate >= startOfMonth && expenseDate <= endOfMonth;
          });
          break;
        }
        case 'yearly': {
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          filtered = expenses.filter(expense => {
            const expenseDate = getDateFromTimestamp(expense.date);
            return expenseDate && expenseDate >= startOfYear && expenseDate <= endOfYear;
          });
          break;
        }
        case 'custom': {
          if (startDate && endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            filtered = expenses.filter(expense => {
              const expenseDate = getDateFromTimestamp(expense.date);
              return expenseDate && expenseDate >= startDate && expenseDate <= endDateTime;
            });
          }
          break;
        }
      }
      setFilteredExpenses(filtered);
    };

    filterExpenses();
  }, [expenses, filter, startDate, endDate]);

  const handleReceiptUpload = async (expenseId: string, file: File) => {
    if (!user || !file) return;

    try {
      setUploadingReceipt(expenseId);
      const storageRef = ref(storage, `receipts/${user.uid}/${expenseId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid, 'expenses', expenseId), {
        receiptUrl: downloadUrl,
        receiptFileName: file.name
      });

      toast.success('Receipt uploaded successfully');
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setUploadingReceipt(null);
    }
  };

  const deleteExpense = async (expense: Expense) => {
    if (!user) {
      toast.error('User not logged in');
      return;
    }

    try {
      if (expense.receiptUrl && expense.receiptFileName) {
        const receiptRef = ref(storage, `receipts/${user.uid}/${expense.id}/${expense.receiptFileName}`);
        try {
          await deleteObject(receiptRef);
        } catch (error) {
          console.error('Error deleting receipt:', error);
        }
      }

      await deleteDoc(doc(db, 'users', user.uid, 'expenses', expense.id));
      
      if (expense.isRecurring) {
        const recurringQuery = query(
          collection(db, 'users', user.uid, 'recurringExpenses'),
          where('originalExpenseId', '==', expense.id)
        );
        const snapshot = await getDocs(recurringQuery);
        snapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Error deleting expense');
    }
  };

  const total = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  
  const searchedExpenses = searchTerm
    ? filteredExpenses.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredExpenses;

  const FilterButton = ({ label, value, icon: Icon }: FilterButtonProps) => (
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        filter === value 
          ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
      onClick={() => setFilter(value)}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  const ExpenseListItem = ({ expense }: { expense: Expense }) => (
    <li className="group p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xl font-bold text-gray-800">
              PKR {(expense.amount || 0).toFixed(2)}
            </h4>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="cursor-pointer p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReceiptUpload(expense.id, file);
                  }}
                />
                <DocumentIcon className="h-5 w-5" />
              </label>
              <button
                onClick={() => setExpenseToEdit(expense)}
                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => deleteExpense(expense)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-gray-600">{expense.description || 'No description'}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
              {expense.category || 'Uncategorized'}
            </span>
            {expense.isRecurring && (
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                {expense.recurringFrequency || 'Recurring'} recurring
              </span>
            )}
            <span className="text-gray-400 text-sm">
              {formatExpenseDate(expense.date)}
            </span>
            {expense.receiptUrl && (
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                <DocumentIcon className="h-4 w-4" />
                View Receipt
              </a>
            )}
            {uploadingReceipt === expense.id && (
              <span className="text-gray-500 text-sm">Uploading receipt...</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Expenses Dashboard</h2>
          <div className="text-right">
            <p className="text-xl opacity-90">Total Expenses</p>
            <p className="text-4xl font-bold">PKR {total.toFixed(2)}</p>
          </div>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md rounded-lg text-white placeholder-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="p-6 border-b">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterButton label="All" value="all" icon={ChartBarIcon} />
          <FilterButton label="Today" value="today" icon={CalendarIcon} />
          <FilterButton label="This Month" value="this-month" icon={CalendarIcon} />
          <FilterButton label="Yearly" value="yearly" icon={CalendarIcon} />
          <FilterButton label="Custom" value="custom" icon={CalendarIcon} />
          
          <button
            onClick={() => {
              setFilter('all');
              setStartDate(null);
              setEndDate(null);
            }}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
          >
            Reset
          </button>
        </div>

        {filter === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : searchedExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No expenses found</p>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <ul className="space-y-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {searchedExpenses.map((expense) => (
              <ExpenseListItem key={expense.id} expense={expense} />
            ))}
          </ul>
        )}
      </div>

      {filter === 'custom' && !startDate && !endDate && (
        <div className="text-center py-4 px-6 bg-yellow-50 text-yellow-700">
          <p>Please select both start and end dates to filter expenses</p>
        </div>
      )}

      {searchedExpenses.length > 0 && (
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Showing {searchedExpenses.length} of {expenses.length} expenses
            </span>
            <div className="text-right">
              <p className="text-sm text-gray-600">Filtered Total</p>
              <p className="text-xl font-bold text-gray-900">
                PKR {total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
