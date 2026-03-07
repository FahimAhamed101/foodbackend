import { Types } from 'mongoose';
import { Session, ISession } from '../models/session.model';
import { User } from '../models/user.model';
import { AuditLog, AuditEventType, RiskLevel } from '../models/auditLog.model';
import { hashToken, generateTokenFamily } from '../utils/authUtils';
import AppError from '../utils/AppError';
import crypto from 'crypto';

/**
 * Session Management Service
 * 
 * Handles multi-device session management with:
 * - Refresh token rotation (prevents token reuse attacks)
 * - Per-device session tracking
 * - Granular revocation (single device or all devices)
 * - Stolen token detection
 * - Session limits per user
 */
class SessionManagementService {
    private readonly MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '5');

    /**
     * Create a new session for a user
     * 
     * @param userId - User ID
     * @param accessToken - Access token (will be hashed)
     * @param refreshToken - Refresh token (will be hashed)
     * @param deviceInfo - Device information
     * @param expiresAt - Session expiration date
     * @returns Created session
     */
    async createSession(
        userId: string,
        accessToken: string,
        refreshToken: string,
        deviceInfo: DeviceInfo,
        expiresAt: Date
    ): Promise<ISession> {
        // Check session limit
        await this.enforceSessionLimit(userId);

        // Generate token family for rotation tracking
        const tokenFamily = generateTokenFamily();

        // Hash tokens before storing (defense in depth)
        const hashedAccessToken = hashToken(accessToken);
        const hashedRefreshToken = hashToken(refreshToken);

        // Create session
        const session = await Session.create({
            userId: new Types.ObjectId(userId),
            accessToken: hashedAccessToken,
            refreshToken: hashedRefreshToken,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            country: deviceInfo.country,
            city: deviceInfo.city,
            tokenFamily,
            issuedAt: new Date(),
            expiresAt,
            lastActivityAt: new Date(),
        });

        // Log session creation
        await this.logSessionEvent(
            userId,
            AuditEventType.LOGIN_SUCCESS,
            deviceInfo,
            'Session created successfully'
        );

        return session;
    }

    /**
     * Rotate refresh token (used when refreshing access token)
     * 
     * Token rotation prevents stolen token reuse:
     * - Old refresh token is invalidated
     * - New refresh token is issued
     * - If old token is used again, we detect theft
     */
    async rotateRefreshToken(
        oldRefreshToken: string,
        newAccessToken: string,
        newRefreshToken: string,
        deviceInfo: DeviceInfo
    ): Promise<ISession> {
        const hashedOldToken = hashToken(oldRefreshToken);

        // Find existing session
        const existingSession = await Session.findOne({
            refreshToken: hashedOldToken,
            isRevoked: false,
        });

        if (!existingSession) {
            // Token not found or already revoked
            // This could indicate token reuse attack!
            await this.handleSuspiciousTokenReuse(oldRefreshToken, deviceInfo);
            throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        // Check if token is expired
        if (existingSession.expiresAt < new Date()) {
            throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
        }

        // Revoke old session
        existingSession.isRevoked = true;
        existingSession.revokedAt = new Date();
        existingSession.revokedReason = 'token_rotation';
        await existingSession.save();

        // Create new session with same token family
        const hashedNewAccessToken = hashToken(newAccessToken);
        const hashedNewRefreshToken = hashToken(newRefreshToken);

        const newSession = await Session.create({
            userId: existingSession.userId,
            accessToken: hashedNewAccessToken,
            refreshToken: hashedNewRefreshToken,
            deviceId: existingSession.deviceId,
            deviceName: existingSession.deviceName,
            deviceType: existingSession.deviceType,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            country: deviceInfo.country,
            city: deviceInfo.city,
            tokenFamily: existingSession.tokenFamily, // Same family
            previousTokenId: existingSession._id, // Link to previous token
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            lastActivityAt: new Date(),
        });

        // Log token refresh
        await this.logSessionEvent(
            existingSession.userId.toString(),
            AuditEventType.TOKEN_REFRESH,
            deviceInfo,
            'Refresh token rotated successfully'
        );

        return newSession;
    }

    /**
     * Revoke a single session (single device logout)
     */
    async revokeSession(sessionId: string, reason: string = 'user_logout'): Promise<void> {
        const session = await Session.findById(sessionId);

        if (!session) {
            throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
        }

        session.isRevoked = true;
        session.revokedAt = new Date();
        session.revokedReason = reason;
        await session.save();

        // Log revocation
        await AuditLog.create({
            eventType: AuditEventType.TOKEN_REVOKED,
            userId: session.userId,
            action: `Session revoked: ${reason}`,
            result: 'success',
            deviceId: session.deviceId,
            ipAddress: session.ipAddress,
            riskLevel: RiskLevel.LOW,
            timestamp: new Date(),
        });
    }

    /**
     * Revoke all sessions for a user (global logout)
     */
    async revokeAllSessions(userId: string, reason: string = 'user_logout'): Promise<number> {
        const result = await Session.updateMany(
            { userId: new Types.ObjectId(userId), isRevoked: false },
            {
                $set: {
                    isRevoked: true,
                    revokedAt: new Date(),
                    revokedReason: reason,
                },
            }
        );

        // Log global logout
        await AuditLog.create({
            eventType: AuditEventType.LOGOUT,
            userId: new Types.ObjectId(userId),
            action: `All sessions revoked: ${reason}`,
            result: 'success',
            riskLevel: RiskLevel.LOW,
            timestamp: new Date(),
        });

        return result.modifiedCount;
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId: string): Promise<ISession[]> {
        return await Session.find({
            userId: new Types.ObjectId(userId),
            isRevoked: false,
            expiresAt: { $gt: new Date() },
        }).sort({ lastActivityAt: -1 });
    }

    /**
     * Verify if a session is valid
     */
    async verifySession(accessToken: string): Promise<ISession | null> {
        const hashedToken = hashToken(accessToken);

        const session = await Session.findOne({
            accessToken: hashedToken,
            isRevoked: false,
            expiresAt: { $gt: new Date() },
        });

        if (session) {
            // Update last activity
            session.lastActivityAt = new Date();
            await session.save();
        }

        return session;
    }

    /**
     * Enforce session limit per user
     * 
     * If user has too many sessions, revoke the oldest ones
     */
    private async enforceSessionLimit(userId: string): Promise<void> {
        const activeSessions = await Session.find({
            userId: new Types.ObjectId(userId),
            isRevoked: false,
        }).sort({ lastActivityAt: 1 }); // Oldest first

        if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
            // Revoke oldest sessions
            const sessionsToRevoke = activeSessions.slice(
                0,
                activeSessions.length - this.MAX_SESSIONS_PER_USER + 1
            );

            for (const session of sessionsToRevoke) {
                await this.revokeSession(
                    session._id.toString(),
                    'session_limit_exceeded'
                );
            }
        }
    }

    /**
     * Handle suspicious token reuse (potential theft)
     * 
     * If a revoked refresh token is used, it indicates:
     * 1. Token was stolen and attacker is trying to use it
     * 2. User is using an old token (unlikely with proper client implementation)
     * 
     * Response: Revoke ALL tokens in the same token family
     */
    private async handleSuspiciousTokenReuse(
        token: string,
        deviceInfo: DeviceInfo
    ): Promise<void> {
        const hashedToken = hashToken(token);

        // Find the revoked session
        const revokedSession = await Session.findOne({
            refreshToken: hashedToken,
            isRevoked: true,
        });

        if (revokedSession) {
            // Revoke all sessions in the same token family
            await Session.updateMany(
                { tokenFamily: revokedSession.tokenFamily },
                {
                    $set: {
                        isRevoked: true,
                        revokedAt: new Date(),
                        revokedReason: 'token_reuse_detected',
                    },
                }
            );

            // Log security incident
            await AuditLog.create({
                eventType: AuditEventType.TOKEN_REUSE_DETECTED,
                userId: revokedSession.userId,
                action: 'Suspicious token reuse detected - all sessions revoked',
                result: 'success',
                deviceId: deviceInfo.deviceId,
                ipAddress: deviceInfo.ipAddress,
                riskLevel: RiskLevel.CRITICAL,
                riskFactors: ['token_reuse', 'potential_theft'],
                timestamp: new Date(),
            });

            // Notify user (email/SMS)
            const user = await User.findById(revokedSession.userId);
            if (user) {
                // TODO: Send security alert email
                console.warn(`Security alert: Token reuse detected for user ${user.email}`);
            }
        }
    }

    /**
     * Log session-related events
     */
    private async logSessionEvent(
        userId: string,
        eventType: AuditEventType,
        deviceInfo: DeviceInfo,
        action: string
    ): Promise<void> {
        await AuditLog.create({
            eventType,
            userId: new Types.ObjectId(userId),
            action,
            result: 'success',
            deviceId: deviceInfo.deviceId,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            country: deviceInfo.country,
            city: deviceInfo.city,
            riskLevel: RiskLevel.LOW,
            timestamp: new Date(),
        });
    }
}

/**
 * Device Information Interface
 */
export interface DeviceInfo {
    deviceId: string;
    deviceName?: string;
    deviceType?: 'web' | 'mobile' | 'tablet' | 'desktop';
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
}

export default new SessionManagementService();
