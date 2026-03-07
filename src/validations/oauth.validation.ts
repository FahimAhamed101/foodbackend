import { z } from 'zod';
import { UserRole } from '../models/user.model';

/**
 * Google OAuth Authentication Validation
 */
export const googleAuthValidation = z.object({
    body: z.object({
        idToken: z.string().min(1, 'Google idToken cannot be empty'),
        
        requestedRole: z.nativeEnum(UserRole).refine(
            (val) => val === UserRole.CUSTOMER || val === UserRole.PROVIDER,
            { message: 'Role must be either CUSTOMER or PROVIDER' }
        ),
    }),
});

/**
 * Step-Up Verification Validation
 */
export const stepUpValidation = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        
        otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
    }),
});

/**
 * Refresh Token Validation
 */
export const refreshTokenValidation = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token cannot be empty'),
    }),
});
