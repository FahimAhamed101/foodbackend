import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import stripeService from '../services/stripe.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import stripe from '../config/stripe';
import config from '../config';

class StripeController {
    /**
     * POST /api/v1/stripe/create-payment-intent
     * Create a Stripe PaymentIntent and return client_secret
     */
    createPaymentIntent = catchAsync(async (req: AuthRequest, res: Response) => {
        const customerId = req.user!.userId;
        const { providerId, items } = req.body;

        if (!providerId || !items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('providerId and items are required', 400, 'INVALID_REQUEST');
        }

        // Validate items structure
        for (const item of items) {
            if (!item.foodId || !item.quantity || item.quantity < 1) {
                throw new AppError('Each item must have foodId and quantity >= 1', 400, 'INVALID_ITEM');
            }
        }

        const result = await stripeService.createPaymentIntent({
            customerId,
            providerId,
            items,
        });

        res.status(200).json({
            success: true,
            message: 'Payment intent created successfully',
            data: {
                clientSecret: result.clientSecret,
                paymentIntentId: result.paymentIntentId,
                amount: result.amount,
                breakdown: result.breakdown,
            },
        });
    });

    /**
     * POST /api/v1/stripe/webhook
     * Handle Stripe webhook events
     * IMPORTANT: This endpoint must receive RAW body, not parsed JSON
     */
    handleWebhook = catchAsync(async (req: Request, res: Response) => {
        // Debug: Log all headers
        console.log('📋 [Stripe Webhook] Received headers:', JSON.stringify(req.headers, null, 2));
        
        const sig = req.headers['stripe-signature'];
        
        // Check for test webhook header (multiple variations)
        const testHeader = req.headers['x-test-webhook'] || 
                          req.headers['X-Test-Webhook'] ||
                          req.headers['X-TEST-WEBHOOK'];
        
        console.log('🔍 [Stripe Webhook] Test header value:', testHeader);
        
        // Also check if signature is a test signature
        const hasTestSignature = sig && (sig.includes('test_signature') || sig === 't=1234567890,v1=test_signature');
        
        const isTesting = testHeader === 'true' || testHeader === 'TRUE' || hasTestSignature;
        
        console.log('🎯 [Stripe Webhook] Is testing mode?', isTesting);

        let event: any;

        if (isTesting) {
            console.log('⚠️ [Stripe Webhook] Testing mode enabled. Bypassing signature verification...');

            // Handle raw Buffer or JSON body
            try {
                event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
                console.log('✅ [Stripe Webhook] Test event parsed successfully:', event.type);
            } catch (err) {
                console.error('❌ [Stripe Webhook] Failed to parse test body:', err);
                throw new AppError('Invalid JSON body for test webhook', 400, 'INVALID_TEST_BODY');
            }
        } else {
            console.log('🔒 [Stripe Webhook] Production mode. Verifying signature...');

            if (!sig) {
                console.error('❌ [Stripe Webhook] Missing stripe-signature header');
                throw new AppError('Missing stripe-signature header. For testing: add header "x-test-webhook: true" OR use stripe-signature: "t=1234567890,v1=test_signature"', 400, 'MISSING_SIGNATURE');
            }

            try {
                event = stripe.webhooks.constructEvent(
                    req.body,
                    sig,
                    config.stripe.webhookSecret
                );
                console.log('✅ [Stripe Webhook] Signature verified successfully');
            } catch (err: any) {
                console.error('❌ [Stripe Webhook] Signature verification failed:', err.message);
                throw new AppError(`Webhook Error: ${err.message}. For testing: add header "x-test-webhook: true" OR use stripe-signature: "t=1234567890,v1=test_signature"`, 400, 'WEBHOOK_VERIFICATION_FAILED');
            }
        }

        console.log(`✅ Received webhook event: ${event.type} (${event.id || 'test-id'})`);

        // Process event asynchronously (return 200 immediately to Stripe)
        // In production, consider using a queue (Bull, BullMQ, etc.)
        stripeService.processWebhookEvent(event).catch(err => {
            console.error('Error processing webhook event:', err);
        });

        // Acknowledge receipt of event
        res.status(200).json({ received: true });
    });

    /**
     * GET /api/v1/stripe/payment-status/:paymentIntentId
     * Get payment status for a PaymentIntent
     */
    getPaymentStatus = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const { paymentIntentId } = req.params;

        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
            throw new AppError('paymentIntentId is required', 400, 'INVALID_REQUEST');
        }

        const status = await stripeService.getPaymentStatus(paymentIntentId, userId);

        res.status(200).json({
            success: true,
            data: status,
        });
    });

    /**
     * POST /api/v1/stripe/refund
     * Create a refund for an order (Admin/Provider only)
     */
    createRefund = catchAsync(async (req: AuthRequest, res: Response) => {
        const { orderId, reason } = req.body;

        if (!orderId) {
            throw new AppError('orderId is required', 400, 'INVALID_REQUEST');
        }

        const refund = await stripeService.createRefund(orderId, reason);

        res.status(200).json({
            success: true,
            message: 'Refund created successfully',
            data: refund,
        });
    });

    /**
     * GET /api/v1/stripe/config
     * Get Stripe publishable key for frontend
     */
    getConfig = catchAsync(async (req: Request, res: Response) => {
        res.status(200).json({
            success: true,
            data: {
                publishableKey: config.stripe.publishableKey,
            },
        });
    });
}

export default new StripeController();
