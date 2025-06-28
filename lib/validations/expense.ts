import { z } from 'zod';

export const expenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount is too large'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  date: z.date().max(new Date(), 'Date cannot be in the future'),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createExpenseSchema = expenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateExpenseSchema = expenseSchema.partial().extend({
  id: z.string().min(1, 'ID is required'),
});

export type Expense = z.infer<typeof expenseSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;