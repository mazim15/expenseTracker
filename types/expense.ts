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

// Export default categories for components to use
export const EXPENSE_CATEGORIES: ExpenseCategoryType[] = DEFAULT_CATEGORIES;

// Legacy function for backward compatibility - now just returns defaults
export function updateExpenseCategories(newCategories: ExpenseCategoryType[]) {
  // This function is deprecated - use database-based category management instead
  console.warn("updateExpenseCategories is deprecated. Use saveUserCategories from @/lib/categories instead");
} 