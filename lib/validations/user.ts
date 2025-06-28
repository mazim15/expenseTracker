import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  avatar: z.string().url().optional().or(z.literal('')),
  preferences: z.object({
    currency: z.string().length(3, 'Currency must be a 3-letter code').default('USD'),
    timezone: z.string().default('UTC'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(false),
    }).default({ email: true, push: false }),
  }).default({
    currency: 'USD',
    timezone: 'UTC',
    theme: 'system',
    notifications: { email: true, push: false },
  }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const updateUserSchema = userSchema.partial().extend({
  id: z.string().min(1, 'User ID is required'),
});

export const userPreferencesSchema = z.object({
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  timezone: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }),
});

export type User = z.infer<typeof userSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;