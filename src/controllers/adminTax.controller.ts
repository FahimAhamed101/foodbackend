import { Request, Response, NextFunction } from 'express';
import adminTaxService from '../services/adminTax.service';

class AdminTaxController {
    /**
     * Get the tax dashboard with stats and rules list
     */
    async getDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const dashboard = await adminTaxService.getTaxDashboard();
            res.status(200).json({
                success: true,
                data: dashboard
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new state tax rule
     */
    async createRule(req: Request, res: Response, next: NextFunction) {
        try {
            const rule = await adminTaxService.createTaxRule(req.body);
            res.status(201).json({
                success: true,
                message: 'Tax rule created successfully',
                data: rule
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update an existing tax rule
     */
    async updateRule(req: Request, res: Response, next: NextFunction) {
        try {
            const rule = await adminTaxService.updateTaxRule(req.params.id as string, req.body);
            res.status(200).json({
                success: true,
                message: 'Tax rule updated successfully',
                data: rule
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a tax rule
     */
    async deleteRule(req: Request, res: Response, next: NextFunction) {
        try {
            await adminTaxService.deleteTaxRule(req.params.id as string);
            res.status(200).json({
                success: true,
                message: 'Tax rule deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AdminTaxController();
