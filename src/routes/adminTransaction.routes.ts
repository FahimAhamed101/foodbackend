import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import adminTransactionController from '../controllers/adminTransaction.controller';
import { UserRole } from '../models/user.model';

const router = Router();

// Protect all routes
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * GET /admin/transactions-orders/
 * GET /admin/transactions-orders/:providerId
 * 
 * Get transactions & orders dashboard (global or provider-specific)
 */
router.get('/', adminTransactionController.getTransactionsDashboard);
router.get('/:providerId', adminTransactionController.getTransactionsDashboard);

export default router;
