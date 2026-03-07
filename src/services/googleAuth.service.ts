import { OAuth2Client, TokenPayload } from 'google-auth-library';
import AppError from '../utils/AppError';

/**
 * Google OAuth 2.0 Service
 * 
 * Handles secure verification of Google idTokens using Google's official SDK.
 * This is the FIRST line of defense - we NEVER trust frontend tokens blindly.
 * 
 * Security Guarantees:
 * 1. Verifies token signature using Google's public keys (RS256)
 * 2. Validates audience (aud) matches our Google Client ID
 * 3. Validates issuer (iss) is Google
 * 4. Validates expiration (exp)
 * 5. Ensures email is verified by Google
 */
class GoogleAuthService {
    private client: OAuth2Client | null = null;
    private readonly GOOGLE_CLIENT_ID: string;
    private readonly GOOGLE_AUDIENCES: string[];
    private readonly isConfigured: boolean;

    constructor() {
        this.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
        // Support multiple audiences (e.g. Android/iOS/Web) via comma-separated list
        const additionalAudiences = process.env.GOOGLE_ADDITIONAL_AUDIENCES
            ? process.env.GOOGLE_ADDITIONAL_AUDIENCES.split(',').map(aud => aud.trim())
            : [];

        this.GOOGLE_AUDIENCES = [this.GOOGLE_CLIENT_ID, ...additionalAudiences].filter(Boolean);
        this.isConfigured = this.GOOGLE_AUDIENCES.length > 0;

        if (this.isConfigured) {
            this.client = new OAuth2Client(this.GOOGLE_CLIENT_ID);
            console.log(`✅ Google OAuth service initialized with ${this.GOOGLE_AUDIENCES.length} allowed audience(s)`);
        } else {
            console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env to enable.');
        }
    }

    /**
     * Check if Google OAuth is configured
     */
    private ensureConfigured(): void {
        if (!this.isConfigured || !this.client) {
            throw new AppError(
                'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in environment variables.',
                500,
                'GOOGLE_OAUTH_NOT_CONFIGURED'
            );
        }
    }

    /**
     * Verify Google idToken and extract user information
     * 
     * @param idToken - The Google idToken from frontend
     * @returns Verified user data from Google
     * @throws AppError if token is invalid or verification fails
     */
    async verifyIdToken(idToken: string): Promise<GoogleUserData> {
        this.ensureConfigured();

        try {
            // Step 1: Verify token with Google's servers
            const ticket = await this.client!.verifyIdToken({
                idToken,
                audience: this.GOOGLE_AUDIENCES,
            });

            // Step 2: Extract payload
            const payload = ticket.getPayload();

            if (!payload) {
                throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
            }

            // Step 3: Validate critical fields
            this.validatePayload(payload);

            // Step 4: Extract and return user data
            return this.extractUserData(payload);

        } catch (error: any) {
            // Handle specific Google Auth errors
            if (error.message?.includes('Token used too late')) {
                throw new AppError('Google token has expired', 401, 'TOKEN_EXPIRED');
            }

            if (error.message?.includes('Invalid token signature')) {
                throw new AppError('Invalid Google token signature', 401, 'INVALID_SIGNATURE');
            }

            if (error.message?.includes('Wrong recipient')) {
                // The error message usually contains the received audience
                throw new AppError(
                    `Google Token Audience Mismatch. Received: ${error.message.split('!').pop()?.trim()}. Ensure GOOGLE_CLIENT_ID in backend matches the one sent by frontend.`,
                    401,
                    'AUDIENCE_MISMATCH'
                );
            }

            // Re-throw AppError as-is
            if (error instanceof AppError) {
                throw error;
            }

            // Generic error
            throw new AppError(
                'Failed to verify Google token',
                401,
                'GOOGLE_VERIFICATION_FAILED'
            );
        }
    }


    private validatePayload(payload: TokenPayload): void {
        // Check 1: Email must be verified
        if (!payload.email_verified) {
            throw new AppError(
                'Email not verified by Google. Please verify your email with Google first.',
                403,
                'EMAIL_NOT_VERIFIED'
            );
        }

        // Check 2: Validate audience (already done by verifyIdToken, but double-check)
        if (!this.GOOGLE_AUDIENCES.includes(payload.aud)) {
            console.error(`❌ Google Audience Mismatch: Received ${payload.aud}, Expected one of: ${this.GOOGLE_AUDIENCES.join(', ')}`);
            throw new AppError(
                `Token audience mismatch. Received: ${payload.aud}. Please check your GOOGLE_CLIENT_ID configuration.`,
                401,
                'AUDIENCE_MISMATCH'
            );
        }

        // Check 3: Validate issuer
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!payload.iss || !validIssuers.includes(payload.iss)) {
            throw new AppError(
                'Invalid token issuer',
                401,
                'INVALID_ISSUER'
            );
        }

        // Check 4: Ensure required fields exist
        if (!payload.sub || !payload.email) {
            throw new AppError(
                'Missing required fields in token',
                401,
                'MISSING_FIELDS'
            );
        }
    }

    /**
     * Extract user data from verified token payload
     * 
     * Why 'sub' is the primary identifier:
     * - 'sub' (Subject) is Google's unique, immutable user identifier
     * - Email can change, but 'sub' NEVER changes
     * - Use 'sub' as the foreign key to link Google identity to User model
     */
    private extractUserData(payload: TokenPayload): GoogleUserData {
        return {
            googleId: payload.sub!, // Primary identifier - NEVER changes
            email: payload.email!,
            emailVerified: payload.email_verified || false,
            name: payload.name || '',
            givenName: payload.given_name || '',
            familyName: payload.family_name || '',
            picture: payload.picture || '',
            locale: payload.locale || 'en',
        };
    }

    /**
     * Validate that the Google Client ID is properly configured
     */
    checkConfiguration(): boolean {
        return this.isConfigured;
    }
}

/**
 * Google User Data Interface
 * 
 * This represents the verified data we extract from Google's idToken.
 * All fields are guaranteed to be authentic because they come from
 * a cryptographically verified token.
 */
export interface GoogleUserData {
    googleId: string;        // Google's 'sub' - unique, immutable identifier
    email: string;           // User's email (verified by Google)
    emailVerified: boolean;  // Always true if we reach this point
    name: string;            // Full name
    givenName: string;       // First name
    familyName: string;      // Last name
    picture: string;         // Profile picture URL
    locale: string;          // User's locale (e.g., 'en', 'es')
}

export default new GoogleAuthService();
