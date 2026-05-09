import { z } from 'zod';

const donationAmountSchema = z.number()
    .finite('Donation amount must be a valid number')
    .min(0, 'Donation amount cannot be negative')
    .max(10000, 'Donation amount is too large')
    .optional()
    .default(0);

export const createPaymentIntentSchema = z.object({
    body: z.object({
        providerId: z.string().min(1, 'Provider ID is required'),
        items: z.array(
            z.object({
                foodId: z.string().min(1, 'Food ID is required'),
                quantity: z.number().int().min(1, 'Quantity must be at least 1'),
            })
        ).min(1, 'At least one item is required'),
        donationAmount: donationAmountSchema,
        isDonation: z.boolean().optional(),
    }),
});

export const refundSchema = z.object({
    body: z.object({
        orderId: z.string().min(1, 'Order ID is required'),
        reason: z.string().optional(),
    }),
});

export const paymentStatusSchema = z.object({
    params: z.object({
        paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
    }),
});
