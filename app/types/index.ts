import { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Dispatch, SetStateAction } from 'react';

export type TabType = 'expenses' | 'analytics' | 'budget' | 'reports' | 'settings';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: any; // Using 'any' for timestamp compatibility
  userId: string;
  tags?: string[];
  location?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  notes?: string;
  receiptUrl?: string;
}

export type DateInput = Timestamp | null;

export interface ExpenseListProps {
  user: User | null;
  setExpenseToEdit: (expense: Expense | null) => void;
}

export interface FilterButtonProps {
  label: string;
  value: 'all' | 'today' | 'this-month' | 'this-year' | 'custom';
  icon: React.ComponentType<{ className?: string }>;
}

export interface ExpenseFormProps {
  user: {
    uid: string;
  };
  expenseToEdit?: Expense | null;
  categories: string[];
  onCancelEdit?: () => void;
  setCategories: (categories: string[]) => void;
}

export interface Receipt {
  path: string;
  uploadedAt: Date;
}

export interface ReceiptUploadProps {
  user: User;
  expenseId?: string;
  onReceiptDataParsed?: (data: ParsedReceiptData) => void;
}

export interface ParsedReceiptData {
  items?: Array<{ name: string; price: number }>;
  totalAmount?: number;
  date?: string;
  category?: string;
}

export interface PageProps {
  user: User | null;
  loading: boolean;
}

export interface BudgetData {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export const formatExpenseDate = (date: DateInput): string => {
  if (!date) return 'No date';

  try {
    const d = date.toDate();
    return `${d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export const getDateFromTimestamp = (timestamp: DateInput): Date | null => {
  if (!timestamp) return null;
  try {
    return timestamp.toDate();
  } catch (error) {
    console.error('Error converting timestamp to date:', error);
    return null;
  }
};

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'credit' | 'debit' | 'online' | 'other';
}