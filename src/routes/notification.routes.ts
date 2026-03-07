import express from 'express';
import rateLimit from 'express-rate-limit';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';

const router = express.Router();

const notificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many notification requests, please try again later',
    },
});

router.use(authenticate);
router.use(notificationLimiter);

router.get('/', requireRole(['CUSTOMER', 'PROVIDER']), notificationController.getNotifications);
router.patch('/:id/read', requireRole(['CUSTOMER', 'PROVIDER']), notificationController.markAsRead);

export default router;
