import { useState, useCallback, useEffect } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '@/lib/expenses';
import { ExpenseType } from '@/types/expense';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export interface UseExpensesReturn {
  expenses: ExpenseType[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  loadExpenses: () => Promise<void>;
  loadMoreExpenses: () => Promise<void>;
  addNewExpense: (expense: Omit<ExpenseType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExistingExpense: (expenseId: string, expenseData: Partial<ExpenseType>) => Promise<void>;
  removeExpense: (expenseId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EXPENSES_PER_PAGE = 30;

export function useExpenses(userId: string): UseExpensesReturn {
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await getExpenses(userId, EXPENSES_PER_PAGE);
      setExpenses(result.expenses);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMoreExpenses = useCallback(async () => {
    if (!userId || !hasMore || !lastVisible || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await getExpenses(userId, EXPENSES_PER_PAGE, lastVisible);
      setExpenses(prev => [...prev, ...result.expenses]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more expenses');
    } finally {
      setLoading(false);
    }
  }, [userId, hasMore, lastVisible, loading]);

  const addNewExpense = useCallback(async (expense: Omit<ExpenseType, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return;
    
    try {
      setError(null);
      await addExpense(expense, userId);
      // Refresh the list to show the new expense
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
      throw err;
    }
  }, [userId, loadExpenses]);

  const updateExistingExpense = useCallback(async (expenseId: string, expenseData: Partial<ExpenseType>) => {
    if (!userId) return;
    
    try {
      setError(null);
      await updateExpense(userId, expenseId, expenseData);
      
      // Update the expense in the local state
      setExpenses(prev => prev.map(expense => 
        expense.id === expenseId 
          ? { ...expense, ...expenseData, updatedAt: new Date() }
          : expense
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
      throw err;
    }
  }, [userId]);

  const removeExpense = useCallback(async (expenseId: string) => {
    if (!userId) return;
    
    try {
      setError(null);
      await deleteExpense(expenseId, userId);
      
      // Remove the expense from local state
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      throw err;
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    setExpenses([]);
    setLastVisible(null);
    setHasMore(true);
    await loadExpenses();
  }, [loadExpenses]);

  // Load initial expenses when userId changes
  useEffect(() => {
    if (userId) {
      loadExpenses();
    }
  }, [userId, loadExpenses]);

  return {
    expenses,
    loading,
    error,
    hasMore,
    lastVisible,
    loadExpenses,
    loadMoreExpenses,
    addNewExpense,
    updateExistingExpense,
    removeExpense,
    refresh
  };
}