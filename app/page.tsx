"use client";

import { useAuth } from './context/AuthContext';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import BudgetManager from './components/BudgetManager';
import DashboardSummary from './components/DashboardSummary';
import ReportsSection from './components/ReportsSection';
import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ArrowRightOnRectangleIcon, 
  UserCircleIcon, 
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { exportToCSV, exportToPDF } from './utils/exportUtils';
import Image from 'next/image';
import { Expense } from './types';

export type TabType = 'expenses' | 'analytics' | 'budget' | 'reports' | 'settings';

export default function Page() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

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
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date as Timestamp,
          isRecurring: data.isRecurring,
          recurringFrequency: data.recurringFrequency,
        });
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast.success('Signed in successfully!');
    } catch (err) {
      console.error("Google Sign-in error:", err);
      toast.error('Error signing in');
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out successfully!');
    } catch (err) {
      console.error("Sign-out error:", err);
      toast.error('Error signing out');
    }
  };

  const handleExport = async (type: 'csv' | 'pdf') => {
    try {
      if (type === 'csv') {
        await exportToCSV(expenses);
      } else {
        await exportToPDF(expenses);
      }
      toast.success(`Expenses exported to ${type.toUpperCase()} successfully!`);
    } catch (err) {
      console.error(`Error exporting to ${type.toUpperCase()}:`, err);
      toast.error(`Error exporting to ${type.toUpperCase()}`);
    }
  };

  const renderContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case 'analytics':
        return (
          <>
            <DashboardSummary expenses={expenses} />
            <AnalyticsDashboard expenses={expenses} />
          </>
        );
      case 'budget':
        return (
          <BudgetManager
            user={user}
            categories={categories}
            expenses={expenses}
          />
        );
      case 'reports':
        return <ReportsSection expenses={expenses} />;
      case 'settings':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Dark Mode</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark theme</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  {darkMode ? <SunIcon className="h-6 w-6 text-amber-500" /> : <MoonIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Export Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Download your expense data</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleExport('csv')}
                    className="px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    CSV
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="px-3 py-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
            <div className="space-y-8">
              <ExpenseForm
                user={user}
                categories={categories}
                setCategories={setCategories}
                expenseToEdit={expenseToEdit}
                onCancelEdit={() => setExpenseToEdit(null)}
              />
            </div>
            <div>
              <ExpenseList
                user={user}
                setExpenseToEdit={(expense) => setExpenseToEdit(expense)}
              />
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <svg 
              className="w-10 h-10 mr-3 text-blue-600 dark:text-blue-400" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" 
                fill="currentColor"
              />
            </svg>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ExpenseTracker</h1>
          </div>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>
              <div className="flex items-center">
                <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{user.displayName || user.email}</span>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </header>

      {user && (
        <nav className="bg-white dark:bg-gray-800 shadow-sm mt-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'expenses'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'budget'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Budget
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'reports'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-4 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Settings
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !user ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Welcome to ExpenseTracker</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Sign in to start tracking your expenses</p>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In with Google
            </button>
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}
