import { getStoredCategories } from "@/lib/utils/categoryStorage";

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value'];

export interface ExpenseType {
  id: string;
  userId: string;
  amount: number;
  date: Date;
  category: ExpenseCategory;
  description: string;
  tags?: string[];
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseCategoryType = {
  value: string;
  label: string;
};

// Default categories that will be used if no stored categories exist
const DEFAULT_CATEGORIES: ExpenseCategoryType[] = [
  { value: "food", label: "Food" },
  { value: "housing", label: "Housing" },
  { value: "transportation", label: "Transportation" },
  { value: "utilities", label: "Utilities" },
  { value: "entertainment", label: "Entertainment" },
  { value: "healthcare", label: "Healthcare" },
  { value: "shopping", label: "Shopping" },
  { value: "education", label: "Education" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" }
];

// Initialize categories from storage or defaults
export let EXPENSE_CATEGORIES: ExpenseCategoryType[] = 
  typeof window !== "undefined" 
    ? getStoredCategories() || DEFAULT_CATEGORIES 
    : DEFAULT_CATEGORIES;

export function updateExpenseCategories(newCategories: ExpenseCategoryType[]) {
  EXPENSE_CATEGORIES = newCategories;
  // Store the updated categories
  if (typeof window !== "undefined") {
    localStorage.setItem("expense-categories", JSON.stringify(newCategories));
  }
} 