import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import adminDashboardService from '../services/adminDashboard.service';
import AppError from '../utils/AppError';

class AdminDashboardController {

    getAnalytics = catchAsync(async (req: Request, res: Response) => {
        const { providerId } = req.query;

        if (!providerId) {
            throw new AppError('providerId query parameter is required', 400);
        }

        const data = await adminDashboardService.getAnalyticsOverview(providerId as string);

        res.status(200).json({
            success: true,
            ...data
        });
    });


    getFeedback = catchAsync(async (req: Request, res: Response) => {
        const { providerId } = req.query;

        if (!providerId) {
            throw new AppError('providerId query parameter is required', 400);
        }

        const data = await adminDashboardService.getCustomerFeedback(providerId as string);

        res.status(200).json({
            success: true,
            ...data
        });
    });


    getTopRestaurants = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;

        const data = await adminDashboardService.getTopPerformingRestaurants(page, limit);

        res.status(200).json({
            success: true,
            TopPerformingRestaurants: data
        });
    });

    /**
     * GET /api/admin/detailed-stats?timeRange=today|week|month|year
     */
    getDetailedStats = catchAsync(async (req: Request, res: Response) => {
        const { timeRange = 'today', startDate, endDate } = req.query;

        const data = await adminDashboardService.getDashboardDetailedStats(
            timeRange as string,
            startDate as string,
            endDate as string
        );

        res.status(200).json({
            success: true,
            data
        });
    });
}

export default new AdminDashboardController();
