import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import paymentMethodController from '../controllers/paymentMethod.controller';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';

import { validate } from '../middlewares/validate';
import { addPaymentMethodSchema, paymentMethodIdSchema } from '../validations/paymentMethod.validation';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Restricted to CUSTOMER only as per user request
router.use(requireRole([UserRole.CUSTOMER]));

router.get('/', paymentMethodController.getMethods);
router.post('/', validate(addPaymentMethodSchema), paymentMethodController.addMethod);
router.patch('/:id/default', validate(paymentMethodIdSchema), paymentMethodController.setDefault);
router.delete('/:id', validate(paymentMethodIdSchema), paymentMethodController.deleteMethod);

export default router;
