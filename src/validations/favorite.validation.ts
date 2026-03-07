import { z } from 'zod';

export const createFavoriteSchema = z.object({
    body: z.object({
        foodId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Food ID'),
    }),
});

export const removeFavoriteSchema = z.object({
    params: z.object({
        foodId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Food ID'),
    }),
});

export const getFeedSchema = z.object({
    query: z.object({
        page: z.string().transform(Number).optional(),
        limit: z.string().transform(Number).optional(),
    }),
});
