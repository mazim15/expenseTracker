import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Category name is required').max(50, 'Category name must be less than 50 characters'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
  icon: z.string().min(1, 'Icon is required'),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createCategorySchema = categorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().min(1, 'ID is required'),
});

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;