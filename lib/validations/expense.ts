import { z } from "zod";

export const expenseSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().positive("Amount must be positive").max(1_000_000, "Amount is too large"),
  category: z.string().min(1, "Category is required"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  date: z.date().max(new Date(), "Date cannot be in the future"),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  location: z.string().max(200).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createExpenseSchema = expenseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateExpenseSchema = expenseSchema.partial().extend({
  id: z.string().min(1, "ID is required"),
});

export const expenseFormSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .max(1_000_000, "Amount is too large"),
  date: z.date().max(new Date(), "Date cannot be in the future"),
  category: z.string().min(1, "Category is required"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  location: z.string().max(200).optional().or(z.literal("")),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
});

export type Expense = z.infer<typeof expenseSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
