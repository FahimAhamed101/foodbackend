import { Schema, model, Document, Types } from 'mongoose';

export interface ICategory extends Document {
    categoryName: string;
    categoryStatus: boolean;
    image?: string;
    providerId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        categoryName: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
            minlength: [2, 'Category name must be at least 2 characters'],
            maxlength: [50, 'Category name cannot exceed 50 characters'],
        },
        categoryStatus: {
            type: Boolean,
            default: true,
        },
        image: {
            type: String,
            default: '',
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Provider ID is required'],
        },
    },
    {
        timestamps: true,
    }
);

categorySchema.index({ providerId: 1, categoryName: 1 }, { unique: true });

export const Category = model<ICategory>('Category', categorySchema);
