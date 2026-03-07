import { Schema, model, Document, Types } from 'mongoose';

export enum ViolationStatus {
    PENDING = 'Pending',
    WARNED = 'Warned',
    REMOVED = 'Removed',
    RESOLVED = 'Resolved'
}

export interface IComplianceViolation extends Document {
    listingId: Types.ObjectId; // Reference to Food item
    providerId: Types.ObjectId; // Reference to Restaurant
    issue: string; // e.g., "Alcohol listing in restricted state"
    detectedKeywords: string[]; // e.g., ["beer"]
    status: ViolationStatus;
    severity: 'Low' | 'Medium' | 'High';
    createdAt: Date;
    updatedAt: Date;
}

const complianceViolationSchema = new Schema<IComplianceViolation>(
    {
        listingId: {
            type: Schema.Types.ObjectId,
            ref: 'Food',
            required: true,
            index: true
        },
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        issue: {
            type: String,
            required: true
        },
        detectedKeywords: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: Object.values(ViolationStatus),
            default: ViolationStatus.PENDING,
            index: true
        },
        severity: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium'
        }
    },
    {
        timestamps: true
    }
);

export const ComplianceViolation = model<IComplianceViolation>('ComplianceViolation', complianceViolationSchema);
