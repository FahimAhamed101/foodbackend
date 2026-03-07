import { Types } from 'mongoose';
import stripe from '../config/stripe';
import { Food } from '../models/food.model';
import { Profile } from '../models/profile.model';
import { State } from '../models/state.model';
import { Order, OrderStatus, PaymentStatus as OrderPaymentStatus } from '../models/order.model';
import { Payment, PaymentStatus } from '../models/payment.model';
import { WebhookEvent } from '../models/webhookEvent.model';
import { Cart } from '../models/cart.model';
import systemConfigService from './systemConfig.service';
import notificationService from './notification.service';
import { UserRole } from '../models/user.model';
import AppError from '../utils/AppError';
import Stripe from 'stripe';

interface CreatePaymentIntentData {
    customerId: string;
    providerId: string;
    items: { foodId: string; quantity: number }[];
}

interface PriceBreakdown {
    subtotal: number; // baseRevenue + serviceFee (customer pays before tax)
    platformFee: number; // $0.50 × quantity (admin gets, deducted from baseRevenue)
    stateTax: number; // subtotal × taxRate (admin gets)
    total: number; // subtotal + tax (customer pays)
    vendorAmount: number; // (baseRevenue - platformFee) + serviceFee (restaurant gets)
    state: string;
    items: {
        foodId: string;
        name: string;
        price: number;
        baseRevenue: number;
        serviceFee: number;
        quantity: number;
        itemTotal: number;
        platformFee: number;
    }[];
}

class StripeService {
    /**
     * Calculate complete price breakdown
     * LOGIC:
     * - Base Price: $5.99 (fixed)
     *   ↳ Restaurant gets: $5.49
     *   ↳ Admin gets: $0.50 (platform fee)
     * - Service Fee: Restaurant sets, restaurant gets
     * - Tax: Calculated on subtotal, admin gets
     * - Customer pays: subtotal + tax
     */
    async calculatePriceBreakdown(
        customerId: string,
        items: { foodId: string; quantity: number }[]
    ): Promise<PriceBreakdown> {
        // Fetch food items from DB (NEVER trust frontend prices)
        const foodIds = items.map(item => new Types.ObjectId(item.foodId));
        const foods = await Food.find({ _id: { $in: foodIds } });

        if (foods.length !== items.length) {
            throw new AppError('Some food items not found', 404, 'FOOD_NOT_FOUND');
        }

        // Check availability
        const unavailableFoods = foods.filter(f => !f.foodAvailability || !f.foodStatus);
        if (unavailableFoods.length > 0) {
            throw new AppError(
                `Food items unavailable: ${unavailableFoods.map(f => f.title).join(', ')}`,
                400,
                'FOOD_UNAVAILABLE'
            );
        }

        // Get customer's state for tax
        const customerProfile = await Profile.findOne({ userId: new Types.ObjectId(customerId) });
        let stateTaxRate = 0;
        let customerState = '';

        if (customerProfile && customerProfile.state) {
            customerState = customerProfile.state;
            const stateData = await State.findOne({
                $or: [
                    { code: customerProfile.state.toUpperCase() },
                    { name: new RegExp(`^${customerProfile.state}$`, 'i') }
                ],
                isActive: true
            });

            if (stateData && stateData.tax) {
                stateTaxRate = stateData.tax / 100;
            }
        }

        // Platform fee is FIXED $0.50 per item (deducted from baseRevenue)
        const PLATFORM_FEE_PER_ITEM = 0.50;

        // Calculate breakdown
        let subtotal = 0; // baseRevenue + serviceFee (what customer pays before tax)
        let totalPlatformFee = 0; // $0.50 × quantity (admin gets, deducted from baseRevenue)
        let totalVendorRevenue = 0; // (baseRevenue - platformFee) + serviceFee (restaurant gets)

        const itemsBreakdown = items.map(item => {
            const food = foods.find(f => f._id.toString() === item.foodId);
            if (!food) throw new AppError('Food item not found', 404, 'FOOD_NOT_FOUND');

            // Base price breakdown per item
            const itemBaseRevenue = food.baseRevenue * item.quantity; // $5.99 × qty
            const itemServiceFee = food.serviceFee * item.quantity; // e.g., $1.25 × qty
            const itemPlatformFee = PLATFORM_FEE_PER_ITEM * item.quantity; // $0.50 × qty
            
            // Customer pays: baseRevenue + serviceFee
            const itemSubtotal = itemBaseRevenue + itemServiceFee;
            
            // Restaurant gets: (baseRevenue - platformFee) + serviceFee
            const itemVendorRevenue = (itemBaseRevenue - itemPlatformFee) + itemServiceFee;

            subtotal += itemSubtotal;
            totalPlatformFee += itemPlatformFee;
            totalVendorRevenue += itemVendorRevenue;

            return {
                foodId: food._id.toString(),
                name: food.title,
                price: food.finalPriceTag,
                baseRevenue: food.baseRevenue,
                serviceFee: food.serviceFee,
                quantity: item.quantity,
                itemTotal: parseFloat(itemSubtotal.toFixed(2)),
                platformFee: parseFloat(itemPlatformFee.toFixed(2)),
            };
        });

        // Tax is calculated on subtotal (baseRevenue + serviceFee)
        const stateTax = subtotal * stateTaxRate;
        
        // Total customer pays: subtotal + tax
        const total = subtotal + stateTax;
        
        // Restaurant gets: (baseRevenue - platformFee) + serviceFee
        const vendorAmount = totalVendorRevenue;

        return {
            subtotal: parseFloat(subtotal.toFixed(2)),
            platformFee: parseFloat(totalPlatformFee.toFixed(2)),
            stateTax: parseFloat(stateTax.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            vendorAmount: parseFloat(vendorAmount.toFixed(2)),
            state: customerState,
            items: itemsBreakdown,
        };
    }

    /**
     * Create Stripe PaymentIntent
     */
    async createPaymentIntent(data: CreatePaymentIntentData) {
        const { customerId, providerId, items } = data;

        // Calculate price breakdown (backend-validated prices)
        const breakdown = await this.calculatePriceBreakdown(customerId, items);

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(breakdown.total * 100), // Stripe uses cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                customerId,
                providerId,
                state: breakdown.state,
                subtotal: breakdown.subtotal.toString(),
                platformFee: breakdown.platformFee.toString(),
                stateTax: breakdown.stateTax.toString(),
                vendorAmount: breakdown.vendorAmount.toString(),
                items: JSON.stringify(items),
            },
            description: `Order from EMDR - Provider: ${providerId}`,
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: breakdown.total,
            breakdown,
        };
    }

    /**
     * Handle successful payment webhook
     */
    async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
        console.log(`💰 [Stripe Webhook] Processing success for PaymentIntent: ${paymentIntent.id}`);
        const metadata = paymentIntent.metadata;

        // Extract metadata
        const customerId = metadata.customerId;
        const providerId = metadata.providerId;
        const state = metadata.state;
        const items = JSON.parse(metadata.items);

        // Recalculate to ensure integrity (prevent metadata tampering)
        const breakdown = await this.calculatePriceBreakdown(customerId, items);

        // Verify amount matches
        const expectedAmount = Math.round(breakdown.total * 100);
        if (paymentIntent.amount !== expectedAmount) {
            throw new AppError(
                `Amount mismatch: expected ${expectedAmount}, got ${paymentIntent.amount}`,
                400,
                'AMOUNT_MISMATCH'
            );
        }

        // Prepare items with platform fees
        const itemsWithFees = breakdown.items.map(item => ({
            foodId: new Types.ObjectId(item.foodId),
            quantity: item.quantity,
            price: item.baseRevenue + item.serviceFee, // baseRevenue + serviceFee
            platformFee: item.platformFee,
        }));

        // Create Order
        console.log(`📦 [Stripe Webhook] Creating order for customer ${customerId} from provider ${providerId}`);
        const order = await Order.create({
            customerId: new Types.ObjectId(customerId),
            providerId: new Types.ObjectId(providerId),
            items: itemsWithFees,
            subtotal: breakdown.subtotal,
            platformFee: breakdown.platformFee,
            stateTax: breakdown.stateTax,
            totalPrice: breakdown.total,
            vendorAmount: breakdown.vendorAmount,
            state,
            status: OrderStatus.PENDING,
            paymentStatus: OrderPaymentStatus.PAID,
            paymentMethod: 'stripe',
            logisticsType: 'delivery',
            orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            stripePaymentIntentId: paymentIntent.id,
            idempotencyKey: paymentIntent.id,
        });
        console.log(`✅ [Stripe Webhook] Order created: ${order.orderId}`);

        // Create Payment record
        console.log(`💳 [Stripe Webhook] Creating payment record for order ${order.orderId}`);
        await Payment.create({
            paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            orderId: order.orderId,
            orderObjectId: order._id,
            providerId: new Types.ObjectId(providerId),
            customerId: new Types.ObjectId(customerId),
            totalAmount: breakdown.total,
            commission: breakdown.platformFee,
            netAmount: breakdown.vendorAmount,
            vendorAmount: breakdown.vendorAmount,
            status: PaymentStatus.COMPLETED,
            payoutStatus: 'pending',
            paymentMethod: 'stripe',
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: paymentIntent.latest_charge as string,
        });

        // Send notifications
        const { title: cTitle, message: cMessage } = notificationService.getNotificationDetails(
            OrderStatus.PENDING,
            order.orderId,
            UserRole.CUSTOMER
        );
        await notificationService.createNotification(
            order.customerId,
            UserRole.CUSTOMER,
            order._id as Types.ObjectId,
            OrderStatus.PENDING,
            cTitle,
            cMessage
        );

        const { title: pTitle, message: pMessage } = notificationService.getNotificationDetails(
            OrderStatus.PENDING,
            order.orderId,
            UserRole.PROVIDER
        );
        await notificationService.createNotification(
            order.providerId,
            UserRole.PROVIDER,
            order._id as Types.ObjectId,
            OrderStatus.PENDING,
            pTitle,
            pMessage
        );

        // Clear customer's cart
        console.log(`🛒 [Stripe Webhook] Clearing cart for customer ${customerId}`);
        await Cart.findOneAndUpdate(
            { userId: new Types.ObjectId(customerId) },
            { $set: { items: [] } }
        );

        console.log(`🎉 [Stripe Webhook] Payment success flow completed for ${order.orderId}`);
        return order;
    }

    /**
     * Handle failed payment webhook
     */
    async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
        // Log failed payment for analytics
        console.error('Payment failed:', {
            paymentIntentId: paymentIntent.id,
            customerId: paymentIntent.metadata.customerId,
            amount: paymentIntent.amount,
            error: paymentIntent.last_payment_error,
        });

        // Optionally: Send notification to customer about failed payment
        // This can be implemented based on business requirements
    }

    /**
     * Process webhook event with idempotency
     */
    async processWebhookEvent(event: Stripe.Event) {
        console.log(`📫 [Stripe Webhook] Received event type: ${event.type}`);

        // Check if event already processed (idempotency)
        const existingEvent = await WebhookEvent.findOne({ eventId: event.id });
        if (existingEvent && existingEvent.processed) {
            console.log(`Webhook event ${event.id} already processed, skipping`);
            return { alreadyProcessed: true };
        }

        // Store event
        await WebhookEvent.create({
            eventId: event.id,
            type: event.type,
            processed: false,
            data: event.data,
        });

        let result;

        // Handle event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                result = await this.handlePaymentSuccess(paymentIntent);
                break;

            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object as Stripe.PaymentIntent;
                await this.handlePaymentFailed(failedIntent);
                result = { status: 'failed' };
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
                result = { status: 'unhandled' };
        }

        // Mark event as processed
        await WebhookEvent.findOneAndUpdate(
            { eventId: event.id },
            { processed: true, processedAt: new Date() }
        );

        return result;
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(paymentIntentId: string, userId: string) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // Find associated order
        const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });

        // Verify user has access
        if (order && order.customerId.toString() !== userId) {
            throw new AppError('Not authorized to view this payment', 403, 'ACCESS_DENIED');
        }

        return {
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            orderId: order?.orderId,
            orderStatus: order?.status,
            paymentStatus: order?.paymentStatus,
        };
    }

    /**
     * Create refund (for admin/provider)
     */
    async createRefund(orderId: string, reason?: string) {
        const order = await Order.findOne({ orderId });

        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        if (!order.stripePaymentIntentId) {
            throw new AppError('No payment intent found for this order', 400, 'NO_PAYMENT_INTENT');
        }

        if (order.paymentStatus === OrderPaymentStatus.REFUNDED) {
            throw new AppError('Order already refunded', 400, 'ALREADY_REFUNDED');
        }

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
            reason: reason === 'duplicate' ? 'duplicate' : 'requested_by_customer',
        });

        // Update order
        order.paymentStatus = OrderPaymentStatus.REFUNDED;
        order.status = OrderStatus.CANCELLED;
        order.cancellationReason = reason || 'Refunded';
        await order.save();

        // Update payment record
        await Payment.findOneAndUpdate(
            { stripePaymentIntentId: order.stripePaymentIntentId },
            { status: PaymentStatus.REFUNDED }
        );

        return {
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status,
        };
    }
}

export default new StripeService();
