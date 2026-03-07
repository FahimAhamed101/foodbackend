import { Request, Response, NextFunction } from 'express';
import oauthService from '../services/oauth.service';
import sessionManagementService from '../services/sessionManagement.service';
import { catchAsync } from '../utils/catchAsync';
import { UserRole } from '../models/user.model';
import { parseDeviceInfo } from '../utils/authUtils';
import AppError from '../utils/AppError';

/**
 * OAuth Controller
 * 
 * Handles Google OAuth authentication endpoints
 */
class OAuthController {
    /**
     * POST /auth/google
     * 
     * Authenticate user with Google idToken
     * 
     * Request body:
     * - idToken: Google idToken from frontend
     * - requestedRole: USER or PROVIDER
     * 
     * Response:
     * - If step-up required: { requiresStepUp: true, user: {...} }
     * - If successful: { user: {...}, session: { accessToken, refreshToken } }
     */
    googleAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { idToken, requestedRole } = req.body;

        // Validation
        if (!idToken) {
            throw new AppError('Google idToken is required', 400, 'MISSING_ID_TOKEN');
        }

        if (!requestedRole) {
            throw new AppError('Requested role is required', 400, 'MISSING_ROLE');
        }

        // Validate role
        if (!Object.values(UserRole).includes(requestedRole)) {
            throw new AppError('Invalid role', 400, 'INVALID_ROLE');
        }

        // Extract device information
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress || '';

        const { deviceName, deviceType } = parseDeviceInfo(userAgent);

        const deviceInfo = {
            userAgent,
            ipAddress,
            deviceName,
            deviceType,
            // TODO: Add geo-location (country, city) using IP geolocation service
        };

        // Authenticate with Google
        const result = await oauthService.authenticateWithGoogle(
            idToken,
            requestedRole,
            deviceInfo
        );

        // Return response
        if (result.requiresStepUp) {
            res.status(200).json({
                success: true,
                requiresStepUp: true,
                message: result.message,
                data: {
                    user: result.user,
                },
            });
        } else {
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    user: result.user,
                    session: result.session,
                },
            });
        }
    });

    /**
     * POST /auth/google/verify-stepup
     * 
     * Verify step-up OTP for PROVIDER access
     * 
     * Request body:
     * - email: User's email
     * - otp: 6-digit OTP
     */
    verifyStepUp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp } = req.body;

        if (!email || !otp) {
            throw new AppError('Email and OTP are required', 400, 'MISSING_FIELDS');
        }

        // Extract device information
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress || '';

        const { deviceName, deviceType } = parseDeviceInfo(userAgent);

        const deviceInfo = {
            userAgent,
            ipAddress,
            deviceName,
            deviceType,
        };

        // Verify OTP
        const result = await oauthService.verifyStepUpOtp(email, otp, deviceInfo);

        res.status(200).json({
            success: true,
            message: result.message,
            data: {
                user: result.user,
                session: result.session,
            },
        });
    });

    /**
     * POST /auth/refresh
     * 
     * Refresh access token using refresh token
     * 
     * Request body:
     * - refreshToken: Refresh token
     */
    refreshToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
        }

        // Extract device information
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress || '';

        const { deviceName, deviceType } = parseDeviceInfo(userAgent);

        const deviceInfo = {
            userAgent,
            ipAddress,
            deviceName,
            deviceType,
        };

        // TODO: Implement token refresh logic
        // This should:
        // 1. Verify refresh token
        // 2. Generate new access token
        // 3. Rotate refresh token
        // 4. Update session

        throw new AppError('Token refresh not yet implemented', 501);
    });

    /**
     * GET /auth/sessions
     * 
     * Get all active sessions for the authenticated user
     */
    getSessions = catchAsync(async (req: any, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;

        if (!userId) {
            throw new AppError('Authentication required', 401);
        }

        const sessions = await sessionManagementService.getUserSessions(userId);

        res.status(200).json({
            success: true,
            data: {
                sessions: sessions.map(session => ({
                    id: session._id,
                    deviceName: session.deviceName,
                    deviceType: session.deviceType,
                    ipAddress: session.ipAddress,
                    country: session.country,
                    city: session.city,
                    lastActivityAt: session.lastActivityAt,
                    createdAt: session.createdAt,
                })),
            },
        });
    });

    /**
     * DELETE /auth/sessions/:sessionId
     * 
     * Revoke a specific session (logout from specific device)
     */
    revokeSession = catchAsync(async (req: any, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const { sessionId } = req.params;

        if (!userId) {
            throw new AppError('Authentication required', 401);
        }

        await sessionManagementService.revokeSession(sessionId, 'user_logout');

        res.status(200).json({
            success: true,
            message: 'Session revoked successfully',
        });
    });

    /**
     * DELETE /auth/sessions
     * 
     * Revoke all sessions (logout from all devices)
     */
    revokeAllSessions = catchAsync(async (req: any, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;

        if (!userId) {
            throw new AppError('Authentication required', 401);
        }

        const count = await sessionManagementService.revokeAllSessions(userId, 'user_logout');

        res.status(200).json({
            success: true,
            message: `${count} session(s) revoked successfully`,
        });
    });
}

export default new OAuthController();
