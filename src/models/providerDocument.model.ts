import { Schema, model, Document, Types } from 'mongoose';

export interface IProviderDocument extends Document {
    providerId: Types.ObjectId;
    businessLicense: string;
    EIN: string;
    healthPermit: string;
    stateOrCityLicense: string;
    proofOfAddress: string;
    ownerGovernmentID: string;
    businessBankName: string;
    businessBankAccountNumber: string;
    businessBankRoutingNumber: string;
    documentStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    adminNotes?: string;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const providerDocumentSchema = new Schema<IProviderDocument>(
    {
        providerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        businessLicense: { type: String, default: '' },
        EIN: { type: String, default: '' },
        healthPermit: { type: String, default: '' },
        stateOrCityLicense: { type: String, default: '' },
        proofOfAddress: { type: String, default: '' },
        ownerGovernmentID: { type: String, default: '' },
        businessBankName: { type: String, default: '' },
        businessBankAccountNumber: { type: String, default: '' },
        businessBankRoutingNumber: { type: String, default: '' },
        documentStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        rejectionReason: { type: String },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        adminNotes: { type: String },
        submittedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const ProviderDocument = model<IProviderDocument>('ProviderDocument', providerDocumentSchema);
