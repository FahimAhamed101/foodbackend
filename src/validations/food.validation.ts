import { z } from 'zod';

const booleanFromForm = z.preprocess((value) => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return value;
}, z.boolean());

export const createFoodSchema = z.object({
    body: z.object({
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID'),
        title: z
            .string()
            .trim()
            .min(2, 'Title must be at least 2 characters')
            .max(100, 'Title cannot exceed 100 characters'),
        foodAvailability: booleanFromForm.optional(),
        calories: z.coerce.number().min(0, 'Calories cannot be negative'),
        productDescription: z.string().optional(),
        baseRevenue: z.coerce.number().min(0, 'Base revenue cannot be negative'),
        serviceFee: z.coerce.number().min(0, 'Service fee cannot be negative'),
        foodStatus: booleanFromForm.optional(),
    }),
});

export const updateFoodSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Food ID'),
    }),
    body: z.object({
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').optional(),
        title: z
            .string()
            .trim()
            .min(2, 'Title must be at least 2 characters')
            .max(100, 'Title cannot exceed 100 characters')
            .optional(),
        foodAvailability: booleanFromForm.optional(),
        calories: z.coerce.number().min(0, 'Calories cannot be negative').optional(),
        productDescription: z.string().optional(),
        baseRevenue: z.coerce.number().min(0, 'Base revenue cannot be negative').optional(),
        serviceFee: z.coerce.number().min(0, 'Service fee cannot be negative').optional(),
        foodStatus: booleanFromForm.optional(),
    }),
});

export const foodIdSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Food ID'),
    }),
});

export const foodByCategorySchema = z.object({
    params: z.object({
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID'),
    }),
});

export const getFoodsQuerySchema = z.object({
    query: z.object({
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').optional(),
        categoryName: z.string().trim().min(2).max(50).optional(),
        status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
        page: z.string().regex(/^\d+$/).optional().default('1'),
        limit: z.string().regex(/^\d+$/).optional().default('10'),
    }),
});
