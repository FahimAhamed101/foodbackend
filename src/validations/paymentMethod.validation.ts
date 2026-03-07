import { z } from 'zod';

export const addPaymentMethodSchema = z.object({
    body: z.object({
        cardholderName: z.string().trim().min(2, 'Cardholder name is required'),
        cardNumber: z.string()
            .regex(/^\d{16}$/, 'Card number must be 16 digits'),
        expiryDate: z.string()
            .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry date must be in MM/YY format'),
        cvv: z.string()
            .regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
        isDefault: z.boolean().optional().default(false),
    }),
});

export const paymentMethodIdSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid payment method ID format'),
    }),
});
