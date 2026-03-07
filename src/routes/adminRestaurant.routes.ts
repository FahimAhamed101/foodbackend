import express from 'express';
import adminRestaurantController from '../controllers/adminRestaurant.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';

const router = express.Router();

// Middleware: Authenticated Admin Only
router.use(authenticate, requireRole([UserRole.ADMIN]));

// Dashboard Stats & Activity
router.get('/dashboard/stats/:restaurantId', adminRestaurantController.getDashboardStats);
router.get('/dashboard/activity-summary/:restaurantId', adminRestaurantController.getActivitySummary);

// Restaurant Management
router.get('/restaurants/:restaurantId/profile', adminRestaurantController.getProfile);
router.get('/restaurants/:restaurantId/pickup-windows', adminRestaurantController.getPickupWindows);
router.get('/restaurants/:restaurantId/compliance', adminRestaurantController.getCompliance);
router.get('/restaurants/:restaurantId/location', adminRestaurantController.getLocation);
router.post('/restaurants/:restaurantId/block', adminRestaurantController.blockRestaurant);
router.post('/restaurants/:restaurantId/unblock', adminRestaurantController.unblockRestaurant);
router.post('/restaurants/:restaurantId/approve', adminRestaurantController.approveRestaurant);
router.post('/restaurants/:restaurantId/reject', adminRestaurantController.rejectRestaurant);

// Provider Orders
router.get('/providers/:providerId/orders', adminRestaurantController.getProviderOrderHistory);

// Provider Reviews
router.get('/providers/:providerId/reviews', adminRestaurantController.getProviderReviews);

// Core Restaurant Management
router.get('/restaurants', adminRestaurantController.getAllRestaurants);
router.get('/restaurants/:restaurantId', adminRestaurantController.getRestaurantDetails);

export default router;
