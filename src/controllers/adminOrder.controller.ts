import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import adminOrderService from '../services/adminOrder.service';

class AdminOrderController {
    /**
     * GET /admin/orders/:orderId
     * GET /admin/orders/:providerId/:orderId
     */
    getOrderDetails = catchAsync(async (req: Request, res: Response) => {
        let providerId: string | null = null;
        let orderId: string;

        if (req.params.orderId) {
            // Route: /:providerId/:orderId
            providerId = req.params.providerId as string;
            orderId = req.params.orderId as string;
        } else {
            // Route: /:orderId (orderId comes as first param)
            orderId = req.params.providerId as string; // first param is actually orderId
        }

        if (!orderId) {
            throw new AppError('Order ID is required', 400);
        }

        const orderDetails = await adminOrderService.getOrderDetails(providerId, orderId);

        res.status(200).json({
            success: true,
            order: orderDetails
        });
    });
}

export default new AdminOrderController();
