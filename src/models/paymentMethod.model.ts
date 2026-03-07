import { Schema, model, Document, Types } from 'mongoose';

export enum CardBrand {
    VISA = 'Visa',
    MASTERCARD = 'MasterCard',
    AMEX = 'American Express',
    DISCOVER = 'Discover',
    UNKNOWN = 'Unknown'
}

export interface IPaymentMethod extends Document {
    userId: Types.ObjectId;
    cardholderName: string;
    brand: CardBrand;
    last4: string;
    expiryDate: string; // MM/YY
    isDefault: boolean;
    stripePaymentMethodId: string;
    createdAt: Date;
    updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        cardholderName: {
            type: String,
            required: true,
            trim: true,
        },
        brand: {
            type: String,
            enum: Object.values(CardBrand),
            default: CardBrand.UNKNOWN,
        },
        last4: {
            type: String,
            required: true,
            minlength: 4,
            maxlength: 4,
        },
        expiryDate: {
            type: String,
            required: true, // Format MM/YY
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        stripePaymentMethodId: {
            type: String,
            required: true,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

paymentMethodSchema.pre('save', async function () {
    if (this.isDefault) {
        await (this.constructor as any).updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
});

export const PaymentMethod = model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
