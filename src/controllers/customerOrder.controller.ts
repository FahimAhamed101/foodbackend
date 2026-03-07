import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import customerOrderService from '../services/customerOrder.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

class CustomerOrderController {
  
    getCurrentOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const customerId = req.user!.userId;
        const orders = await customerOrderService.getCurrentOrders(customerId);

        res.status(200).json({
            success: true,
            data: orders
        });
    });

    
    getPreviousOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const customerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
            throw new AppError('Invalid pagination parameters', 400, 'INVALID_PAGINATION');
        }

        const { orders, total, page: currentPage, limit: currentLimit } =
            await customerOrderService.getPreviousOrders(customerId, page, limit);

        res.status(200).json({
            success: true,
            meta: {
                total,
                page: currentPage,
                limit: currentLimit
            },
            data: orders
        });
    });
}

export default new CustomerOrderController();
