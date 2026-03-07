import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import adminUserService from '../services/adminUser.service';
import { UserRole } from '../models/user.model';

class AdminUserController {
    getCustomers = catchAsync(async (req: Request, res: Response) => {
        const filters = {
            status: req.query.status as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            role: UserRole.CUSTOMER
        };

        const result = await adminUserService.getUsersByRole(filters);

        res.status(200).json({
            success: true,
            ...result,
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    });

    getProviders = catchAsync(async (req: Request, res: Response) => {
        const filters = {
            status: req.query.status as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            role: UserRole.PROVIDER
        };

        const result = await adminUserService.getUsersByRole(filters);

        res.status(200).json({
            success: true,
            ...result,
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    });

    blockUser = catchAsync(async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await adminUserService.blockUser(userId as string, reason || 'No reason provided');

        res.status(200).json({
            success: true,
            message: 'User blocked successfully',
            data: user
        });
    });

    unblockUser = catchAsync(async (req: Request, res: Response) => {
        const { userId } = req.params;

        const user = await adminUserService.unblockUser(userId as string);

        res.status(200).json({
            success: true,
            message: 'User unblocked successfully',
            data: user
        });
    });
}

export default new AdminUserController();
