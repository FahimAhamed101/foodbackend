import { Router } from 'express';
import stripeController from '../controllers/stripe.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import {
    createPaymentIntentSchema,
    refundSchema,
    paymentStatusSchema,
} from '../validations/stripe.validation';

const router = Router();

/**
 * Public endpoint - Get Stripe config (publishable key)
 */
router.get('/config', stripeController.getConfig);

/**
 * Webhook endpoint - NO authentication (Stripe signature verification instead)
 * IMPORTANT: This must be registered BEFORE express.json() middleware
 * See app.ts for raw body handling
 */
router.post('/webhook', stripeController.handleWebhook);

/**
 * Customer endpoints - Create payment intent
 */
router.post(
    '/create-payment-intent',
    authenticate,
    requireRole(['CUSTOMER']),
    validate(createPaymentIntentSchema),
    stripeController.createPaymentIntent
);

/**
 * Customer endpoints - Get payment status
 */
router.get(
    '/payment-status/:paymentIntentId',
    authenticate,
    validate(paymentStatusSchema),
    stripeController.getPaymentStatus
);

/**
 * Admin/Provider endpoints - Create refund
 */
router.post(
    '/refund',
    authenticate,
    requireRole(['ADMIN', 'PROVIDER']),
    validate(refundSchema),
    stripeController.createRefund
);

export default router;
