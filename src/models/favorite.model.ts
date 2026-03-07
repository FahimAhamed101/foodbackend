import { Schema, model, Document, Types } from 'mongoose';

export interface IFavorite extends Document {
    userId: Types.ObjectId;
    foodId: Types.ObjectId;
    createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        foodId: {
            type: Schema.Types.ObjectId,
            ref: 'Food',
            required: true,
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only need createdAt
    }
);

// Compound unique index to prevent duplicate favorites per user
favoriteSchema.index({ userId: 1, foodId: 1 }, { unique: true });

// Index for getting a user's feed sorted by time
favoriteSchema.index({ userId: 1, createdAt: -1 });

export const Favorite = model<IFavorite>('Favorite', favoriteSchema);
