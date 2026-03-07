import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import providerProfileService from '../services/providerProfile.service';
import { catchAsync } from '../utils/catchAsync';

class ProviderProfileController {

    /**
     * Get My Provider Profile
     */
    getProfile = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const profile = await providerProfileService.getProfile(providerId);

        res.status(200).json({
            success: true,
            data: profile,
        });
    });

    /**
     * Update My Provider Profile
     */
    updateProfile = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const updateData = { ...req.body };

        if (req.file) {
            updateData.profile = req.file.path;
        }

        const profile = await providerProfileService.updateProfile(providerId, updateData);

        res.status(200).json({
            success: true,
            message: 'Provider profile updated successfully',
            data: profile,
        });
    });

    /**
     * Delete My Provider Profile (Soft Delete)
     */
    deleteProfile = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        await providerProfileService.deleteProfile(providerId);

        res.status(200).json({
            success: true,
            message: 'Provider profile deactivated successfully',
        });
    });
}

export default new ProviderProfileController();
