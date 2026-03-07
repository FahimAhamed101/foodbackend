import { Schema, model, Document, Types } from 'mongoose';

export enum PaymentStatus {
    COMPLETED = 'completed',
    PENDING = 'pending',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export enum PayoutStatus {
    PENDING = 'pending',
    SETTLED = 'settled',
}

export interface IPayment extends Document {
    paymentId: string;
    orderId: string; // Business Order ID (e.g. ORD-123)
    orderObjectId: Types.ObjectId; // MongoDB ID of the order
    providerId: Types.ObjectId;
    customerId: Types.ObjectId;
    totalAmount: number;
    commission: number;
    netAmount: number;
    vendorAmount: number;
    status: PaymentStatus;
    payoutStatus: PayoutStatus;
    paymentMethod: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeTransferId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        paymentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        orderId: {
            type: String,
            required: true,
            index: true,
        },
        orderObjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        commission: {
            type: Number,
            required: true,
            default: 0,
        },
        netAmount: {
            type: Number,
            required: true,
        },
        vendorAmount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
            index: true,
        },
        payoutStatus: {
            type: String,
            enum: Object.values(PayoutStatus),
            default: PayoutStatus.PENDING,
            index: true,
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        stripePaymentIntentId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        stripeChargeId: {
            type: String,
        },
        stripeTransferId: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for provider-isolated searches
paymentSchema.index({ providerId: 1, paymentId: 1 });
paymentSchema.index({ providerId: 1, orderId: 1 });
paymentSchema.index({ providerId: 1, status: 1, createdAt: -1 });

export const Payment = model<IPayment>('Payment', paymentSchema);
