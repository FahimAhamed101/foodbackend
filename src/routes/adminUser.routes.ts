import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';
import adminUserController from '../controllers/adminUser.controller';

const router = Router();

// Protect all routes - Admin only
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * GET /api/v1/admin/users/customers
 * List all users with CUSTOMER role
 */
router.get('/customers', adminUserController.getCustomers);

/**
 * GET /api/v1/admin/users/providers
 * List all users with PROVIDER role
 */
router.get('/providers', adminUserController.getProviders);

router.patch('/:userId/block', adminUserController.blockUser);
router.patch('/:userId/unblock', adminUserController.unblockUser);

export default router;
