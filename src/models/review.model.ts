import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
    providerId: Types.ObjectId;
    customerId: Types.ObjectId;
    orderId: Types.ObjectId;
    foodId?: Types.ObjectId;
    rating: number;
    comment: string;
    reply?: {
        comment: string;
        createdAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
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
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        foodId: {
            type: Schema.Types.ObjectId,
            ref: 'Food',
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        reply: {
            comment: { type: String, trim: true },
            createdAt: { type: Date },
        },
    },
    {
        timestamps: true,
    }
);

reviewSchema.index({ providerId: 1, rating: -1 });
reviewSchema.index({ orderId: 1, customerId: 1, foodId: 1 }, { unique: true }); // One review per item per order

export const Review = model<IReview>('Review', reviewSchema);
