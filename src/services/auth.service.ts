import { User, UserRole } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { Otp, OtpPurpose } from '../models/otp.model';
import {
    generateToken,
    generateRefreshToken,
    hashPassword,
    comparePassword,
    generateOtp,
    hashOtp,
    compareOtp
} from '../utils/authUtils';
import AppError from '../utils/AppError';
import { sendEmail } from '../utils/emailService';
import { BlacklistedToken } from '../models/blacklistedToken.model';
import jwt from 'jsonwebtoken';
import { getOtpEmailTemplate } from '../utils/emailTemplate';

class AuthService {
    async logout(token: string) {
        // 1) Decode token to get expiry (without verifying again, as middleware already verified it)
        const decoded = jwt.decode(token) as { exp: number };

        // 2) Add to blacklist until it would have expired naturally
        // exp is in seconds, convert to Date
        const expiresAt = new Date(decoded.exp * 1000);

        await BlacklistedToken.create({
            token,
            expiresAt,
        });

        return { message: 'Logged out successfully' };
    }
    async signup(data: any) {
        const { fullName, email, password, role } = data;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email already exists', 400);
        }

        // Hash password
        const passwordHash = await hashPassword(password);
        const resolvedRole = role || UserRole.CUSTOMER;

        // Create user
        const user = await User.create({
            fullName,
            email,
            passwordHash,
            role: resolvedRole,
            isEmailVerified: false,
            authProvider: 'email',
        });

        // Auto-create appropriate profile
        if (resolvedRole === UserRole.PROVIDER) {
            await ProviderProfile.create({
                providerId: user._id,
                restaurantName: fullName, // Seed with full name initially
                contactEmail: email,
                phoneNumber: '0000000000', // Placeholder
                restaurantAddress: 'To be updated', // Placeholder
                isActive: true
            });
        } else {
            await Profile.create({
                userId: user._id,
                name: fullName,
                isActive: true
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Generate OTP
        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);

        // Clear any existing verification OTPs for this email
        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.EMAIL_VERIFY });

        // Save OTP
        await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            purpose: OtpPurpose.EMAIL_VERIFY,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Send OTP via Email
        await sendEmail({
            email: normalizedEmail,
            subject: 'DineFive - Verify Your Email',
            message: `Welcome to DineFive! Your verification code is: ${rawOtp}. This code expires in 10 minutes.`,
            html: getOtpEmailTemplate(rawOtp, fullName)
        });

        const accessToken = generateToken({ userId: user._id.toString(), role: user.role });
        const refreshToken = generateRefreshToken({ userId: user._id.toString(), role: user.role });

        return {
            message: 'OTP sent successfully for email verification.',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isEmailVerified,
                authProvider: user.authProvider,
            },
            session: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            },
        };
    }

    async providerSignup(data: any) {
        const {
            email,
            password,
            streetAddress,
            state
        } = data;

        // Generate smart defaults for required fields not in minimal body
        const fullName = email.split('@')[0];
        const restaurantName = `${fullName}'s Kitchen`;
        const phoneNumber = '0000000000';
        const city = 'Pending Update';

        // 1. Core User Creation
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email already registered', 400);
        }

        const passwordHash = await hashPassword(password);

        // Explicitly set PROVIDER role to prevent role base tampering
        const user = await User.create({
            fullName,
            email,
            passwordHash,
            role: UserRole.PROVIDER,
            isEmailVerified: false,
            authProvider: 'email',
        });

        // 2. Provider Profile Creation (Separated from User model)
        await ProviderProfile.create({
            providerId: user._id as any,
            restaurantName,
            contactEmail: email,
            phoneNumber,
            restaurantAddress: streetAddress || 'Pending Address',
            city,
            state: state || 'Pending State',
            zipCode: '00000',
            verificationStatus: 'PENDING',
            isActive: true
        });

        const normalizedEmail = email.toLowerCase().trim();

        // 3. Security: Email Verification Trigger
        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);

        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.EMAIL_VERIFY });

        await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            purpose: OtpPurpose.EMAIL_VERIFY,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        await sendEmail({
            email: normalizedEmail,
            subject: 'DineFive Provider Onboarding: Verify Your Email',
            message: `Welcome to DineFive Provider Network! Your verification code is: ${rawOtp}. This code expires in 10 minutes.`,
            html: getOtpEmailTemplate(rawOtp, fullName)
        });

        // 4. Response with JWT
        const accessToken = generateToken({ userId: user._id.toString(), role: user.role });
        const refreshToken = generateRefreshToken({ userId: user._id.toString(), role: user.role });

        return {
            message: 'Provider account created. Please verify your email to unlock dashboard features.',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isEmailVerified,
            },
            session: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            },
        };
    }

    async resendVerification(email: string) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        if (user.isEmailVerified) {
            throw new AppError('Email already verified', 400, 'ALREADY_VERIFIED');
        }

        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);

        // Clear any existing verification OTPs
        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.EMAIL_VERIFY });

        // Save new OTP
        await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            purpose: OtpPurpose.EMAIL_VERIFY,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Send OTP via Email
        await sendEmail({
            email: normalizedEmail,
            subject: 'Resend Verification OTP',
            message: `Your new verification code is: ${rawOtp}. This code expires in 10 minutes.`,
        });

        return { message: 'Verification OTP resent successfully' };
    }

    async verifyEmail(email: string, otp: string) {
        const normalizedEmail = email.toLowerCase().trim();
        const trimmedOtp = otp.trim();

        // 1) Find the OTP record
        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            purpose: OtpPurpose.EMAIL_VERIFY,
        });

        if (!otpRecord) {
            // Check if user is already verified
            const user = await User.findOne({ email: normalizedEmail });
            if (user?.isEmailVerified) {
                return { message: 'Email already verified' };
            }
            throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
        }

        // Check if expired (in case TTL hasn't run yet)
        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({ _id: otpRecord._id });
            throw new AppError('OTP has expired', 400, 'OTP_EXPIRED');
        }

        // 2) Compare hashed OTP
        if (!compareOtp(trimmedOtp, otpRecord.otp)) {
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        // 3) Mark user as verified
        await User.findOneAndUpdate({ email: normalizedEmail }, { isEmailVerified: true });

        // 4) Delete all validation OTPs for this user
        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.EMAIL_VERIFY });

        return { message: 'Email verified successfully' };
    }

    async login(email: string, password: string) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

        if (!user || !user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
            throw new AppError('Invalid email or password', 401);
        }

        if (!user.isEmailVerified) {
            throw new AppError('Please verify your email first', 401);
        }

        if (!user.isActive) {
            throw new AppError('Your account is deactivated. Please contact support.', 403);
        }

        if (user.isSuspended) {
            throw new AppError(`Your account is suspended. Reason: ${user.suspendedReason || 'N/A'}`, 403);
        }

        const accessToken = generateToken({
            userId: (user._id as any).toString(),
            role: user.role
        });

        const refreshToken = generateRefreshToken({
            userId: (user._id as any).toString(),
            role: user.role
        });

        // Update last login
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        return {
            message: 'Logged in successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isVerified: user.isEmailVerified,
                authProvider: user.authProvider,
            },
            session: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }
        };
    }

    async forgotPassword(email: string) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new AppError('If an account with that email exists, we have sent an OTP', 200);
        }

        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);

        // Clear any existing reset OTPs for this email
        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.RESET_PASSWORD });

        await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            purpose: OtpPurpose.RESET_PASSWORD,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        // Send Reset OTP via Email
        await sendEmail({
            email: normalizedEmail,
            subject: 'Password Reset OTP',
            message: `Use this code to reset your password: ${rawOtp}. This code expires in 10 minutes.`,
        });

        return { message: 'OTP sent to your email' };
    }

    async verifyForgotOtp(email: string, otp: string) {
        const normalizedEmail = email.toLowerCase().trim();

        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            purpose: OtpPurpose.RESET_PASSWORD,
        });

        if (!otpRecord) {
            throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
        }

        if (!compareOtp(otp, otpRecord.otp)) {
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const accessToken = generateToken({
            userId: user._id.toString(),
            role: user.role
        });

        return {
            message: 'OTP verified successfully. You can now reset your password.',
            accessToken
        };
    }

    async resetPassword(userId: string, newPassword: string) {
        const passwordHash = await hashPassword(newPassword);

        const user = await User.findByIdAndUpdate(userId, { passwordHash }, { new: true });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Clear all reset OTPs for this user
        await Otp.deleteMany({ email: user.email, purpose: OtpPurpose.RESET_PASSWORD });

        return { message: 'Password reset successful' };
    }

    async changePassword(userId: string, data: any) {
        const { currentPassword, newPassword } = data;

        const user = await User.findById(userId).select('+passwordHash');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (!user.passwordHash || !(await comparePassword(currentPassword, user.passwordHash))) {
            throw new AppError('Invalid current password', 400);
        }

        const passwordHash = await hashPassword(newPassword);
        user.passwordHash = passwordHash;
        await user.save();

        return { message: 'Password changed successfully' };
    }
}

export default new AuthService();
