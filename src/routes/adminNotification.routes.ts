import express from 'express';
import adminNotificationController from '../controllers/adminNotification.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';

const router = express.Router();

// All routes here are admin only
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * @route GET /api/v1/admin/notifications
 * @desc Get all notifications on platform
 */
router.get('/', adminNotificationController.getAllNotifications);

/**
 * @route POST /api/v1/admin/notifications/broadcast
 * @desc Send a mass notification to users
 */
router.post('/broadcast', adminNotificationController.broadcastNotification);

/**
 * @route DELETE /api/v1/admin/notifications/:id
 * @desc Delete a specific notification
 */
router.delete('/:id', adminNotificationController.deleteNotification);

export default router;
