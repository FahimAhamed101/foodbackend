import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(100).optional(),
        phone: z.string().trim().regex(phoneRegex, 'Invalid phone number format').optional(),
        dateOfBirth: z.string().transform((val) => new Date(val)).optional(),
        address: z.string().trim().min(5).optional(),
        city: z.string().trim().min(2).max(100).optional(),
        state: z.string().trim().min(2).max(100).optional(),
        profilePic: z.string().url('Invalid profile picture URL').optional().or(z.literal('')),
        avatar: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
        Boi: z.string().trim().max(500).optional(), // Admin dash field with typo
    }),
});
