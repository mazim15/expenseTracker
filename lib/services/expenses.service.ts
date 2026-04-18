import {
  getAllExpenses,
  getExpensesForPeriod,
  addExpense as addExpenseRaw,
  updateExpense as updateExpenseRaw,
  deleteExpense as deleteExpenseRaw,
} from "@/lib/expenses";
import { ExpenseType } from "@/types/expense";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validations/expense";

export async function listExpenses(userId: string): Promise<ExpenseType[]> {
  return getAllExpenses(userId);
}

export async function listExpensesForPeriod(
  userId: string,
  month: number,
  year: number,
): Promise<ExpenseType[]> {
  return getExpensesForPeriod(userId, month, year);
}

export type CreateExpensePayload = Omit<ExpenseType, "id" | "createdAt" | "updatedAt">;

export async function createExpense(payload: CreateExpensePayload): Promise<string> {
  const parsed = createExpenseSchema.parse(payload);
  const { userId, ...expense } = parsed;
  return addExpenseRaw(expense as Omit<ExpenseType, "id" | "createdAt" | "updatedAt">, userId);
}

export interface UpdateExpensePayload {
  id: string;
  userId: string;
  patch: Partial<Omit<ExpenseType, "id" | "userId" | "createdAt" | "updatedAt">>;
}

export async function updateExpense({ id, userId, patch }: UpdateExpensePayload): Promise<void> {
  updateExpenseSchema.parse({ id, userId, ...patch });
  await updateExpenseRaw(userId, id, patch);
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  await deleteExpenseRaw(id, userId);
}
