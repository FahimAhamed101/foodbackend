import { Order, OrderStatus } from '../models/order.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';
import notificationService from './notification.service';
import { UserRole } from '../models/user.model';
import systemConfigService from './systemConfig.service';
import { Profile } from '../models/profile.model';
import { State } from '../models/state.model';

class OrderService {
    async createOrder(customerId: string, orderData: {
        providerId: string;
        items: { foodId: string; quantity: number; price: number }[];
        paymentMethod: string;
        logisticsType: string;
    }) {
        // Fetch platform fee config
        const feeConfig = await systemConfigService.getPlatformFeeConfig();
        const feeValue = feeConfig.value || 0;

        // Calculate subtotal and individual platform fees
        let subtotal = 0;
        let totalPlatformFee = 0;

        const itemsWithFees = orderData.items.map(item => {
            const itemSubtotal = item.price * item.quantity;
            subtotal += itemSubtotal;

            let itemPlatformFee = 0;
            if (feeConfig.type === 'fixed') {
                // Fixed fee per unit quantity
                itemPlatformFee = feeValue * item.quantity;
            } else if (feeConfig.type === 'percentage') {
                // Percentage fee on this item's subtotal
                itemPlatformFee = (itemSubtotal * feeValue) / 100;
            }

            totalPlatformFee += itemPlatformFee;

            return {
                ...item,
                foodId: new Types.ObjectId(item.foodId),
                platformFee: parseFloat(itemPlatformFee.toFixed(2))
            };
        });

        // Get customer's state for tax calculation
        const customerProfile = await Profile.findOne({ userId: new Types.ObjectId(customerId) });
        let stateTax = 0;
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
                // State tax is applied once per order on subtotal
                stateTax = (subtotal * stateData.tax) / 100;
            }
        }

        // Calculate final total
        const totalPrice = subtotal + totalPlatformFee + stateTax;

        const order = await Order.create({
            customerId: new Types.ObjectId(customerId),
            providerId: new Types.ObjectId(orderData.providerId),
            items: itemsWithFees,
            subtotal: parseFloat(subtotal.toFixed(2)),
            platformFee: parseFloat(totalPlatformFee.toFixed(2)),
            stateTax: parseFloat(stateTax.toFixed(2)),
            totalPrice: parseFloat(totalPrice.toFixed(2)),
            state: customerState,
            status: OrderStatus.PENDING,
            paymentMethod: orderData.paymentMethod,
            logisticsType: orderData.logisticsType,
            orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        });

        const { title: cTitle, message: cMessage } = notificationService.getNotificationDetails(OrderStatus.PENDING, order.orderId, UserRole.CUSTOMER);
        await notificationService.createNotification(order.customerId, UserRole.CUSTOMER, order._id as Types.ObjectId, OrderStatus.PENDING, cTitle, cMessage);

        const { title: pTitle, message: pMessage } = notificationService.getNotificationDetails(OrderStatus.PENDING, order.orderId, UserRole.PROVIDER);
        await notificationService.createNotification(order.providerId, UserRole.PROVIDER, order._id as Types.ObjectId, OrderStatus.PENDING, pTitle, pMessage);

        return order;
    }

    async updateStatus(orderId: string, providerId: string, newStatus: OrderStatus) {
        const order = await Order.findOne({
            $or: [
                { orderId: orderId },
                { _id: Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : undefined }
            ].filter(q => q._id !== undefined || q.orderId)
        });

        if (!order) {
            throw new AppError('Order not found', 404, 'NOT_FOUND_ERROR');
        }

        if (order.providerId.toString() !== providerId) {
            throw new AppError(`Access denied. This order belongs to provider ID: ${order.providerId}. You are logged in as: ${providerId}`, 403, 'ACCESS_DENIED');
        }

        // Idempotency: If already in the target status, return success early
        if (order.status === newStatus) {
            return order;
        }

        switch (newStatus) {
            case OrderStatus.PREPARING:
                if (order.status !== OrderStatus.PENDING) {
                    throw new AppError(`Order must be Pending to move to Preparing (Current status: ${order.status})`, 400, 'INVALID_ORDER_STATUS');
                }
                break;
            case OrderStatus.READY_FOR_PICKUP:
                if (order.status !== OrderStatus.PREPARING) {
                    throw new AppError(`Order must be Preparing to move to Ready for Pickup (Current status: ${order.status})`, 400, 'INVALID_ORDER_STATUS');
                }
                break;
            case OrderStatus.PICKED_UP:
                if (order.status !== OrderStatus.READY_FOR_PICKUP) {
                    throw new AppError(`Order must be Ready for Pickup to move to Picked Up (Current status: ${order.status})`, 400, 'INVALID_ORDER_STATUS');
                }
                break;
            case OrderStatus.COMPLETED:
                if (order.status !== OrderStatus.PICKED_UP && order.status !== OrderStatus.READY_FOR_PICKUP) {
                    throw new AppError(`Order must be Ready for Pickup or Picked Up to move to Completed (Current status: ${order.status})`, 400, 'INVALID_ORDER_STATUS');
                }
                break;
            default:
                throw new AppError('Invalid status update via this endpoint. Use cancel for cancellations.', 400, 'INVALID_ORDER_STATUS');
        }

        order.status = newStatus;
        await order.save();

        const { title: cTitle, message: cMessage } = notificationService.getNotificationDetails(newStatus, order.orderId, UserRole.CUSTOMER);
        await notificationService.createNotification(order.customerId, UserRole.CUSTOMER, order._id as Types.ObjectId, newStatus, cTitle, cMessage);

        const { title: pTitle, message: pMessage } = notificationService.getNotificationDetails(newStatus, order.orderId, UserRole.PROVIDER);
        await notificationService.createNotification(order.providerId, UserRole.PROVIDER, order._id as Types.ObjectId, newStatus, pTitle, pMessage);

        return order;
    }

    async cancelOrder(orderId: string, userId: string, role: string, cancellationReason?: string) {
        const order = await Order.findOne({ orderId });
        if (!order) {
            throw new AppError('Order not found', 404, 'NOT_FOUND_ERROR');
        }

        if (role === 'CUSTOMER') {
            if (order.customerId.toString() !== userId) {
                throw new AppError('Not authorized', 403, 'ROLE_ERROR');
            }
            if (order.status !== OrderStatus.PENDING) {
                throw new AppError('Customer can only cancel Pending orders', 400, 'INVALID_ORDER_STATUS');
            }
        } else if (role === 'PROVIDER') {
            if (order.providerId.toString() !== userId) {
                throw new AppError('Not authorized', 403, 'ROLE_ERROR');
            }
            if (order.status !== OrderStatus.PREPARING) {
                throw new AppError('Provider can only cancel Preparing orders', 400, 'INVALID_ORDER_STATUS');
            }
        } else {
            throw new AppError('Invalid role', 403, 'ROLE_ERROR');
        }

        order.status = OrderStatus.CANCELLED;
        if (cancellationReason) {
            order.cancellationReason = cancellationReason;
        }
        await order.save();

        const { title: cTitle, message: cMessage } = notificationService.getNotificationDetails(OrderStatus.CANCELLED, order.orderId, UserRole.CUSTOMER);
        await notificationService.createNotification(order.customerId, UserRole.CUSTOMER, order._id as Types.ObjectId, OrderStatus.CANCELLED, cTitle, cMessage);

        const { title: pTitle, message: pMessage } = notificationService.getNotificationDetails(OrderStatus.CANCELLED, order.orderId, UserRole.PROVIDER);
        await notificationService.createNotification(order.providerId, UserRole.PROVIDER, order._id as Types.ObjectId, OrderStatus.CANCELLED, pTitle, pMessage);

        return order;
    }

    async getOrderById(orderId: string, userId: string, role: string) {
        const order = await Order.findOne({
            $or: [
                { orderId: orderId },
                { _id: Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : undefined }
            ].filter(q => q._id !== undefined || q.orderId)
        }).populate('customerId', 'fullName email phoneNumber')
            .populate('providerId', 'fullName email')
            .populate('items.foodId', 'name image');

        if (!order) {
            throw new AppError('Order not found', 404, 'NOT_FOUND_ERROR');
        }

        if (role === 'CUSTOMER' && order.customerId._id.toString() !== userId) {
            throw new AppError('Not authorized to view this order', 403, 'ROLE_ERROR');
        }
        if (role === 'PROVIDER' && order.providerId._id.toString() !== userId) {
            throw new AppError('Not authorized to view this order', 403, 'ROLE_ERROR');
        }

        return order;
    }

    async getOrders(filters: any) {
        const { status, orderId, customerName, providerId, customerId, page = 1, limit = 10 } = filters;
        const query: any = {};

        if (providerId) query.providerId = new Types.ObjectId(providerId);
        if (customerId) query.customerId = new Types.ObjectId(customerId);
        if (status) query.status = status;
        if (orderId) query.orderId = orderId;

        const pipeline: any[] = [
            { $match: query },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customerInfo',
                },
            },
            { $unwind: '$customerInfo' },
        ];

        if (customerName) {
            const escapedName = customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            pipeline.push({
                $match: {
                    'customerInfo.fullName': { $regex: new RegExp(escapedName, 'i') },
                },
            });
        }

        pipeline.push({
            $project: {
                _id: 1,
                orderId: 1,
                customerName: '$customerInfo.fullName',
                logisticsType: 1,
                totalPrice: 1,
                status: 1,
                createdAt: 1,
            },
        });

        const skip = (Number(page) - 1) * Number(limit);
        const facetPipeline = [
            ...pipeline,
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [{ $skip: skip }, { $limit: Number(limit) }],
                },
            },
        ];

        const result = await Order.aggregate(facetPipeline);
        const total = result[0].metadata[0]?.total || 0;
        const orders = result[0].data;

        return {
            orders,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async getProviderOrders(providerId: string, filters: any) {
        return this.getOrders({ ...filters, providerId });
    }
}

export default new OrderService();
