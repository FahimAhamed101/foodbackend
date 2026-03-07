import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';
import adminDashboardController from '../controllers/adminDashboard.controller';
import reviewController from '../controllers/review.controller';

const router = Router();

// Secure all routes with JWT and Admin Role
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * 1️⃣ API 1: Orders & Analytics Overview
 * GET /api/admin/analytics
 */
router.get('/analytics', adminDashboardController.getAnalytics);

/**
 * 2️⃣ API 2: Customer Feedback
 * GET /api/admin/feedback
 */
router.get('/feedback', adminDashboardController.getFeedback);

/**
 * 3️⃣ API 3: Top Performing Restaurants
 * GET /api/admin/top-restaurants
 */
router.get('/top-restaurants', adminDashboardController.getTopRestaurants);

/**
 * 4️⃣ API 4: Dashboard Detailed Stats (for charts)
 * GET /api/admin/detailed-stats?timeRange=today|week|month|year
 */
router.get('/detailed-stats', adminDashboardController.getDetailedStats);

/**
 * 5️⃣ API 5: All Reviews (Platform-wide)
 * GET /api/v1/admin/reviews
 */
router.get('/reviews', reviewController.getAllReviews);

export default router;
