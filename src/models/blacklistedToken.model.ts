import { Schema, model, Document } from 'mongoose';

export interface IBlacklistedToken extends Document {
    token: string;
    expiresAt: Date;
}

const blacklistedTokenSchema = new Schema<IBlacklistedToken>(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, 
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const BlacklistedToken = model<IBlacklistedToken>('BlacklistedToken', blacklistedTokenSchema);
