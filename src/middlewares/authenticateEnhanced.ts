import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import { User } from '../models/user.model';
import { BlacklistedToken } from '../models/blacklistedToken.model';
import sessionManagementService from '../services/sessionManagement.service';
import { AuditLog, AuditEventType, RiskLevel } from '../models/auditLog.model';

export interface AuthRequest extends Request {
    token?: string;
    user?: {
        userId: string;
        role: string;
    };
}

/**
 * Enhanced Authentication Middleware
 * 
 * This middleware:
 * 1. Extracts JWT from Authorization header
 * 2. Verifies JWT signature and expiration
 * 3. Checks if token is blacklisted
 * 4. Verifies session exists and is active
 * 5. Checks if user exists and is active
 * 6. Updates session last activity
 * 7. Attaches user info to request
 */
export const authenticateEnhanced = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // Step 1: Extract token from Authorization header
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(
                new AppError(
                    'You are not logged in! Please log in to get access.',
                    401,
                    'AUTH_ERROR'
                )
            );
        }

        // Step 2: Check if token is blacklisted (legacy support)
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return next(
                new AppError(
                    'This token is no longer valid. Please log in again.',
                    401,
                    'AUTH_ERROR'
                )
            );
        }

        // Step 3: Verify JWT signature and expiration
        let decoded: { userId: string; role: string };
        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'super-secret-key'
            ) as { userId: string; role: string };
        } catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                return next(
                    new AppError(
                        'Your token has expired. Please log in again.',
                        401,
                        'TOKEN_EXPIRED'
                    )
                );
            }
            return next(
                new AppError(
                    'Invalid token. Please log in again!',
                    401,
                    'AUTH_ERROR'
                )
            );
        }

        // Step 4: Verify session exists and is active
        const session = await sessionManagementService.verifySession(token);
        if (!session) {
            // Session not found or revoked
            await logSuspiciousActivity(
                decoded.userId,
                'Session not found for valid JWT',
                req
            );

            return next(
                new AppError(
                    'Session expired or revoked. Please log in again.',
                    401,
                    'SESSION_INVALID'
                )
            );
        }

        // Step 5: Check if user exists and is active
        const user = await User.findById(decoded.userId);
        if (!user) {
            return next(
                new AppError(
                    'The user belonging to this token no longer exists.',
                    401,
                    'AUTH_ERROR'
                )
            );
        }

        if (!user.isActive) {
            return next(
                new AppError(
                    'Your account has been deactivated. Please contact support.',
                    403,
                    'ACCOUNT_INACTIVE'
                )
            );
        }

        if (user.isSuspended) {
            return next(
                new AppError(
                    `Your account has been suspended. Reason: ${user.suspendedReason || 'Contact support'}`,
                    403,
                    'ACCOUNT_SUSPENDED'
                )
            );
        }

        // Step 6: Verify role matches (defense against role tampering)
        if (user.role !== decoded.role) {
            await logSuspiciousActivity(
                decoded.userId,
                `Role mismatch: JWT has ${decoded.role}, DB has ${user.role}`,
                req
            );

            return next(
                new AppError(
                    'Invalid token. Please log in again!',
                    401,
                    'ROLE_MISMATCH'
                )
            );
        }

        // Step 7: Attach user info to request
        req.token = token;
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch (err) {
        next(new AppError('Authentication failed. Please log in again!', 401, 'AUTH_ERROR'));
    }
};

/**
 * Log suspicious authentication activity
 */
async function logSuspiciousActivity(
    userId: string,
    reason: string,
    req: Request
): Promise<void> {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                     req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    await AuditLog.create({
        eventType: AuditEventType.SUSPICIOUS_LOGIN,
        userId,
        action: `Suspicious authentication activity: ${reason}`,
        result: 'failure',
        ipAddress,
        userAgent,
        riskLevel: RiskLevel.HIGH,
        riskFactors: ['suspicious_activity', 'potential_token_tampering'],
        timestamp: new Date(),
    });
}

/**
 * Optional authentication middleware
 * 
 * Attaches user info if token is present, but doesn't fail if missing
 */
export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(); // No token, continue without user info
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'super-secret-key'
        ) as { userId: string; role: string };

        // Attach user info
        req.token = token;
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch (err) {
        // Token invalid, continue without user info
        next();
    }
};
