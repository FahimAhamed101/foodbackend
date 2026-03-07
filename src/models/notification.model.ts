import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from './user.model';
import { OrderStatus } from './order.model'; // Kept for backward compat

export enum NotificationType {
    ORDER = 'ORDER',
    MESSAGE = 'MESSAGE',
    SYSTEM = 'SYSTEM'
}

export interface INotification extends Document {
    userId: Types.ObjectId;
    type: NotificationType;
    // Optional to support messages
    userRole?: UserRole;
    orderId?: Types.ObjectId;
    orderStatus?: OrderStatus;

    title: string;
    message: string;
    isRead: boolean;
    metadata?: any; // Flexible payload (chatRoomId, senderId, etc)
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(NotificationType),
            default: NotificationType.SYSTEM,
            index: true
        },
        // Made optional
        userRole: {
            type: String,
            enum: Object.values(UserRole),
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        orderStatus: {
            type: String,
            enum: Object.values(OrderStatus),
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        metadata: {
            type: Schema.Types.Mixed // Flexible storage
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
// Sparse index for order uniqueness only if orderId exists
notificationSchema.index({ userId: 1, orderId: 1, orderStatus: 1 }, { unique: true, sparse: true });

export const Notification = model<INotification>('Notification', notificationSchema);
