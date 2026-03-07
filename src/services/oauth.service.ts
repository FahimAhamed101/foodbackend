import { User, UserRole, AuthProvider } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { AuditLog, AuditEventType, RiskLevel } from '../models/auditLog.model';
import { StepUpVerification, StepUpPurpose, StepUpMethod, StepUpStatus } from '../models/stepUpVerification.model';
import googleAuthService, { GoogleUserData } from './googleAuth.service';
import sessionManagementService, { DeviceInfo } from './sessionManagement.service';
import { generateToken, generateRefreshToken, generateOtp, hashOtp, generateDeviceId, parseDeviceInfo } from '../utils/authUtils';
import { sendEmail } from '../utils/emailService';
import AppError from '../utils/AppError';

/**
 * OAuth Service - Google Authentication
 * 
 * This service orchestrates the complete Google OAuth flow with:
 * 1. Google idToken verification
 * 2. User lookup/creation
 * 3. Role assignment (backend-controlled)
 * 4. Step-up verification for PROVIDER role
 * 5. JWT issuance
 * 6. Session management
 * 7. Audit logging
 */
class OAuthService {
    /**
     * Main Google Authentication Flow
     * 
     * @param idToken - Google idToken from frontend
     * @param requestedRole - Role requested by frontend (USER or PROVIDER)
     * @param deviceInfo - Device information
     * @returns Authentication response with tokens and user data
     */
    async authenticateWithGoogle(
        idToken: string,
        requestedRole: UserRole,
        deviceInfo: Partial<DeviceInfo>
    ): Promise<GoogleAuthResponse> {
        try {
            // STEP 1: Verify Google idToken
            // This is the FIRST line of defense - we NEVER trust frontend blindly
            const googleUser = await googleAuthService.verifyIdToken(idToken);

            // STEP 2: Find or create user
            const { user, isFirstLogin } = await this.findOrCreateUser(googleUser, requestedRole);

            // STEP 3: Validate role assignment
            const finalRole = await this.validateRoleAssignment(user, requestedRole, isFirstLogin);

            // STEP 4: Check if step-up verification is required
            const requiresStepUp = await this.checkStepUpRequired(user, finalRole, isFirstLogin);

            if (requiresStepUp) {
                // Initiate step-up verification
                await this.initiateStepUpVerification(user, deviceInfo);

                return {
                    requiresStepUp: true,
                    message: 'Additional verification required for PROVIDER access',
                    user: {
                        id: user._id.toString(),
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified,
                        authProvider: user.authProvider,
                    },
                };
            }

            // STEP 5: Generate device ID
            const fullDeviceInfo: DeviceInfo = {
                deviceId: deviceInfo.deviceId || generateDeviceId(
                    deviceInfo.userAgent || '',
                    deviceInfo.ipAddress || ''
                ),
                ...deviceInfo,
            } as DeviceInfo;

            // STEP 6: Issue backend JWT tokens
            const accessToken = generateToken({
                userId: user._id.toString(),
                role: user.role,
            });

            const refreshToken = generateRefreshToken({
                userId: user._id.toString(),
                role: user.role,
            });

            // STEP 7: Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await sessionManagementService.createSession(
                user._id.toString(),
                accessToken,
                refreshToken,
                fullDeviceInfo,
                expiresAt
            );

            // STEP 8: Update last login
            user.lastLoginAt = new Date();
            await user.save();

            // STEP 9: Log successful authentication
            await this.logAuthEvent(
                user._id.toString(),
                AuditEventType.GOOGLE_AUTH_SUCCESS,
                fullDeviceInfo,
                'Google authentication successful',
                RiskLevel.LOW
            );

            // STEP 10: Return response
            return {
                requiresStepUp: false,
                message: 'Authentication successful',
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    authProvider: user.authProvider,
                    profilePic: user.googlePicture || user.profilePic,
                },
                session: {
                    accessToken,
                    refreshToken,
                    expiresAt: expiresAt.toISOString(),
                },
            };

        } catch (error: any) {
            // Log failed authentication
            await this.logAuthEvent(
                undefined,
                AuditEventType.GOOGLE_AUTH_FAILED,
                deviceInfo as DeviceInfo,
                `Google authentication failed: ${error.message}`,
                RiskLevel.MEDIUM
            );

            throw error;
        }
    }

    /**
     * Find existing user or create new user
     * 
     * Logic:
     * - Search by googleId (primary identifier)
     * - If not found, search by email (for account linking)
     * - If still not found, create new user
     */
    private async findOrCreateUser(
        googleUser: GoogleUserData,
        requestedRole: UserRole
    ): Promise<{ user: any; isFirstLogin: boolean }> {
        // Try to find user by Google ID
        let user = await User.findOne({ googleId: googleUser.googleId });

        if (user) {
            // Existing Google user
            return { user, isFirstLogin: false };
        }

        // Try to find user by email (account linking scenario)
        user = await User.findOne({ email: googleUser.email });

        if (user) {
            // User exists with email auth - link Google account
            if (user.authProvider === AuthProvider.EMAIL) {
                user.googleId = googleUser.googleId;
                user.googleEmail = googleUser.email;
                user.googlePicture = googleUser.picture;
                user.authProvider = AuthProvider.GOOGLE; // Switch to Google auth
                user.isEmailVerified = true; // Google verified the email
                await user.save();

                return { user, isFirstLogin: false };
            }

            // User exists with different OAuth provider
            throw new AppError(
                `Email already registered with ${user.authProvider}`,
                409,
                'EMAIL_ALREADY_EXISTS'
            );
        }

        // Create new user
        user = await User.create({
            fullName: googleUser.name,
            email: googleUser.email,
            googleId: googleUser.googleId,
            googleEmail: googleUser.email,
            googlePicture: googleUser.picture,
            role: requestedRole,
            isEmailVerified: true, // Google verified the email
            authProvider: AuthProvider.GOOGLE,
            roleAssignedAt: new Date(),
            roleAssignedBy: 'system',
            isActive: true,
            isSuspended: false,
        });

        // Create appropriate profile
        if (requestedRole === UserRole.PROVIDER) {
            await ProviderProfile.create({
                providerId: user._id,
                restaurantName: googleUser.name,
                contactEmail: googleUser.email,
                phoneNumber: '0000000000',
                restaurantAddress: 'To be updated',
                verificationStatus: 'PENDING',
                isActive: true,
            });
        } else {
            await Profile.create({
                userId: user._id,
                name: googleUser.name,
                isActive: true,
            });
        }

        // Log account creation
        await AuditLog.create({
            eventType: AuditEventType.ACCOUNT_CREATED,
            userId: user._id,
            email: user.email,
            action: `New ${requestedRole} account created via Google OAuth`,
            result: 'success',
            riskLevel: RiskLevel.LOW,
            timestamp: new Date(),
        });

        return { user, isFirstLogin: true };
    }

    /**
     * Validate role assignment
     * 
     * Security Rules:
     * 1. First login: Assign requested role (with validation)
     * 2. Existing user: Use database role (IGNORE frontend request)
     * 3. Role upgrade: Requires explicit workflow (not handled here)
     */
    private async validateRoleAssignment(
        user: any,
        requestedRole: UserRole,
        isFirstLogin: boolean
    ): Promise<UserRole> {
        if (isFirstLogin) {
            // First login: Validate requested role
            if (!Object.values(UserRole).includes(requestedRole)) {
                throw new AppError('Invalid role requested', 400, 'INVALID_ROLE');
            }

            // PROVIDER role requires additional validation
            if (requestedRole === UserRole.PROVIDER) {
                // Check if PROVIDER signups are allowed
                const providerSignupsEnabled = process.env.ALLOW_PROVIDER_SIGNUPS !== 'false';
                if (!providerSignupsEnabled) {
                    throw new AppError(
                        'PROVIDER signups are currently disabled',
                        403,
                        'PROVIDER_SIGNUPS_DISABLED'
                    );
                }
            }

            return requestedRole;
        }

        // Existing user: ALWAYS use database role
        // Frontend cannot change role on subsequent logins
        if (requestedRole !== user.role) {
            console.warn(
                `Role mismatch for user ${user.email}: ` +
                `Requested ${requestedRole}, but user has ${user.role}. ` +
                `Using database role (${user.role}).`
            );
        }

        return user.role;
    }

    /**
     * Check if step-up verification is required
     * 
     * Step-up verification is required for:
     * 1. First PROVIDER login
     * 2. PROVIDER role upgrade
     * 3. Suspicious login patterns (location change, new device)
     */
    private async checkStepUpRequired(
        user: any,
        role: UserRole,
        isFirstLogin: boolean
    ): Promise<boolean> {
        const stepUpEnabled = process.env.ENABLE_STEP_UP_VERIFICATION !== 'false';

        if (!stepUpEnabled) {
            return false;
        }

        // Check 1: First PROVIDER login
        if (isFirstLogin && role === UserRole.PROVIDER) {
            return true;
        }

        // Check 2: PROVIDER role but not approved
        if (role === UserRole.PROVIDER && !user.isProviderApproved) {
            const requireApproval = process.env.REQUIRE_PROVIDER_APPROVAL === 'true';
            if (requireApproval) {
                return true;
            }
        }

        // Check 3: Suspicious login patterns (TODO: implement)
        // - Location change
        // - New device
        // - Unusual time

        return false;
    }

    /**
     * Initiate step-up verification
     * 
     * For PROVIDER role, we send an OTP to the user's email
     */
    private async initiateStepUpVerification(
        user: any,
        deviceInfo: Partial<DeviceInfo>
    ): Promise<void> {
        // Generate OTP
        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);

        // Create step-up verification record
        await StepUpVerification.create({
            userId: user._id,
            purpose: StepUpPurpose.PROVIDER_FIRST_LOGIN,
            method: StepUpMethod.EMAIL_OTP,
            status: StepUpStatus.PENDING,
            otp: hashedOtp,
            otpAttempts: 0,
            maxOtpAttempts: 3,
            requestedAction: 'PROVIDER login',
            ipAddress: deviceInfo.ipAddress,
            deviceId: deviceInfo.deviceId,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Send OTP email
        await sendEmail({
            email: user.email,
            subject: 'PROVIDER Access Verification',
            message: `Your verification code for PROVIDER access is: ${rawOtp}. This code expires in 10 minutes.`,
        });

        // Log step-up initiation
        await AuditLog.create({
            eventType: AuditEventType.STEP_UP_REQUIRED,
            userId: user._id,
            email: user.email,
            action: 'Step-up verification initiated for PROVIDER access',
            result: 'success',
            ipAddress: deviceInfo.ipAddress,
            deviceId: deviceInfo.deviceId,
            riskLevel: RiskLevel.MEDIUM,
            timestamp: new Date(),
        });
    }

    /**
     * Verify step-up OTP
     */
    async verifyStepUpOtp(
        email: string,
        otp: string,
        deviceInfo: Partial<DeviceInfo>
    ): Promise<GoogleAuthResponse> {
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Find pending step-up verification
        const verification = await StepUpVerification.findOne({
            userId: user._id,
            status: StepUpStatus.PENDING,
            expiresAt: { $gt: new Date() },
        });

        if (!verification) {
            throw new AppError('No pending verification found', 404, 'NO_VERIFICATION');
        }

        // Check OTP attempts
        if (verification.otpAttempts >= verification.maxOtpAttempts) {
            verification.status = StepUpStatus.FAILED;
            await verification.save();
            throw new AppError('Maximum OTP attempts exceeded', 429, 'MAX_ATTEMPTS');
        }

        // Verify OTP
        const hashedOtp = hashOtp(otp.trim());
        if (hashedOtp !== verification.otp) {
            verification.otpAttempts += 1;
            await verification.save();
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        // Mark verification as complete
        verification.status = StepUpStatus.VERIFIED;
        verification.verifiedAt = new Date();
        await verification.save();

        // Approve PROVIDER role
        user.isProviderApproved = true;
        user.providerApprovedAt = new Date();
        user.providerApprovedBy = 'system';
        await user.save();

        // Log step-up success
        await AuditLog.create({
            eventType: AuditEventType.STEP_UP_SUCCESS,
            userId: user._id,
            email: user.email,
            action: 'Step-up verification completed successfully',
            result: 'success',
            ipAddress: deviceInfo.ipAddress,
            deviceId: deviceInfo.deviceId,
            riskLevel: RiskLevel.LOW,
            timestamp: new Date(),
        });

        // Generate tokens and create session
        const fullDeviceInfo: DeviceInfo = {
            deviceId: deviceInfo.deviceId || generateDeviceId(
                deviceInfo.userAgent || '',
                deviceInfo.ipAddress || ''
            ),
            ...deviceInfo,
        } as DeviceInfo;

        const accessToken = generateToken({
            userId: user._id.toString(),
            role: user.role,
        });

        const refreshToken = generateRefreshToken({
            userId: user._id.toString(),
            role: user.role,
        });

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await sessionManagementService.createSession(
            user._id.toString(),
            accessToken,
            refreshToken,
            fullDeviceInfo,
            expiresAt
        );

        return {
            requiresStepUp: false,
            message: 'Verification successful',
            user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                authProvider: user.authProvider,
                profilePic: user.googlePicture || user.profilePic,
            },
            session: {
                accessToken,
                refreshToken,
                expiresAt: expiresAt.toISOString(),
            },
        };
    }

    /**
     * Log authentication event
     */
    private async logAuthEvent(
        userId: string | undefined,
        eventType: AuditEventType,
        deviceInfo: DeviceInfo,
        action: string,
        riskLevel: RiskLevel
    ): Promise<void> {
        await AuditLog.create({
            eventType,
            userId: userId ? userId : undefined,
            action,
            result: eventType.includes('FAILED') ? 'failure' : 'success',
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            deviceId: deviceInfo.deviceId,
            country: deviceInfo.country,
            city: deviceInfo.city,
            riskLevel,
            timestamp: new Date(),
        });
    }
}

/**
 * Google Authentication Response
 */
export interface GoogleAuthResponse {
    requiresStepUp: boolean;
    message: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: UserRole;
        isEmailVerified: boolean;
        authProvider: string;
        profilePic?: string;
    };
    session?: {
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
    };
}

export default new OAuthService();
