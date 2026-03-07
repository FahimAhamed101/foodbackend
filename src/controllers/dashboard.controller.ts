import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import dashboardService from '../services/dashboard.service';
import { catchAsync } from '../utils/catchAsync';

class DashboardController {
    getOverview = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const stats = await dashboardService.getDashboardOverview(providerId);

        res.status(200).json({
            success: true,
            data: stats,
        });
    });

    getRevenueAnalytics = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const analytics = await dashboardService.getRevenueAnalytics(providerId);

        res.status(200).json({
            success: true,
            data: analytics,
        });
    });

    getPopularDishes = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const dishes = await dashboardService.getPopularDishes(providerId);

        res.status(200).json({
            success: true,
            data: dishes,
        });
    });

    getRecentOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const orders = await dashboardService.getRecentOrders(providerId);

        res.status(200).json({
            success: true,
            data: orders,
        });
    });

    getUnifiedDashboard = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const dashboardData = await dashboardService.getUnifiedDashboardData(providerId);

        res.status(200).json({
            success: true,
            data: dashboardData,
        });
    });
}

export default new DashboardController();
