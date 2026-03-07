import { Schema, model, Document } from 'mongoose';

export enum LegalDocumentStatus {
    ACTIVE = 'Active',
    DRAFT = 'Draft',
}

export interface ILegalDocument extends Document {
    documentName: string;
    type: string;
    size: string;
    fileUrl: string;
    status: LegalDocumentStatus;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const legalDocumentSchema = new Schema<ILegalDocument>(
    {
        documentName: {
            type: String,
            required: [true, 'Document name is required'],
            trim: true,
        },
        type: {
            type: String,
            required: [true, 'Document type is required'],
            trim: true,
        },
        size: {
            type: String,
            required: [true, 'Document size is required'],
        },
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
        },
        status: {
            type: String,
            enum: Object.values(LegalDocumentStatus),
            default: LegalDocumentStatus.DRAFT,
        },
        uploadedBy: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const LegalDocument = model<ILegalDocument>('LegalDocument', legalDocumentSchema);
