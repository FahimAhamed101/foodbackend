import { z } from 'zod';

export const getTopRestaurantsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        minRating: z.string().optional(),
    }),
});

export const getTopFoodsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        minRating: z.string().optional(),
        providerId: z.string().optional(),
    }),
});
