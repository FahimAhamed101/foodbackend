import { Schema, model, Document, Types } from 'mongoose';

export enum OrderStatus {
    PENDING = 'pending',
    PREPARING = 'preparing',
    READY_FOR_PICKUP = 'ready_for_pickup',
    PICKED_UP = 'picked_up',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export interface IOrder extends Document {
    orderId: string;
    providerId: Types.ObjectId;
    customerId: Types.ObjectId;
    items: {
        foodId: Types.ObjectId;
        quantity: number;
        price: number;
        platformFee: number;
    }[];
    subtotal: number;
    platformFee: number;
    stateTax: number;
    totalPrice: number;
    vendorAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    logisticsType: string;
    cancellationReason?: string;
    pickupTime?: Date;
    state?: string;
    stripePaymentIntentId?: string;
    idempotencyKey?: string;
    orderStatusHistory: {
        status: OrderStatus;
        timestamp: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: [
            {
                foodId: { type: Schema.Types.ObjectId, ref: 'Food' },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                platformFee: { type: Number, default: 0 },
            },
        ],
        subtotal: {
            type: Number,
            required: true,
        },
        platformFee: {
            type: Number,
            default: 0,
        },
        stateTax: {
            type: Number,
            default: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        vendorAmount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
        },
        paymentStatus: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
            index: true,
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        logisticsType: {
            type: String,
            required: true,
        },
        cancellationReason: {
            type: String,
            trim: true,
        },
        pickupTime: {
            type: Date,
        },
        state: {
            type: String,
            index: true,
        },
        stripePaymentIntentId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        orderStatusHistory: [
            {
                status: {
                    type: String,
                    enum: Object.values(OrderStatus),
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ providerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: 1 });

orderSchema.index({ providerId: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
