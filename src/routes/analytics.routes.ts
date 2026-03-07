import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import rateLimit from 'express-rate-limit';

const router = Router();
const analyticsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 50, 
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 429,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many analytics requests, please try again after 15 minutes.'
    }
});
router.get('/insights',authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getInsights);
router.get('/overview',authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getOverview);
router.get('/revenue',authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getRevenue);
router.get('/orders', authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getOrders);
router.get('/users/distribution',authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getUserDistribution);
router.get('/category-mix',authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getCategoryMix);
router.get('/hourly-activity',authenticate as any,requireRole(['PROVIDER']) as any,analyticsLimiter,analyticsController.getHourlyActivity);

export default router;
