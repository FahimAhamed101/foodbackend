import { Types } from 'mongoose';
import { Order, IOrder, OrderStatus } from '../models/order.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { User } from '../models/user.model';
import AppError from '../utils/AppError';

interface OrderItemDetail {
    name: string;
    quantity: number;
    pricePerItem: number;
    totalPrice: number;
}

interface OrderTimeline {
    status: string;
    time: Date;
}

interface OrderDetailsResponse {
    orderId: string;
    status: string;
    createdAt: Date;
    items: OrderItemDetail[];
    pricing: {
        subtotal: number;
        stateTax: number;
        platformFee: number;
        total: number;
    };
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    restaurant: {
        name: string;
        address: string;
        providerId: string;
    };
    timeline: OrderTimeline[];
}

class AdminOrderService {
    /**
     * Get full order details for Admin
     * 
     * @param providerId - The provider's ID (optional)
     * @param orderId - The Order ID (custom string ID, e.g. ORD-001)
     */
    async getOrderDetails(providerId: string | null, orderId: string): Promise<OrderDetailsResponse> {
        // 1. Find the order
        const query: any = { orderId: orderId };
        if (providerId) {
            query.providerId = new Types.ObjectId(providerId);
        }

        const order = await Order.findOne(query)
            .populate('customerId', 'fullName email phone')
            .populate('items.foodId', 'title price image');

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // 2. Get Restaurant Info
        const actualProviderId = order.providerId;
        const providerProfile = await ProviderProfile.findOne({ providerId: actualProviderId });
        const restaurantName = providerProfile?.restaurantName || 'Unknown Restaurant';
        const restaurantAddress = `${providerProfile?.restaurantAddress || ''}, ${providerProfile?.city || ''}, ${providerProfile?.state || ''}, ${providerProfile?.zipCode || ''}`;

        // 3. Format Items
        const formattedItems: OrderItemDetail[] = order.items.map((item: any) => ({
            name: item.foodId?.title || 'Unknown Item',
            quantity: item.quantity,
            pricePerItem: item.price,
            totalPrice: item.quantity * item.price
        }));

        // 4. Calculate Pricing Breakdown
        // Use the stored values from order (already calculated correctly during order creation)
        const subtotal = order.subtotal || 0;
        const platformFee = order.platformFee || 0;
        const stateTax = order.stateTax || 0;
        const total = order.totalPrice;

        // 5. Format Timeline
        // If orderStatusHistory exists, use it. Else fallback to createdAt/updatedAt
        let timeline: OrderTimeline[] = [];
        if (order.orderStatusHistory && order.orderStatusHistory.length > 0) {
            timeline = order.orderStatusHistory.map(history => ({
                status: history.status,
                time: history.timestamp
            }));
        } else {
            // Fallback if history tracking wasn't active
            timeline.push({ status: 'Order Placed', time: order.createdAt });
            if (order.status === OrderStatus.COMPLETED) {
                timeline.push({ status: 'Completed', time: order.updatedAt });
            }
        }

        // Sort timeline
        timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // 6. Construct Response
        const customer = (order.customerId as any);

        return {
            orderId: order.orderId,
            status: order.status,
            createdAt: order.createdAt,
            items: formattedItems,
            pricing: {
                subtotal: parseFloat(subtotal.toFixed(2)),
                stateTax: parseFloat(stateTax.toFixed(2)),
                platformFee: parseFloat(platformFee.toFixed(2)),
                total: parseFloat(total.toFixed(2))
            },
            customer: {
                name: customer?.fullName || 'Unknown',
                email: customer?.email || 'Unknown',
                phone: customer?.phone || 'Unknown'
            },
            restaurant: {
                name: restaurantName,
                address: restaurantAddress.replace(/^, , , $/, 'Address not available'), // Cleanup empty address
                providerId: actualProviderId.toString()
            },
            timeline
        };
    }
}

export default new AdminOrderService();
