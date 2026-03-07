import { Schema, model, Document, Types } from 'mongoose';

export enum StepUpPurpose {
    PROVIDER_FIRST_LOGIN = 'PROVIDER_FIRST_LOGIN',
    PROVIDER_ROLE_UPGRADE = 'PROVIDER_ROLE_UPGRADE',
    SENSITIVE_ACTION = 'SENSITIVE_ACTION',
    LOCATION_CHANGE = 'LOCATION_CHANGE',
    DEVICE_CHANGE = 'DEVICE_CHANGE',
}

export enum StepUpMethod {
    EMAIL_OTP = 'EMAIL_OTP',
    SMS_OTP = 'SMS_OTP',
    ADMIN_APPROVAL = 'ADMIN_APPROVAL',
    RE_AUTHENTICATION = 'RE_AUTHENTICATION',
}

export enum StepUpStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
}

export interface IStepUpVerification extends Document {
    userId: Types.ObjectId;
    purpose: StepUpPurpose;
    method: StepUpMethod;
    status: StepUpStatus;
    
    // OTP fields (for EMAIL_OTP, SMS_OTP)
    otp?: string; // Hashed OTP
    otpAttempts: number;
    maxOtpAttempts: number;
    
    // Admin approval fields
    approvedBy?: Types.ObjectId;
    approvalNotes?: string;
    
    // Metadata
    requestedAction?: string; // What action triggered step-up
    ipAddress?: string;
    deviceId?: string;
    
    // Timestamps
    expiresAt: Date;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const stepUpVerificationSchema = new Schema<IStepUpVerification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        purpose: {
            type: String,
            enum: Object.values(StepUpPurpose),
            required: true,
        },
        method: {
            type: String,
            enum: Object.values(StepUpMethod),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(StepUpStatus),
            default: StepUpStatus.PENDING,
            index: true,
        },
        
        // OTP fields
        otp: {
            type: String,
        },
        otpAttempts: {
            type: Number,
            default: 0,
        },
        maxOtpAttempts: {
            type: Number,
            default: 3,
        },
        
        // Admin approval
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        approvalNotes: {
            type: String,
        },
        
        // Metadata
        requestedAction: {
            type: String,
        },
        ipAddress: {
            type: String,
        },
        deviceId: {
            type: String,
        },
        
        // Timestamps
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index
        },
        verifiedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
stepUpVerificationSchema.index({ userId: 1, status: 1 });
stepUpVerificationSchema.index({ userId: 1, purpose: 1, status: 1 });

export const StepUpVerification = model<IStepUpVerification>('StepUpVerification', stepUpVerificationSchema);
