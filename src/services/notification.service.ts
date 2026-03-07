import { Notification, NotificationType } from '../models/notification.model';
import { UserRole } from '../models/user.model';
import { OrderStatus } from '../models/order.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

class NotificationService {

    async createNotification(
        userId: Types.ObjectId,
        userRole: UserRole,
        orderId: Types.ObjectId,
        orderStatus: OrderStatus,
        title: string,
        message: string
    ) {
        try {
            return await Notification.create({
                userId,
                userRole,
                orderId,
                orderStatus,
                title,
                message,
            });
        } catch (error: any) {

            if (error.code === 11000) {
                return null;
            }
            throw error;
        }
    }

    async getUserNotifications(userId: string) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const notifications = await Notification.find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .lean();

        const formattedNotifications = notifications.map((n) => ({
            notificationId: n._id,
            userId: n.userId,
            userRole: n.userRole,
            orderId: n.orderId,
            title: n.title,
            message: n.message,
            status: n.createdAt > twentyFourHoursAgo ? 'NEW' : 'OLD',
            isRead: n.isRead,
            createdAt: n.createdAt,
        }));

        const newNotifications = formattedNotifications.filter((n) => n.status === 'NEW');
        const oldNotifications = formattedNotifications.filter((n) => n.status === 'OLD');

        return {
            newNotifications,
            oldNotifications,
        };
    }

    async markAsRead(notificationId: string, userId: string) {
        const notification = await Notification.findOne({
            _id: new Types.ObjectId(notificationId),
            userId: new Types.ObjectId(userId),
        });

        if (!notification) {
            throw new AppError('Notification not found or access denied', 404, 'NOTIFICATION_ACCESS_ERROR');
        }

        notification.isRead = true;
        await notification.save();

        return notification;
    }

    getNotificationDetails(status: OrderStatus, orderId: string, role: UserRole) {
        const messages: Record<OrderStatus, { title: string; customer: string; provider: string }> = {
            [OrderStatus.PENDING]: {
                title: 'New Order',
                customer: `Your order ${orderId} has been placed successfully.`,
                provider: `You have received a new order ${orderId}.`,
            },
            [OrderStatus.PREPARING]: {
                title: 'Order Preparing',
                customer: `Your order ${orderId} is now being prepared.`,
                provider: `You started preparing order ${orderId}.`,
            },
            [OrderStatus.READY_FOR_PICKUP]: {
                title: 'Order Ready',
                customer: `Your order ${orderId} is ready for pickup!`,
                provider: `Order ${orderId} is marked as ready for pickup.`,
            },
            [OrderStatus.PICKED_UP]: {
                title: 'Order Picked Up',
                customer: `Your order ${orderId} has been picked up. Enjoy your meal!`,
                provider: `Order ${orderId} has been picked up by the customer/courier.`,
            },
            [OrderStatus.COMPLETED]: {
                title: 'Order Completed',
                customer: `Your order ${orderId} has been completed. Thank you!`,
                provider: `Order ${orderId} has been completed.`,
            },
            [OrderStatus.CANCELLED]: {
                title: 'Order Cancelled',
                customer: `Your order ${orderId} has been cancelled.`,
                provider: `Order ${orderId} has been cancelled.`,
            },
        };

        const details = messages[status];
        return {
            title: details.title,
            message: role === UserRole.CUSTOMER ? details.customer : details.provider,
        };
    }

    /**
     * Admin: Get all notifications on the platform
     */
    async getAllNotifications(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            Notification.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'fullName email role')
                .lean(),
            Notification.countDocuments()
        ]);

        return {
            notifications,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Admin: Broadcast notification to specific roles or all users
     */
    async broadcastNotification(data: {
        title: string;
        message: string;
        targetRole?: UserRole;
        type?: NotificationType;
    }) {
        const { title, message, targetRole, type } = data;
        const query = targetRole ? { role: targetRole } : {};
        const users = await import('../models/user.model').then(m => m.User.find(query).select('_id role'));

        const notifications = users.map(user => ({
            userId: user._id,
            userRole: user.role,
            type: type || 'SYSTEM',
            title,
            message,
            isRead: false
        }));

        return await Notification.insertMany(notifications);
    }

    /**
     * Admin: Delete a notification
     */
    async deleteNotification(notificationId: string) {
        const result = await Notification.findByIdAndDelete(notificationId);
        if (!result) throw new AppError('Notification not found', 404);
        return true;
    }
}

export default new NotificationService();
