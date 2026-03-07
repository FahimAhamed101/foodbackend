import { z } from 'zod';

export const addToCartSchema = z.object({
    body: z.object({
        foodId: z.string().min(1, 'Food ID is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
    }),
});

export const updateCartItemSchema = z.object({
    body: z.object({
        foodId: z.string().min(1, 'Food ID is required'),
        quantity: z.number().int().min(0, 'Quantity cannot be negative'),
    }),
});

export const removeFromCartSchema = z.object({
    body: z.object({
        foodId: z.string().min(1, 'Food ID is required'),
    }),
});
