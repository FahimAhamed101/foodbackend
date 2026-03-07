import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import adminCustomerService from '../services/adminCustomer.service';
import adminRestaurantService from '../services/adminRestaurant.service';

class AdminCustomerController {

    getCustomerDashboard = catchAsync(async (req: Request, res: Response) => {
        const { customerId } = req.params;
        const page = parseInt(String(req.query.page || '1'), 10);
        const limit = parseInt(String(req.query.limit || '10'), 10);

        if (!customerId) {
            throw new AppError('Customer ID is required', 400);
        }

        const result = await adminCustomerService.getCustomerDashboard(
            customerId as string,
            page,
            limit
        );

        res.status(200).json({
            success: true,
            CustomarId: result.CustomarId,
            CustomarName: result.CustomarName,
            summary: result.summary,
            pagination: result.pagination,
            orders: result.orders
        });
    });

    getAllRestaurantsDashboard = catchAsync(async (req: Request, res: Response) => {
        const result = await adminRestaurantService.getAllRestaurantsDetailed(req.query);

        res.status(200).json({
            success: true,
            ...result
        });
    });

    getCustomerProfileDashboard = catchAsync(async (req: Request, res: Response) => {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError('Customer ID is required', 400);
        }

        const result = await adminCustomerService.getCustomerProfileDashboard(customerId as string);

        res.status(200).json({
            success: true,
            ...result
        });
    });
}

export default new AdminCustomerController();
