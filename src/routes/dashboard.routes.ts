import express from 'express';
import rateLimit from 'express-rate-limit';
import dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';

const router = express.Router();

const dashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many requests to dashboard, please try again later',
    },
});

router.use(authenticate);
router.use(requireRole(['PROVIDER']));
router.use(dashboardLimiter);
router.get('/', dashboardController.getUnifiedDashboard);
router.get('/overview', dashboardController.getOverview);
router.get('/revenue-analytics', dashboardController.getRevenueAnalytics);
router.get('/popular-dishes', dashboardController.getPopularDishes);
router.get('/recent-orders', dashboardController.getRecentOrders);

export default router;
