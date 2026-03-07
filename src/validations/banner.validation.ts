import { z } from 'zod';
import { BannerStatus } from '../models/banner.model';

export const createBannerSchema = z.object({
    body: z.object({
        title: z.string().trim().min(3).max(100),
        bannerImage: z.string().url('Invalid image URL'),
        startTime: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Invalid date format (DD-MM-YYYY)'),
        endTime: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Invalid date format (DD-MM-YYYY)'),
        status: z.nativeEnum(BannerStatus).optional(),
    }).refine((data) => {
        const [sDay, sMonth, sYear] = data.startTime.split('-').map(Number);
        const [eDay, eMonth, eYear] = data.endTime.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay);
        const end = new Date(eYear, eMonth - 1, eDay);
        return start < end;
    }, {
        message: "End time must be after start time",
        path: ["endTime"],
    }),
});

export const updateBannerSchema = z.object({
    body: z.object({
        title: z.string().trim().min(3).max(100).optional(),
        bannerImage: z.string().url().optional(),
        startTime: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Invalid date format (DD-MM-YYYY)').optional(),
        endTime: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Invalid date format (DD-MM-YYYY)').optional(),
        status: z.nativeEnum(BannerStatus).optional(),
    }).refine((data) => {
        if (data.startTime && data.endTime) {
            const [sDay, sMonth, sYear] = data.startTime.split('-').map(Number);
            const [eDay, eMonth, eYear] = data.endTime.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay);
            const end = new Date(eYear, eMonth - 1, eDay);
            return start < end;
        }
        return true;
    }, {
        message: "End time must be after start time",
        path: ["endTime"],
    }),
});

export const getBannersQuerySchema = z.object({
    query: z.object({
        status: z.nativeEnum(BannerStatus).optional(),
        search: z.string().optional(),
        page: z.string().optional().default('1'),
        limit: z.string().optional().default('10'),
    }),
});
