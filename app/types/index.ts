import { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Dispatch, SetStateAction } from 'react';

export type DateInput = Timestamp;

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: DateInput;
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
  onReceiptData?: ParsedReceiptData | null;
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

// Date utility types and functions
export function getDateFromTimestamp(timestamp: DateInput | null): Date | null {
  if (!timestamp) return null;
  
  try {
    return timestamp.toDate();
  } catch (error) {
    console.error('Error converting timestamp to date:', error);
    return null;
  }
}

export function formatExpenseDate(date: DateInput | null): string {
  if (!date) return 'No date';
  
  try {
    return date.toDate().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}