import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import paymentMethodService from '../services/paymentMethod.service';
import { catchAsync } from '../utils/catchAsync';

class PaymentMethodController {
    /**
     * GET /api/v1/payment-methods
     */
    getMethods = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const methods = await paymentMethodService.getPaymentMethods(userId);

        res.status(200).json({
            success: true,
            data: methods
        });
    });

    /**
     * POST /api/v1/payment-methods
     */
    addMethod = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const method = await paymentMethodService.addPaymentMethod(userId, req.body);

        res.status(201).json({
            success: true,
            message: 'Payment method added successfully',
            data: method
        });
    });

    /**
     * PATCH /api/v1/payment-methods/:id/default
     */
    setDefault = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const method = await paymentMethodService.setDefault(userId, req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Default payment method updated',
            data: method
        });
    });

    /**
     * DELETE /api/v1/payment-methods/:id
     */
    deleteMethod = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const result = await paymentMethodService.deletePaymentMethod(userId, req.params.id as string);

        res.status(200).json({
            success: true,
            ...result
        });
    });
}

export default new PaymentMethodController();
