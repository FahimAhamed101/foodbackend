import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';
import adminPaymentMethodController from '../controllers/adminPaymentMethod.controller';

const router = Router();

// Secure all routes: Admin ONLY
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

/**
 * Platform-wide Payment Method Management
 */
router.get('/', adminPaymentMethodController.getAll);           // List all methods
router.post('/', adminPaymentMethodController.create);          // Create for a user
router.patch('/:id', adminPaymentMethodController.update);      // Update details
router.delete('/:id', adminPaymentMethodController.delete);     // Remove record

export default router;
