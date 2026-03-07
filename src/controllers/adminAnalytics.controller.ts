import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import adminAnalyticsService from '../services/adminAnalytics.service';
import { getDateRange, TimeFilter } from '../utils/date.utils';

class AdminAnalyticsController {
    getOverview = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const metrics = await adminAnalyticsService.getOverviewMetrics(range);

        res.status(200).json({
            success: true,
            data: metrics
        });
    });

    getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const analytics = await adminAnalyticsService.getTrendAnalytics(filter as string, range, 'revenue');

        res.status(200).json({
            success: true,
            data: {
                labels: analytics.labels,
                values: analytics.values,
                totalRevenue: analytics.totalValue
            }
        });
    });

    getOrderAnalytics = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const analytics = await adminAnalyticsService.getTrendAnalytics(filter as string, range, 'orders');

        res.status(200).json({
            success: true,
            data: {
                labels: analytics.labels,
                values: analytics.values,
                totalOrders: analytics.totalOrders
            }
        });
    });

    getRecentOrders = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await adminAnalyticsService.getRecentOrders(page, limit);

        res.status(200).json({
            success: true,
            data: data.orders,
            pagination: data.pagination
        });
    });

    getRecentReviews = catchAsync(async (req: Request, res: Response) => {
        const reviews = await adminAnalyticsService.getRecentReviews();

        res.status(200).json({
            success: true,
            data: reviews
        });
    });

    getTrendingMenus = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const trendingMenus = await adminAnalyticsService.getTrendingMenus(range);

        res.status(200).json({
            status: 'success',
            data: {
                trendingMenus
            }
        });
    });

    getTopRestaurants = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const topRestaurants = await adminAnalyticsService.getTopRestaurants(range);

        res.status(200).json({
            status: 'success',
            data: {
                topRestaurants
            }
        });
    });

    getMasterAnalytics = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const data = await adminAnalyticsService.getMasterAnalytics(filter as string, range);

        res.status(200).json({
            status: 'success',
            data
        });
    });

    getAnalyticsReports = catchAsync(async (req: Request, res: Response) => {
        const { filter, startDate, endDate } = req.query;
        const range = getDateRange(filter as TimeFilter, startDate as string, endDate as string);

        const reports = await adminAnalyticsService.getAnalyticsReports(filter as string, range);

        res.status(200).json({
            success: true,
            data: reports
        });
    });
}

export default new AdminAnalyticsController();
