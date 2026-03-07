import { z } from 'zod';

export const getOrdersQuerySchema = z.object({
    query: z.object({
        orderId: z.string().optional(),
        customerName: z.string().trim().min(2).max(50).optional(),
        status: z.enum(['pending', 'preparing', 'ready_for_pickup', 'picked_up', 'cancelled']).optional(),
        page: z.string().regex(/^\d+$/).optional().default('1'),
        limit: z.string().regex(/^\d+$/).optional().default('10'),
    }),
});
export const createOrderSchema = z.object({
    body: z.object({
        providerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID'),
        items: z.array(z.object({
            foodId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Food ID'),
            quantity: z.number().int().min(1),
            price: z.number().min(0),
        })).min(1),
        paymentMethod: z.string().min(1),
        logisticsType: z.string().min(1),
    }),
});

export const cancelOrderSchema = z.object({
    body: z.object({
        reason: z.string().min(3).max(500),
    }),
});
