import { Router } from 'express';
import systemConfigController from '../controllers/systemConfig.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';

const router = Router();

/**
 * PUBLIC ROUTES
 */
router.get('/logo', systemConfigController.getLogo);
router.get('/platform-fee', systemConfigController.getPlatformFee);
router.get('/public', systemConfigController.getPublicSettings);
router.get('/restaurant-dashboard-permissions', systemConfigController.getRestaurantDashboardPermissions);

/**
 * ADMIN ONLY ROUTES
 */
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

router.post('/logo', systemConfigController.updateLogo);
router.patch('/logo', systemConfigController.updateLogo);
router.delete('/logo', systemConfigController.deleteLogo);

router.post('/platform-fee', systemConfigController.updatePlatformFee);
router.patch('/platform-fee', systemConfigController.updatePlatformFee);
router.delete('/platform-fee', systemConfigController.deletePlatformFee);

router.patch('/restaurant-dashboard-permissions', systemConfigController.updateRestaurantDashboardPermissions);

export default router;
