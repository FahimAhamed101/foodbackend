import { z } from 'zod';

export const analyticsQuerySchema = z.object({
    query: z.object({
        filter: z.enum(['today', 'week', 'month', 'year', 'custom']).default('today'),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    }).refine(data => {
        if (data.filter === 'custom' && (!data.startDate || !data.endDate)) {
            return false;
        }
        return true;
    }, {
        message: 'startDate and endDate are required for custom filter',
        path: ['startDate']
    }),
});

export const recentOrdersQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().default('1'),
        limit: z.string().regex(/^\d+$/).optional().default('10'),
    }),
});
