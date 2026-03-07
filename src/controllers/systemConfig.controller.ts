import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import systemConfigService from '../services/systemConfig.service';
import AppError from '../utils/AppError';

class SystemConfigController {
    /**
     * GET /api/v1/config/logo
     * Publicly accessible logo URL
     */
    getLogo = catchAsync(async (req: Request, res: Response) => {
        const logo = await systemConfigService.getAppLogo();
        res.status(200).json({
            success: true,
            logo: logo || ''
        });
    });

    /**
     * POST /api/v1/admin/config/logo
     * Admin only: Update logo
     */
    updateLogo = catchAsync(async (req: Request, res: Response) => {
        const { logoUrl } = req.body;

        if (!logoUrl) {
            throw new AppError('Logo URL is required', 400);
        }

        const config = await systemConfigService.updateAppLogo(logoUrl);

        res.status(200).json({
            success: true,
            message: 'App logo updated successfully',
            data: config
        });
    });

    /**
     * DELETE /api/v1/admin/config/logo
     */
    deleteLogo = catchAsync(async (req: Request, res: Response) => {
        await systemConfigService.deleteAppLogo();
        res.status(200).json({
            success: true,
            message: 'App logo deleted successfully'
        });
    });

    /**
     * GET /api/v1/config/platform-fee
     */
    getPlatformFee = catchAsync(async (req: Request, res: Response) => {
        const fee = await systemConfigService.getPlatformFeeConfig();
        res.status(200).json({
            success: true,
            data: fee
        });
    });

    updatePlatformFee = catchAsync(async (req: Request, res: Response) => {
        const { type, value } = req.body;

        if (!type || value === undefined) {
            throw new AppError('Fee type (fixed|percentage) and value are required', 400);
        }

        const config = await systemConfigService.updatePlatformFee(type, value);

        res.status(200).json({
            success: true,
            message: 'Platform fee updated successfully',
            data: config
        });
    });

    /**
     * DELETE /api/v1/admin/config/platform-fee
     */
    deletePlatformFee = catchAsync(async (req: Request, res: Response) => {
        await systemConfigService.deletePlatformFee();
        res.status(200).json({
            success: true,
            message: 'Platform fee setting deleted successfully'
        });
    });

    /**
     * GET /api/v1/config/restaurant-dashboard-permissions
     */
    getRestaurantDashboardPermissions = catchAsync(async (req: Request, res: Response) => {
        const permissions = await systemConfigService.getRestaurantDashboardPermissions();
        res.status(200).json({
            success: true,
            data: permissions
        });
    });

    /**
     * PATCH /api/v1/admin/config/restaurant-dashboard-permissions
     */
    updateRestaurantDashboardPermissions = catchAsync(async (req: Request, res: Response) => {
        const { showUserDistributionByCity } = req.body;

        if (showUserDistributionByCity === undefined) {
            throw new AppError('showUserDistributionByCity field is required', 400);
        }

        const config = await systemConfigService.updateRestaurantDashboardPermissions({
            showUserDistributionByCity
        });

        res.status(200).json({
            success: true,
            message: 'Restaurant dashboard permissions updated successfully',
            data: config
        });
    });

    /**
     * GET /api/v1/config/public
     * Get all public settings
     */
    getPublicSettings = catchAsync(async (req: Request, res: Response) => {
        const settings = await systemConfigService.getAllPublicSettings();
        res.status(200).json({
            success: true,
            data: settings
        });
    });
}

export default new SystemConfigController();
