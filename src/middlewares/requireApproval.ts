import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import AppError from '../utils/AppError';
import { User, UserRole } from '../models/user.model';

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
