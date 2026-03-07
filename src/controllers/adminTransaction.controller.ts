import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import adminTransactionService from '../services/adminTransaction.service';

class AdminTransactionController {
    /**
     * GET /admin/transactions-orders/
     * OR /admin/transactions-orders/:providerId
     * 
     * Get transaction & order analytics (global or specific provider)
     */
    getTransactionsDashboard = catchAsync(async (req: Request, res: Response) => {
        const providerId = req.params.providerId || req.query.providerId; // Check both
        const page = parseInt(String(req.query.page || '1'), 10);
        const limit = parseInt(String(req.query.limit || '20'), 10);
        const statusQuery = req.query.status;
        const status = typeof statusQuery === 'string' ? statusQuery : undefined;

        const timeRangeQuery = req.query.timeRange;
        const timeRange = typeof timeRangeQuery === 'string' ? timeRangeQuery : undefined;

        const startDateQuery = req.query.startDate;
        const startDate = typeof startDateQuery === 'string' ? startDateQuery : undefined;

        const endDateQuery = req.query.endDate;
        const endDate = typeof endDateQuery === 'string' ? endDateQuery : undefined;

        const result = await adminTransactionService.getTransactions(
            providerId as string,
            page,
            limit,
            status,
            timeRange,
            startDate,
            endDate
        );

        res.status(200).json({
            success: true,
            restaurantsid: result.restaurantsid,
            restaurantsName: result.restaurantsName,
            summary: result.summary,
            pagination: result.pagination,
            transactions: result.transactions
        });
    });
}

export default new AdminTransactionController();
