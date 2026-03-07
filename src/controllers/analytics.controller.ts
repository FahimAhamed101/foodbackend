import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import analyticsService from '../services/analytics.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

class AnalyticsController {

    getInsights = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const insights = await analyticsService.getProviderInsights(providerId);

        res.status(200).json({
            status: 'success',
            data: insights,
        });
    });


    getOverview = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const data = await analyticsService.getOverview(providerId);
        res.status(200).json({ status: 'success', data });
    });

    getRevenue = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const data = await analyticsService.getRevenuePerformance(providerId);
        res.status(200).json({ status: 'success', data });
    });


    getOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const data = await analyticsService.getOrderDistribution(providerId);
        res.status(200).json({ status: 'success', data });
    });


    getUserDistribution = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const data = await analyticsService.getUserDistribution(providerId);
        res.status(200).json({ status: 'success', data });
    });


    getCategoryMix = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const data = await analyticsService.getCategoryMix(providerId);
        res.status(200).json({ status: 'success', data });
    });


    getHourlyActivity = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const data = await analyticsService.getHourlyActivity(providerId);
        res.status(200).json({ status: 'success', data });
    });
}

export default new AnalyticsController();
