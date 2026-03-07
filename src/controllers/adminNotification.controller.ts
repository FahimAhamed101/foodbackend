import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../middlewares/authenticate';

class AdminNotificationController {
    /**
     * GET /api/v1/admin/notifications
     */
    getAllNotifications = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const data = await notificationService.getAllNotifications(page, limit);

        res.status(200).json({
            success: true,
            data
        });
    });

    /**
     * POST /api/v1/admin/notifications/broadcast
     */
    broadcastNotification = catchAsync(async (req: Request, res: Response) => {
        const { title, message, targetRole, type } = req.body;

        const notifications = await notificationService.broadcastNotification({
            title,
            message,
            targetRole,
            type
        });

        res.status(201).json({
            success: true,
            message: `Notification broadcasted to ${notifications.length} users`,
            count: notifications.length
        });
    });

    /**
     * DELETE /api/v1/admin/notifications/:id
     */
    deleteNotification = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        await notificationService.deleteNotification(id as string);

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    });
}

export default new AdminNotificationController();
