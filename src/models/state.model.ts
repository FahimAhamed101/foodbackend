import { Schema, model, Document } from 'mongoose';

export interface IState extends Document {
    name: string;
    code: string;
    country: string;
    tax?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const stateSchema = new Schema<IState>(
    {
        name: {
            type: String,
            required: [true, 'State name is required'],
            unique: true,
            trim: true,
            index: true,
        },
        code: {
            type: String,
            required: [true, 'State code is required'],
            uppercase: true,
            trim: true,
            minlength: 2,
            maxlength: 3,
            index: true,
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            default: 'USA',
            uppercase: true,
            index: true,
        },
        tax: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

stateSchema.index({ code: 1, country: 1 }, { unique: true });

stateSchema.index({ country: 1, isActive: 1 });

export const State = model<IState>('State', stateSchema);
