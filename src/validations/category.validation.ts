import { z } from 'zod';

const booleanFromForm = z.preprocess((value) => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return value;
}, z.boolean());

export const createCategorySchema = z.object({
    body: z.object({
        categoryName: z
            .string()
            .trim()
            .min(2, 'Category name must be at least 2 characters')
            .max(50, 'Category name cannot exceed 50 characters'),
        image: z.string().optional(),
        categoryStatus: booleanFromForm.optional(),
    }),
});

export const updateCategorySchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID'),
    }),
    body: z.object({
        categoryName: z
            .string()
            .trim()
            .min(2, 'Category name must be at least 2 characters')
            .max(50, 'Category name cannot exceed 50 characters')
            .optional(),
        categoryStatus: booleanFromForm.optional(),
        image: z.string().optional(),
    }),
});

export const categoryIdSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID'),
    }),
});
