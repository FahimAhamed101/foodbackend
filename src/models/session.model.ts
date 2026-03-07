import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
    userId: Types.ObjectId;
    refreshToken: string;
    accessToken: string;


    deviceId: string;
    deviceName?: string;
    deviceType?: 'web' | 'mobile' | 'tablet' | 'desktop';
    userAgent?: string;

    ipAddress?: string;
    country?: string;
    city?: string;
    lastActivityAt: Date;

    issuedAt: Date;
    expiresAt: Date;
    isRevoked: boolean;
    revokedAt?: Date;
    revokedReason?: string;


    tokenFamily: string;
    previousTokenId?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        refreshToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        accessToken: {
            type: String,
            required: true,
            index: true,
        },

        deviceId: {
            type: String,
            required: true,
            index: true,
        },
        deviceName: {
            type: String,
        },
        deviceType: {
            type: String,
            enum: ['web', 'mobile', 'tablet', 'desktop'],
        },
        userAgent: {
            type: String,
        },

        ipAddress: {
            type: String,
        },
        country: {
            type: String,
        },
        city: {
            type: String,
        },
        lastActivityAt: {
            type: Date,
            default: Date.now,
        },

        issuedAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        isRevoked: {
            type: Boolean,
            default: false,
            index: true,
        },
        revokedAt: {
            type: Date,
        },
        revokedReason: {
            type: String,
        },

        tokenFamily: {
            type: String,
            required: true,
            index: true,
        },
        previousTokenId: {
            type: Schema.Types.ObjectId,
            ref: 'Session',
        },
    },
    {
        timestamps: true,
    }
);

sessionSchema.index({ userId: 1, isRevoked: 1 });
sessionSchema.index({ userId: 1, deviceId: 1 });
sessionSchema.index({ tokenFamily: 1, isRevoked: 1 });

export const Session = model<ISession>('Session', sessionSchema);
