import { Timestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

export interface ExpenseListProps {
  user: User;
  setExpenseToEdit: (expense: Expense) => void;
  categories?: string[]; // Make it optional
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: Timestamp;
  description?: string;
  userId?: string;
  tags?: string[];
  location?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  notes?: string;
  receiptUrl?: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export interface BudgetData {
  category: string;
  limit: number;
  spent?: number;
  period?: 'monthly' | 'yearly'; // Make period optional
  notifications?: boolean;
  remaining?: number;
  percentage?: number;
}

export type TabType = 'expenses' | 'analytics' | 'budget' | 'reports' | 'settings';

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  type: 'cash' | 'credit' | 'debit';
}

export interface ExpenseFormProps {
  user: FirebaseUser;
  expenseToEdit?: Expense;
  categories?: string[];
  onCancelEdit?: () => void;
  setCategories: (categories: string[]) => void;
}

export interface ReceiptUploadProps {
  user: FirebaseUser;
  expenseId?: string;
}

export interface Receipt {
  id?: string;
  path: string;
  uploadedAt: Timestamp;
}

export interface SettingsSectionProps {
  user: FirebaseUser;
}

export const formatExpenseDate = (date: Timestamp | Date | { toDate: () => Date }): string => {
  if (date instanceof Date) return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  const d = 'toDate' in date ? date.toDate() : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 