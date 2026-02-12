import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z
    .string({ error: 'First name is required' })
    .min(2, { error: 'First name must be at least 2 characters' })
    .max(50, { error: 'First name too long' })
    .trim(),

  lastName: z
    .string({ error: 'Last name is required' })
    .min(2, { error: 'Last name must be at least 2 characters' })
    .max(50, { error: 'Last name too long' })
    .trim(),

  email: z
    .string({ error: 'Email is required' })
    .email({ error: 'Invalid email format' })
    .toLowerCase()
    .trim(),

  password: z
    .string({ error: 'Password is required' })
    .min(6, { error: 'Password must be minimum 6 characters' }),

  phone: z
    .string()
    .regex(/^\+?[\d\s-]{10,15}$/, { error: 'Invalid phone number' })
    .optional(),

  avatar: z.string().optional(),

  gender: z
    .enum(['male', 'female', 'other'], {
      error: 'Gender must be male, female or other',
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .email({ error: 'Invalid email format' })
    .toLowerCase()
    .trim(),
  password: z
    .string({ error: 'Password is required' })
    .min(6, { error: 'Password must be minimum 6 characters' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
