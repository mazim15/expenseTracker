"use client";

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense, TabType, BudgetData } from '../types';
import Navbar from './Navbar';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import AnalyticsSection from './AnalyticsSection';
import BudgetSection from './BudgetSection';
import ReportsSection from './ReportsSection';
import SettingsSection from './SettingsSection';
import DashboardSummary from './DashboardSummary';
import Notifications from './Notifications';
import Footer from './Footer';
import toast from 'react-hot-toast';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<string[]>(['Food', 'Housing', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Other']);
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        expensesData.push({
          id: doc.id,
          ...doc.data()
        } as Expense);
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

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'expenses':
        return (
          <div className="space-y-6">
            <DashboardSummary expenses={expenses} />
            <ExpenseForm 
              user={user} 
              expenseToEdit={expenseToEdit} 
              categories={categories} 
              onCancelEdit={() => setExpenseToEdit(null)} 
              setCategories={setCategories}
            />
            <ExpenseList 
              user={user} 
              setExpenseToEdit={setExpenseToEdit} 
            />
          </div>
        );
      case 'analytics':
        return <AnalyticsSection expenses={expenses} />;
      case 'budget':
        return <BudgetSection user={user} expenses={expenses} />;
      case 'reports':
        return <ReportsSection expenses={expenses} />;
      case 'settings':
        return <SettingsSection user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {renderActiveTab()}
      </main>
      
      <Notifications expenses={expenses} budgetData={budgetData} />
      <Footer />
    </div>
  );
} 