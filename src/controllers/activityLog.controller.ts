import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import activityLogService from '../services/activityLog.service';
import { UserRole } from '../models/user.model';

class ActivityLogController {
    /**
     * Get activities based on user role
     */
    getRecentActivities = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const user = (req as any).user;

        let result;
        if (user.role === UserRole.ADMIN) {
            // Admin sees everything
            result = await activityLogService.getGlobalActivities(page, limit);
        } else if (user.role === UserRole.PROVIDER) {
            // Provider sees their restaurant's activities
            result = await activityLogService.getProviderActivities(user.id, page, limit);
        } else {
            // Customers (for now just their own)
            result = await activityLogService.getGlobalActivities(page, limit, { userId: user.id });
        }

        res.status(200).json({
            success: true,
            data: result.activities,
            pagination: result.pagination
        });
    });
}

export default new ActivityLogController();
