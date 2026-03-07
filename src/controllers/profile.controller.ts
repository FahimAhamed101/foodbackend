import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import profileService from '../services/profile.service';
import { catchAsync } from '../utils/catchAsync';

class ProfileController {
    /**
     * Get My Profile
     */
    getProfile = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const profile = await profileService.getProfile(userId);

        res.status(200).json({
            success: true,
            data: profile,
        });
    });

    /**
     * Update My Profile
     */
    updateProfile = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const updateData = { ...req.body };

        if (req.file) {
            updateData.profilePic = req.file.path;
        }

        const profile = await profileService.updateProfile(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile,
        });
    });

    /**
     * Delete My Profile (Soft Delete)
     */
    deleteProfile = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        await profileService.deleteProfile(userId);

        res.status(200).json({
            success: true,
            message: 'Profile deactivated successfully',
        });
    });
}

export default new ProfileController();
