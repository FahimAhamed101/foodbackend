import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import adminCustomerController from '../controllers/adminCustomer.controller';
import { UserRole } from '../models/user.model';

const router = Router();

// Protect all routes
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * GET /admin/customers/dashboard/customersAll
 * 
 * Get detailed list of all restaurants (customers)
 */
router.get('/dashboard/customersAll', adminCustomerController.getAllRestaurantsDashboard);

/**
 * GET /admin/customers/dashboard/admin/:customerId/profile
 * 
 * Get detailed customer profile for admin dashboard
 */
router.get('/dashboard/admin/:customerId/profile', adminCustomerController.getCustomerProfileDashboard);

/**
 * GET /admin/customers/dashboard/:customerId
 * 
 * Get customer activity dashboard
 */
router.get('/dashboard/:customerId', adminCustomerController.getCustomerDashboard);

export default router;
