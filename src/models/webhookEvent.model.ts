import { Schema, model, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
    eventId: string;
    type: string;
    processed: boolean;
    processedAt?: Date;
    data: any;
    createdAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            index: true,
        },
        processed: {
            type: Boolean,
            default: false,
            index: true,
        },
        processedAt: {
            type: Date,
        },
        data: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// TTL index: Auto-delete webhook events after 30 days
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
