import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import adminOrderController from '../controllers/adminOrder.controller';
import { UserRole } from '../models/user.model';

const router = Router();

// Protect all routes
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * GET /admin/orders/:orderId
 * Get full order details by orderId only (no providerId needed)
 */
router.get('/:providerId/:orderId', adminOrderController.getOrderDetails);

/**
 * GET /admin/orders/:providerId/:orderId
 * Get full order details by providerId and orderId
 */
router.get('/:orderId', adminOrderController.getOrderDetails);

export default router;
