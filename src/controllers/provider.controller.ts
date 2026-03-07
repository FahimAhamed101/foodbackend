import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import providerService from '../services/provider.service';
import { catchAsync } from '../utils/catchAsync';
import { z } from 'zod';
import AppError from '../utils/AppError';

class ProviderController {
    /**
     * Get nearby providers based on customer location
     * POST /api/v1/providers/nearby
     */
    getNearbyProviders = catchAsync(async (req: Request, res: Response) => {
        const { latitude, longitude, radius, page, limit, cuisine, sortBy } = req.body;

        const result = await providerService.getNearbyProviders({
            latitude,
            longitude,
            radius,
            page,
            limit,
            cuisine,
            sortBy
        });

        res.status(200).json({
            success: true,
            message: `Found ${result.providers.length} providers within ${radius} km`,
            data: result.providers,
            pagination: result.pagination,
            filters: {
                radius: `${radius} km`,
                cuisine: cuisine || 'all',
                sortBy
            }
        });
    });
    getCustomerDetails = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const customerId = req.params.customerId;

        if (typeof customerId !== 'string' || !customerId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new AppError('Invalid Customer ID', 400, 'VALIDATION_ERROR');
        }

        const data = await providerService.getCustomerDetails(providerId, customerId);

        res.status(200).json({
            success: true,
            data,
        });
    });

    getReadyOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await providerService.getReadyOrders(providerId, page, limit);

        res.status(200).json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    });

    getOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = (req.query.status as string) || 'all';

        const result = await providerService.getOrders(providerId, page, limit, status);

        res.status(200).json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    });
}

export default new ProviderController();
