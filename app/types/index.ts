import { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Dispatch, SetStateAction } from 'react';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: Timestamp;
  receiptUrl?: string;
  receiptFileName?: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
}

export interface ExpenseListProps {
  user: User;
  categories: string[];
  setExpenseToEdit: Dispatch<SetStateAction<Expense | null>>;
}

export interface FilterButtonProps {
  label: string;
  value: 'all' | 'today' | 'this-month' | 'yearly' | 'custom';
  icon: React.ComponentType<{ className?: string }>;
}

export type TabType = 'expenses' | 'analytics' | 'budget';

export interface ExpenseFormProps {
  user: User;
  expenseToEdit?: Expense | null;
  categories: string[];
  onCancelEdit?: () => void;
  setCategories: Dispatch<SetStateAction<string[]>>;
}

export interface Receipt {
  path: string;
  uploadedAt: Date;
}

export interface ReceiptUploadProps {
  user: User;
  expenseId?: string;
}

export interface PageProps {
  user: User | null;
  loading: boolean;
}