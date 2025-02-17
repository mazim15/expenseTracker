"use client";

import { useAuth } from './context/AuthContext';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import BudgetManager from './components/BudgetManager';
import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ArrowRightOnRectangleIcon, 
  UserCircleIcon, 
  DocumentArrowDownIcon 
} from '@heroicons/react/24/outline';
import { exportToCSV, exportToPDF } from './utils/exportUtils';

export default function Page() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [expenseToEdit, setExpenseToEdit] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics' | 'budget' | 'recurring'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: any[] = [];
      querySnapshot.forEach((doc) => {
        expensesData.push({ id: doc.id, ...doc.data() });
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast.success('Signed in successfully!');
    } catch (error) {
      console.error("Google Sign-in error:", error);
      toast.error('Error signing in');
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out successfully!');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const handleExport = async (type: 'csv' | 'pdf') => {
    try {
      if (type === 'csv') {
        exportToCSV(expenses);
      } else {
        await exportToPDF(expenses);
      }
      toast.success(`Expenses exported to ${type.toUpperCase()} successfully!`);
    } catch (error) {
      toast.error(`Error exporting to ${type.toUpperCase()}`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsDashboard expenses={expenses} />;
      case 'budget':
        return (
          <BudgetManager
            user={user}
            categories={categories}
            expenses={expenses}
          />
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
                categories={categories}
                setExpenseToEdit={setExpenseToEdit}
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Expense Tracker</h1>
            </div>

            {user && (
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'expenses' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'analytics' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('budget')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'budget' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Budget
                </button>
                <button
                  onClick={() => setActiveTab('recurring')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'recurring' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Recurring
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Export to CSV"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Export to PDF"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = document.getElementById('fallback-avatar');
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  )}
                  <span className="ml-2 text-sm font-medium text-gray-700">{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#FFFFFF"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          renderContent()
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg mx-auto">
              <ChartBarIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Expense Tracker</h2>
              <p className="text-gray-600 mb-8">
                Sign in with your Google account to start tracking your expenses, manage categories,
                set budgets, and gain insights into your spending habits.
              </p>
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center px-8 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
                  {/* Google icon paths */}
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
