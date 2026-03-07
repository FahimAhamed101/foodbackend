import { Schema, model, Document, Types } from 'mongoose';

export enum AuditEventType {
    // Authentication events
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    TOKEN_REVOKED = 'TOKEN_REVOKED',

    // Google OAuth events
    GOOGLE_AUTH_SUCCESS = 'GOOGLE_AUTH_SUCCESS',
    GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',
    GOOGLE_TOKEN_INVALID = 'GOOGLE_TOKEN_INVALID',

    // Account events
    ACCOUNT_CREATED = 'ACCOUNT_CREATED',
    ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
    ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED',
    EMAIL_VERIFIED = 'EMAIL_VERIFIED',

    // Role & Permission events
    ROLE_ASSIGNED = 'ROLE_ASSIGNED',
    ROLE_CHANGED = 'ROLE_CHANGED',
    PROVIDER_APPROVED = 'PROVIDER_APPROVED',
    PROVIDER_REJECTED = 'PROVIDER_REJECTED',

    // Step-up verification
    STEP_UP_REQUIRED = 'STEP_UP_REQUIRED',
    STEP_UP_SUCCESS = 'STEP_UP_SUCCESS',
    STEP_UP_FAILED = 'STEP_UP_FAILED',

    // Security events
    SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
    LOCATION_CHANGE = 'LOCATION_CHANGE',
    MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
    TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
    SESSION_HIJACK_SUSPECTED = 'SESSION_HIJACK_SUSPECTED',

    // Provider-specific actions
    PROVIDER_ACTION = 'PROVIDER_ACTION',

    // Business & Activity events
    ORDER_PLACED = 'ORDER_PLACED',
    ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
    MENU_ITEM_CREATED = 'MENU_ITEM_CREATED',
    MENU_ITEM_UPDATED = 'MENU_ITEM_UPDATED',
    MENU_ITEM_DELETED = 'MENU_ITEM_DELETED',
    REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
}

export enum RiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export interface IAuditLog extends Document {
    // Core fields
    eventType: AuditEventType;
    userId?: Types.ObjectId;
    email?: string;

    // Event details
    action: string; // Human-readable description
    resource?: string; // What was accessed/modified
    result: 'success' | 'failure';
    errorMessage?: string;

    // Security context
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    country?: string;
    city?: string;

    // Risk assessment
    riskLevel: RiskLevel;
    riskFactors?: string[]; // e.g., ['new_location', 'unusual_time', 'multiple_devices']

    // Additional metadata
    metadata?: Record<string, any>; // Flexible field for event-specific data

    // Timestamps
    timestamp: Date;
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        eventType: {
            type: String,
            enum: Object.values(AuditEventType),
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        email: {
            type: String,
            lowercase: true,
            index: true,
        },

        action: {
            type: String,
            required: true,
        },
        resource: {
            type: String,
        },
        result: {
            type: String,
            enum: ['success', 'failure'],
            required: true,
            index: true,
        },
        errorMessage: {
            type: String,
        },

        // Security context
        ipAddress: {
            type: String,
            index: true,
        },
        userAgent: {
            type: String,
        },
        deviceId: {
            type: String,
            index: true,
        },
        country: {
            type: String,
        },
        city: {
            type: String,
        },

        // Risk assessment
        riskLevel: {
            type: String,
            enum: Object.values(RiskLevel),
            default: RiskLevel.LOW,
            index: true,
        },
        riskFactors: {
            type: [String],
        },

        metadata: {
            type: Schema.Types.Mixed,
        },

        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ riskLevel: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index - auto-delete logs older than 90 days (configurable)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
