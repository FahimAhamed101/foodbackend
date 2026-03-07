import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import adminTaxController from '../controllers/adminTax.controller';
import { UserRole } from '../models/user.model';

const router = express.Router();

// All routes require ADMIN role
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * @route GET /api/v1/admin/tax/dashboard
 * @desc Get tax statistics and list of rules
 */
router.get('/dashboard', adminTaxController.getDashboard);

/**
 * @route POST /api/v1/admin/tax/rules
 * @desc Create new state tax rule
 */
router.post('/rules', adminTaxController.createRule);

/**
 * @route PATCH /api/v1/admin/tax/rules/:id
 * @desc Update existing tax rule
 */
router.patch('/rules/:id', adminTaxController.updateRule);

/**
 * @route DELETE /api/v1/admin/tax/rules/:id
 * @desc Delete a tax rule
 */
router.delete('/rules/:id', adminTaxController.deleteRule);

export default router;
