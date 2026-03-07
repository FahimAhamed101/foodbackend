import { z } from 'zod';

export const createFoodSchema = z.object({
    body: z.object({
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID'),
        // Image field removed - only file upload via form-data is supported
        title: z
            .string()
            .trim()
            .min(2, 'Title must be at least 2 characters')
            .max(100, 'Title cannot exceed 100 characters'),
        foodAvailability: z.boolean().optional(),
        calories: z.number().positive('Calories must be a positive number'),
        productDescription: z.string().optional(),
        baseRevenue: z.number().min(0, 'Base revenue cannot be negative'),
        serviceFee: z.number().min(0, 'Service fee cannot be negative'),
        foodStatus: z.boolean().optional(),
    }),
});

export const updateFoodSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Food ID'),
    }),
    body: z.object({
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID').optional(),
        image: z.string().url('Invalid image URL').optional(),
        title: z
            .string()
            .trim()
            .min(2, 'Title must be at least 2 characters')
            .max(100, 'Title cannot exceed 100 characters')
            .optional(),
        foodAvailability: z.boolean().optional(),
        calories: z.number().positive('Calories must be a positive number').optional(),
        productDescription: z.string().optional(),
        baseRevenue: z.number().min(0, 'Base revenue cannot be negative').optional(),
        serviceFee: z.number().min(0, 'Service fee cannot be negative').optional(),
        foodStatus: z.boolean().optional(),
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
        categoryName: z.string().trim().min(2).max(50).optional(),
        status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
        page: z.string().regex(/^\d+$/).optional().default('1'),
        limit: z.string().regex(/^\d+$/).optional().default('10'),
    }),
});
