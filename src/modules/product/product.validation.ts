import { z } from 'zod';

export const ProductVariantSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  color: z.string().trim().optional(),
  metalType: z.string().trim().optional(),
  stoneType: z.string().trim().optional(),
  size: z.string().trim().optional(),
  price: z.number().positive('Variant price must be positive'),
  compareAtPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  isAvailable: z.boolean().default(true),
  weight: z.number().positive().optional(),
});

export const CreateProductSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase and hyphen separated'
    ),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string().trim()).default([]),
  sortOrder: z.number().int().min(0).default(0),
  categories: z
    .array(z.string().min(1))
    .min(1, 'At least one category is required'),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  variants: z.array(ProductVariantSchema).default([]),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  category: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductQueryType = z.infer<typeof productQuerySchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type ProductVariantInput = z.infer<typeof ProductVariantSchema>;
