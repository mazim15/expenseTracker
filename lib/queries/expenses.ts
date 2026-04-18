import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  listExpensesForPeriod,
  updateExpense,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from "@/lib/services/expenses.service";
import { handleError } from "@/lib/utils/errorHandler";

export const expensesKeys = {
  all: (userId: string) => ["expenses", userId] as const,
  byPeriod: (userId: string, month: number, year: number) =>
    ["expenses", userId, "period", year, month] as const,
};

export function useExpensesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? expensesKeys.all(userId) : ["expenses", "anonymous"],
    queryFn: () => listExpenses(userId!),
    enabled: Boolean(userId),
  });
}

export function useExpensesForPeriodQuery(userId: string | undefined, month: number, year: number) {
  return useQuery({
    queryKey: userId ? expensesKeys.byPeriod(userId, month, year) : ["expenses-period", "anon"],
    queryFn: () => listExpensesForPeriod(userId!, month, year),
    enabled: Boolean(userId),
  });
}

function invalidateExpenses(qc: ReturnType<typeof useQueryClient>, userId: string) {
  qc.invalidateQueries({ queryKey: ["expenses", userId] });
}

export function useCreateExpenseMutation(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => createExpense(payload),
    onSuccess: () => {
      if (userId) invalidateExpenses(qc, userId);
    },
    onError: (err) => handleError(err, "createExpense"),
  });
}

export function useUpdateExpenseMutation(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateExpensePayload) => updateExpense(payload),
    onSuccess: () => {
      if (userId) invalidateExpenses(qc, userId);
    },
    onError: (err) => handleError(err, "updateExpense"),
  });
}

export function useDeleteExpenseMutation(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteExpense(userId!, id),
    onSuccess: () => {
      if (userId) invalidateExpenses(qc, userId);
    },
    onError: (err) => handleError(err, "deleteExpense"),
  });
}
