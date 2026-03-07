import { Request, Response, NextFunction } from 'express';
import complianceService from '../services/compliance.service';
import { AuthRequest } from '../middlewares/authenticate';
import { catchAsync } from '../utils/catchAsync';

class ComplianceController {
    /**
     * Admin: Get all violations
     */
    getViolations = catchAsync(async (req: Request, res: Response) => {
        const data = await complianceService.getAdminViolations(req.query);
        res.status(200).json({
            success: true,
            data
        });
    });

    /**
     * Admin: Action (Warn/Remove)
     */
    takeAction = catchAsync(async (req: Request, res: Response) => {
        const { action } = req.body;
        const result = await complianceService.handleViolationAction(req.params.id as string, action);
        res.status(200).json({
            success: true,
            message: `Violation action '${action}' applied successfully`,
            data: result
        });
    });
}

export default new ComplianceController();
