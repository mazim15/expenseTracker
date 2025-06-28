import { ExpenseType, ExpenseCategory } from '@/types/expense';

// Type guard for ExpenseType
export function isExpenseType(obj: unknown): obj is ExpenseType {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const expense = obj as Record<string, unknown>;

  return (
    typeof expense.id === 'string' &&
    typeof expense.userId === 'string' &&
    typeof expense.amount === 'number' &&
    expense.date instanceof Date &&
    typeof expense.category === 'string' &&
    typeof expense.description === 'string' &&
    expense.createdAt instanceof Date &&
    expense.updatedAt instanceof Date &&
    (expense.tags === undefined || Array.isArray(expense.tags)) &&
    (expense.location === undefined || typeof expense.location === 'string')
  );
}

// Type guard for ExpenseCategory
export function isExpenseCategory(value: string): value is ExpenseCategory {
  const validCategories = [
    'food', 'housing', 'transportation', 'utilities', 'entertainment',
    'healthcare', 'shopping', 'education', 'personal', 'other'
  ];
  return validCategories.includes(value);
}

// Safe expense transformer for Firebase data
export function transformFirebaseExpense(doc: { id: string; data: () => Record<string, unknown> }, userId: string): ExpenseType | null {
  try {
    const data = doc.data();
    
    if (!data) return null;

    const expense: ExpenseType = {
      id: doc.id,
      userId: userId,
      amount: typeof data.amount === 'number' ? data.amount : 0,
      date: (data.date && typeof data.date === 'object' && 'toDate' in data.date && typeof data.date.toDate === 'function') ? data.date.toDate() : new Date(),
      category: (typeof data.category === 'string' && isExpenseCategory(data.category)) ? data.category : 'other',
      description: typeof data.description === 'string' ? data.description : '',
      tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown) => typeof tag === 'string') : [],
      location: typeof data.location === 'string' ? data.location : '',
      createdAt: (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate() : new Date(),
      updatedAt: (data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt && typeof data.updatedAt.toDate === 'function') ? data.updatedAt.toDate() : new Date()
    };

    return isExpenseType(expense) ? expense : null;
  } catch (error) {
    console.error('Error transforming Firebase expense:', error);
    return null;
  }
}

// Type guard for partial expense data used in updates
export function isPartialExpenseData(obj: unknown): obj is Partial<ExpenseType> {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const partial = obj as Record<string, unknown>;

  // Check each property if it exists
  if (partial.amount !== undefined && typeof partial.amount !== 'number') return false;
  if (partial.date !== undefined && !(partial.date instanceof Date)) return false;
  if (partial.category !== undefined && (typeof partial.category !== 'string' || !isExpenseCategory(partial.category))) return false;
  if (partial.description !== undefined && typeof partial.description !== 'string') return false;
  if (partial.tags !== undefined && !Array.isArray(partial.tags)) return false;
  if (partial.location !== undefined && typeof partial.location !== 'string') return false;

  return true;
}