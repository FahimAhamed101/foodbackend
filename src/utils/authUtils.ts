import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Generate short-lived access token (15 minutes)
 * 
 * JWT Payload Design:
 * - userId: User's database ID
 * - role: User's role (CUSTOMER, PROVIDER, ADMIN)
 * - iat: Issued at timestamp (automatic)
 * - exp: Expiration timestamp (automatic)
 * 
 * What NOT to include:
 * - Sensitive data (passwords, SSN, etc.)
 * - Large objects (user profile, preferences)
 * - Mutable data that changes frequently
 */
export const generateToken = (payload: { userId: string; role: string }): string => {
    const secret: Secret = process.env.JWT_SECRET || 'super-secret-key';
    const expiresIn = process.env.JWT_EXPIRE || '12h';
    const options: SignOptions = {
        expiresIn: expiresIn as any, // Increased to 12h for better UX
    };
    return jwt.sign(payload, secret, options);
};

/**
 * Generate long-lived refresh token (7 days)
 * 
 * Refresh tokens are used to obtain new access tokens without re-authentication.
 * They are stored in the database and can be revoked.
 */
export const generateRefreshToken = (payload: { userId: string; role: string }): string => {
    const secret: Secret = process.env.JWT_REFRESH_SECRET || 'super-refresh-secret-key';
    const expiresIn = process.env.JWT_REFRESH_EXPIRE || '7d';
    const options: SignOptions = {
        expiresIn: expiresIn as any,
    };
    return jwt.sign(payload, secret, options);
};

/**
 * Verify access token
 */
export const verifyToken = (token: string): { userId: string; role: string } => {
    const secret: Secret = process.env.JWT_SECRET || 'super-secret-key';
    return jwt.verify(token, secret) as { userId: string; role: string };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; role: string } => {
    const secret: Secret = process.env.JWT_REFRESH_SECRET || 'super-refresh-secret-key';
    return jwt.verify(token, secret) as { userId: string; role: string };
};

/**
 * Hash password using bcrypt (12 rounds)
 */
export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 12);
};

/**
 * Compare password with hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

/**
 * Generate 6-digit OTP
 */
export const generateOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP using SHA-256
 */
export const hashOtp = (otp: string): string => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Compare OTP with hash
 */
export const compareOtp = (otp: string, hashedOtp: string): boolean => {
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    return hash === hashedOtp;
};

/**
 * Hash token for storage (SHA-256)
 * 
 * Why hash tokens?
 * - Defense in depth: Even if database is compromised, tokens are useless
 * - Prevents token theft from database backups
 */
export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate unique token family ID for refresh token rotation
 */
export const generateTokenFamily = (): string => {
    return crypto.randomUUID();
};

/**
 * Generate unique device ID
 */
export const generateDeviceId = (userAgent: string, ipAddress: string): string => {
    const data = `${userAgent}-${ipAddress}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
};

/**
 * Parse device information from user agent
 */
export const parseDeviceInfo = (userAgent: string): {
    deviceName: string;
    deviceType: 'web' | 'mobile' | 'tablet' | 'desktop';
} => {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType: 'web' | 'mobile' | 'tablet' | 'desktop' = 'web';
    if (ua.includes('mobile')) {
        deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
    } else if (ua.includes('electron')) {
        deviceType = 'desktop';
    }

    // Detect browser/device name
    let deviceName = 'Unknown Device';
    if (ua.includes('chrome')) deviceName = 'Chrome';
    else if (ua.includes('firefox')) deviceName = 'Firefox';
    else if (ua.includes('safari')) deviceName = 'Safari';
    else if (ua.includes('edge')) deviceName = 'Edge';

    // Add OS info
    if (ua.includes('windows')) deviceName += ' on Windows';
    else if (ua.includes('mac')) deviceName += ' on Mac';
    else if (ua.includes('linux')) deviceName += ' on Linux';
    else if (ua.includes('android')) deviceName += ' on Android';
    else if (ua.includes('ios') || ua.includes('iphone')) deviceName += ' on iOS';

    return { deviceName, deviceType };
};
