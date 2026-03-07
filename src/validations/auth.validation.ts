import { z } from 'zod';

export const signupSchema = z.object({
    body: z.object({
        fullName: z
            .string()
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name cannot exceed 50 characters'),
        email: z
            .string()
            .trim()
            .email('Invalid email format'),
        password: z
            .string()
            .min(6, 'Password must be at least 6 characters')
            .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
            .regex(/[0-9]/, 'Password must contain at least one number'),
        role: z.enum(['CUSTOMER', 'PROVIDER', 'ADMIN']).optional(),
    }),
});

export const providerSignupSchema = z.object({
    body: z.object({
        email: z.string().trim().email('Invalid email format'),
        password: z.string().min(6).regex(/[a-zA-Z]/).regex(/[0-9]/),
        streetAddress: z.string().trim().min(2).optional().default(''),
        state: z.string().trim().min(2).optional().default(''),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z
            .string()
            .trim()
            .email('Invalid email format'),
        password: z
            .string()
            .min(1, 'Password is required'),
    }),
});

export const verifyEmailSchema = z.object({
    body: z.object({
        email: z
            .string()
            .trim()
            .email('Invalid email format'),
        otp: z
            .string()
            .length(6, 'OTP must be exactly 6 digits'),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z
            .string()
            .trim()
            .email('Invalid email format'),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        newPassword: z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    }),
});

export const verifyForgotOtpSchema = z.object({
    body: z.object({
        email: z.string().trim().email('Invalid email format'),
        otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    }),
});
export const resendVerificationSchema = z.object({
    body: z.object({
        email: z.string().trim().email('Invalid email format'),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'Password must be at least 6 characters').regex(/[a-zA-Z]/, 'Password must contain at least one letter').regex(/[0-9]/, 'Password must contain at least one number'),
        confirmNewPassword: z.string()
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ['confirmNewPassword'],
    }),
});
