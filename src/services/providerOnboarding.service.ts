import { Types } from 'mongoose';
import { User, UserRole, AuthProvider } from '../models/user.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { ProviderDocument } from '../models/providerDocument.model';
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
import { getOtpEmailTemplate } from '../utils/emailTemplate';

class ProviderOnboardingService {

    // ──────────────────────────────────────────────────────────
    // STEP 1: Register Email & Send OTP
    // ──────────────────────────────────────────────────────────
    async registerEmail(email: string) {
        console.log(`[ONBOARDING] Registering email: ${email}`);
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            // If already verified with password set, reject
            if (existingUser.isEmailVerified && existingUser.passwordHash) {
                throw new AppError('Email already registered. Please login.', 400);
            }
        }

        // Create or update user
        let user = existingUser;
        if (!user) {
            user = await User.create({
                fullName: normalizedEmail.split('@')[0],
                email: normalizedEmail,
                role: UserRole.PROVIDER,
                isEmailVerified: false,
                authProvider: AuthProvider.EMAIL,
                isProviderApproved: false,
            });
        }

        // Generate & send OTP
        const rawOtp = generateOtp();
        const hashedOtp = hashOtp(rawOtp);

        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.EMAIL_VERIFY });

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await Otp.create({
            email: normalizedEmail,
            otp: hashedOtp,
            purpose: OtpPurpose.EMAIL_VERIFY,
            expiresAt,
        });

        await sendEmail({
            email: normalizedEmail,
            subject: 'DineFive - Provider Registration Verification',
            message: `Welcome to DineFive! Your verification code is: ${rawOtp}. This code expires in 10 minutes.`,
            html: getOtpEmailTemplate(rawOtp, user.fullName || normalizedEmail.split('@')[0])
        });

        return {
            message: 'OTP sent to your email',
            data: {
                email: normalizedEmail,
                otpExpiresAt: expiresAt.toISOString(),
            },
        };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 2: Verify Email OTP
    // ──────────────────────────────────────────────────────────
    async verifyEmailOtp(email: string, otp: string) {
        const normalizedEmail = email.toLowerCase().trim();

        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            purpose: OtpPurpose.EMAIL_VERIFY,
        });

        if (!otpRecord) throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({ _id: otpRecord._id });
            throw new AppError('OTP has expired', 400, 'OTP_EXPIRED');
        }

        if (!compareOtp(otp.trim(), otpRecord.otp)) {
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        const user = await User.findOneAndUpdate(
            { email: normalizedEmail },
            { isEmailVerified: true },
            { new: true }
        );

        if (!user) throw new AppError('User not found', 404);

        await Otp.deleteMany({ email: normalizedEmail, purpose: OtpPurpose.EMAIL_VERIFY });

        const tempToken = generateToken({ userId: user._id.toString(), role: user.role });

        return {
            message: 'Email verified successfully',
            data: {
                tempToken,
                nextStep: 'set-password',
            },
        };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 3: Set Password
    // ──────────────────────────────────────────────────────────
    async setPassword(userId: string, password: string, confirmPassword: string) {
        if (password !== confirmPassword) throw new AppError("Passwords don't match", 400);

        const user = await User.findById(userId).select('+passwordHash');
        if (!user) throw new AppError('User not found', 404);

        if (!user.isEmailVerified) throw new AppError('Please verify your email first', 400);

        // Allow setting/updating password during onboarding even if already set
        // This helps in testing and re-running onboarding steps
        /* 
        if (user.passwordHash && user.isProviderApproved) {
            throw new AppError('Password already set and provider is approved.', 400, 'PASSWORD_ALREADY_SET');
        }
        */

        user.passwordHash = await hashPassword(password);
        await user.save();

        const accessToken = generateToken({ userId: user._id.toString(), role: user.role });
        const refreshToken = generateRefreshToken({ userId: user._id.toString(), role: user.role });

        return {
            message: 'Password set successfully.',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                },
                nextStep: 'restaurant-info',
            },
        };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 4: Submit Restaurant Information
    // ──────────────────────────────────────────────────────────
    async submitRestaurantInfo(providerId: string, data: any, restaurantImageUrl?: string) {
        const user = await User.findById(providerId);
        if (!user) throw new AppError('User not found', 404);
        if (user.role !== UserRole.PROVIDER) throw new AppError('Only providers can submit info', 403);

        const profileData: any = {
            restaurantName: data.restaurantName,
            contactEmail: data.email || data.contactEmail || user.email,
            phoneNumber: data.phoneNumber || data.PhoneNumebr,
            restaurantAddress: data.restaurantAddress || data.RestaurantAddress,
            city: data.city || 'Pending',
            state: data.state || 'Pending',
            zipCode: data.zipCode || '',
            cuisine: data.cuisine ? (typeof data.cuisine === 'string' ? JSON.parse(data.cuisine) : data.cuisine) : [],
            verificationStatus: 'PENDING',
            isVerify: false,
        };

        if (restaurantImageUrl) profileData.profile = restaurantImageUrl;

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: new Types.ObjectId(providerId) },
            { $set: profileData },
            { new: true, upsert: true, runValidators: true }
        );

        return {
            message: 'Restaurant info saved.',
            data: {
                profileId: profile._id,
                nextStep: 'documents-upload',
            },
        };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 5: Upload Required Documents
    // ──────────────────────────────────────────────────────────
    async uploadDocuments(providerId: string, data: any, files: any) {
        const user = await User.findById(providerId);
        if (!user) throw new AppError('User not found', 404);

        const profile = await ProviderProfile.findOne({ providerId: new Types.ObjectId(providerId) });
        if (!profile) throw new AppError('Submit restaurant info first', 400);

        const docData: any = {
            providerId: new Types.ObjectId(providerId),
            EIN: data.EIN || '',
            businessBankName: data.businessBankName || '',
            businessBankAccountNumber: data.businessBankAccountNumber || '',
            businessBankRoutingNumber: data.businessBankRoutingNumber || '',
            documentStatus: 'pending',
            submittedAt: new Date(),
        };

        if (files.businessLicenseFile) docData.businessLicense = files.businessLicenseFile[0].path;
        if (files.healthPermitFile) docData.healthPermit = files.healthPermitFile[0].path;
        if (files.stateOrCityLicenseFile) docData.stateOrCityLicense = files.stateOrCityLicenseFile[0].path;
        if (files.proofOfAddressFile) docData.proofOfAddress = files.proofOfAddressFile[0].path;
        if (files.ownerGovernmentID) docData.ownerGovernmentID = files.ownerGovernmentID[0].path;

        const doc = await ProviderDocument.findOneAndUpdate(
            { providerId: new Types.ObjectId(providerId) },
            { $set: docData },
            { new: true, upsert: true }
        );

        await ProviderProfile.findOneAndUpdate(
            { providerId: new Types.ObjectId(providerId) },
            { verificationStatus: 'PENDING', isVerify: false }
        );

        return {
            message: 'Documents uploaded successfully.',
            data: { documentStatus: 'pending' },
        };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 6A: Admin - Get Pending Providers
    // ──────────────────────────────────────────────────────────
    async getPendingProviders(query: any) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter: any = { verificationStatus: query.verificationStatus || 'PENDING' };

        const [profiles, total] = await Promise.all([
            ProviderProfile.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({ path: 'providerId', select: 'fullName email phone' })
                .lean(),
            ProviderProfile.countDocuments(filter),
        ]);

        const providers = await Promise.all(
            profiles
                .filter((p: any) => p.providerId)
                .map(async (profile: any) => {
                    const doc = await ProviderDocument.findOne({ providerId: profile.providerId._id }).lean();
                    return {
                        id: profile.providerId._id,
                        ownerName: profile.providerId.fullName,
                        ownerEmail: profile.providerId.email,
                        restaurantName: profile.restaurantName || 'N/A',
                        phoneNumber: profile.phoneNumber || profile.providerId.phone || 'N/A',
                        address: profile.restaurantAddress || 'N/A',
                        verificationStatus: profile.verificationStatus,
                        documentStatus: doc?.documentStatus || 'not_submitted',
                        submittedAt: profile.updatedAt,
                        documents: doc || null,
                    };
                })
        );

        return {
            providers,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalProviders: total,
            },
        };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 6B: Admin - Get Provider Verification Details
    // ──────────────────────────────────────────────────────────
    async getProviderVerificationDetails(providerId: string) {
        const pId = new Types.ObjectId(providerId);
        const [user, profile, doc] = await Promise.all([
            User.findById(pId).lean(),
            ProviderProfile.findOne({ providerId: pId }).lean(),
            ProviderDocument.findOne({ providerId: pId }).lean(),
        ]);

        if (!user) throw new AppError('Provider not found', 404);

        return { user, profile, documents: doc };
    }

    // ──────────────────────────────────────────────────────────
    // STEP 6C/D: Admin - Approve or Reject Provider
    // ──────────────────────────────────────────────────────────
    async verifyProvider(providerId: string, adminId: string, action: string, rejectionReason?: string, adminNotes?: string) {
        const pId = new Types.ObjectId(providerId);

        const user = await User.findById(pId);
        if (!user) throw new AppError('Provider not found', 404);

        const doc = await ProviderDocument.findOne({ providerId: pId });
        if (!doc) throw new AppError('No documents found', 400);

        if (action === 'approve') {
            user.isProviderApproved = true;
            user.providerApprovedAt = new Date();
            user.providerApprovedBy = adminId;
            await user.save();

            doc.documentStatus = 'approved';
            doc.reviewedBy = new Types.ObjectId(adminId);
            doc.reviewedAt = new Date();
            doc.adminNotes = adminNotes || '';
            await doc.save();

            await ProviderProfile.findOneAndUpdate(
                { providerId: pId },
                { verificationStatus: 'APPROVED', isVerify: true }
            );

            await sendEmail({
                email: user.email,
                subject: 'EMDR - Restaurant Approved!',
                message: 'Congratulations! Your restaurant has been approved.',
            });

            return { message: 'Provider approved successfully' };
        } else if (action === 'reject') {
            if (!rejectionReason) throw new AppError('Rejection reason required', 400);

            user.isProviderApproved = false;
            await user.save();

            doc.documentStatus = 'rejected';
            doc.rejectionReason = rejectionReason;
            doc.reviewedBy = new Types.ObjectId(adminId);
            doc.reviewedAt = new Date();
            await doc.save();

            await ProviderProfile.findOneAndUpdate(
                { providerId: pId },
                { verificationStatus: 'REJECTED', isVerify: false }
            );

            await sendEmail({
                email: user.email,
                subject: 'EMDR - Application Update',
                message: `Application rejected: ${rejectionReason}`,
            });

            return { message: 'Provider rejected' };
        }
        throw new AppError('Invalid action', 400);
    }

    // ──────────────────────────────────────────────────────────
    // STEP 7: Check Onboarding Status
    // ──────────────────────────────────────────────────────────
    async getOnboardingStatus(providerId: string) {
        const pId = new Types.ObjectId(providerId);
        const [user, profile, doc] = await Promise.all([
            User.findById(pId).lean(),
            ProviderProfile.findOne({ providerId: pId }).lean(),
            ProviderDocument.findOne({ providerId: pId }).lean(),
        ]);

        if (!user) throw new AppError('User not found', 404);

        return {
            userId: user._id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            isProviderApproved: user.isProviderApproved || false,
            verificationStatus: profile?.verificationStatus || 'PENDING',
            documentStatus: doc?.documentStatus || 'not_submitted',
        };
    }
}

export default new ProviderOnboardingService();
