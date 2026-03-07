import express from 'express';
import adminAnalyticsController from '../controllers/adminAnalytics.controller';
import adminDashboardController from '../controllers/adminDashboard.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { analyticsQuerySchema, recentOrdersQuerySchema } from '../validations/adminAnalytics.validation';

const router = express.Router();

// All analytics routes require admin authentication
router.use(authenticate);
router.use(requireRole(['ADMIN']));

router.get('/', adminDashboardController.getAnalytics);

router.get('/overview', validate(analyticsQuerySchema), adminAnalyticsController.getOverview);
router.get('/revenue', validate(analyticsQuerySchema), adminAnalyticsController.getRevenueAnalytics);
router.get('/orders', validate(analyticsQuerySchema), adminAnalyticsController.getOrderAnalytics);
router.get('/recent-orders', validate(recentOrdersQuerySchema), adminAnalyticsController.getRecentOrders);
router.get('/recent-reviews', adminAnalyticsController.getRecentReviews);
router.get('/trending-menus', validate(analyticsQuerySchema), adminAnalyticsController.getTrendingMenus);
router.get('/top-restaurants', validate(analyticsQuerySchema), adminAnalyticsController.getTopRestaurants);
router.get('/master', validate(analyticsQuerySchema), adminAnalyticsController.getMasterAnalytics);
router.get('/reports', validate(analyticsQuerySchema), adminAnalyticsController.getAnalyticsReports);

export default router;
