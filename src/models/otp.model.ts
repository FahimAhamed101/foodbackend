import { Schema, model, Document } from 'mongoose';

export enum OtpPurpose {
    EMAIL_VERIFY = 'EMAIL_VERIFY',
    RESET_PASSWORD = 'RESET_PASSWORD',
}

export interface IOtp extends Document {
    email: string;
    otp: string;
    purpose: OtpPurpose;
    expiresAt: Date;
    createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        otp: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            enum: Object.values(OtpPurpose),
            required: true,
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

export const Otp = model<IOtp>('Otp', otpSchema);
