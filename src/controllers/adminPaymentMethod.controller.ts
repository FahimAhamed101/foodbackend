import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import adminPaymentMethodService from '../services/adminPaymentMethod.service';
import AppError from '../utils/AppError';

class AdminPaymentMethodController {
    /**
     * GET /api/v1/admin/payment-methods
     */
    getAll = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;

        const data = await adminPaymentMethodService.getAllPaymentMethods(page, limit, search);

        res.status(200).json({
            success: true,
            data
        });
    });

    /**
     * POST /api/v1/admin/payment-methods
     */
    create = catchAsync(async (req: Request, res: Response) => {
        const { userId, cardholderName, brand, last4, expiryDate, isDefault } = req.body;

        if (!userId || !cardholderName || !last4 || !expiryDate) {
            throw new AppError('userId, cardholderName, last4, and expiryDate are required', 400);
        }

        const method = await adminPaymentMethodService.createPaymentMethod({
            userId,
            cardholderName,
            brand,
            last4,
            expiryDate,
            isDefault
        });

        res.status(201).json({
            success: true,
            message: 'Payment method created successfully',
            data: method
        });
    });

    /**
     * PATCH /api/v1/admin/payment-methods/:id
     */
    update = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const method = await adminPaymentMethodService.updatePaymentMethod(id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Payment method updated successfully',
            data: method
        });
    });

    /**
     * DELETE /api/v1/admin/payment-methods/:id
     */
    delete = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await adminPaymentMethodService.deletePaymentMethod(id as string);

        res.status(200).json({
            success: true,
            ...result
        });
    });
}

export default new AdminPaymentMethodController();
