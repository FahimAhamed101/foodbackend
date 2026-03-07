import { Schema, model, Document, Types } from 'mongoose';

export interface IFood extends Document {
    providerId: Types.ObjectId;
    categoryId: Types.ObjectId;
    title: string;
    productDescription?: string;
    image?: string;
    calories?: number;
    baseRevenue: number;
    serviceFee: number;
    finalPriceTag: number;
    rating: number;
    foodStatus: boolean;
    foodAvailability: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const foodSchema = new Schema<IFood>(
    {
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            index: true // Indexed for search
        },
        productDescription: {
            type: String,
            trim: true
        },
        image: {
            type: String
        },
        calories: {
            type: Number,
            default: 0
        },
        baseRevenue: {
            type: Number,
            required: true,
            min: 0
        },
        serviceFee: {
            type: Number,
            required: true,
            min: 0
        },
        finalPriceTag: {
            type: Number,
            required: true,
            min: 0
        },
        rating: {
            type: Number,
            default: 0,
            max: 5,
            index: true // Indexed for search
        },
        foodStatus: {
            type: Boolean,
            default: true // Active
        },
        foodAvailability: {
            type: Boolean,
            default: true // Available
        }
    },
    {
        timestamps: true,
    }
);


foodSchema.index({ categoryId: 1, rating: -1 });

export const Food = model<IFood>('Food', foodSchema);
