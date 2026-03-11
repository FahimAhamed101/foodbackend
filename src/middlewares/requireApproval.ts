import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import AppError from '../utils/AppError';
import { User, UserRole } from '../models/user.model';
import { ProviderProfile } from '../models/providerProfile.model';

/**
 * Middleware to restrict access to approved providers.
 * Must be used AFTER the authenticate middleware.
 */
export const requireApproval = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return next(new AppError('Authentication required', 401, 'AUTH_ERROR'));
        }

        // If not a provider, skip approval check (e.g. Admin or Customer)
        if (req.user.role !== UserRole.PROVIDER) {
            return next();
        }

        // Fetch user from DB to get the latest approval status
        const user = await User.findById(req.user.userId);

        if (!user) {
            return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
        }

        if (!user.isProviderApproved) {
            // Backward-compatibility sync:
            // Some legacy admin approval paths marked only ProviderProfile as approved.
            const profile = await ProviderProfile.findOne({ providerId: user._id }).select('verificationStatus status isActive');
            const profileIndicatesApproved =
                profile?.verificationStatus === 'APPROVED' &&
                profile?.status !== 'BLOCKED' &&
                profile?.isActive !== false;

            if (profileIndicatesApproved) {
                user.isProviderApproved = true;
                user.providerApprovedAt = user.providerApprovedAt || new Date();
                user.providerApprovedBy = user.providerApprovedBy || 'approval-sync';
                await user.save({ validateBeforeSave: false });
                return next();
            }

            return next(new AppError(
                'Your restaurant application is not yet approved. Please complete your registration and wait for admin approval.',
                403,
                'PROVIDER_NOT_APPROVED'
            ));
        }

        next();
    } catch (error) {
        next(error);
    }
};
