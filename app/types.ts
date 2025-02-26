export interface ExpenseListProps {
  user: User;
  setExpenseToEdit: (expense: Expense) => void;
  categories?: string[]; // Make it optional
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: any; // or Date | firebase.Timestamp depending on your Firebase setup
  description?: string;
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
  period: 'monthly' | 'yearly';
  notifications?: boolean;
  remaining?: number;
  percentage?: number;
} 