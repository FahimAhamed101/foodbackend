import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
    chatRoomId: Types.ObjectId;
    sender: Types.ObjectId;
    content: string;
    imageUrl?: string;
    messageType: 'TEXT' | 'IMAGE' | 'MIXED';
    readBy: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        chatRoomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: false, trim: true }, // Made optional for image-only messages
        imageUrl: { type: String, required: false }, // New field
        messageType: { type: String, enum: ['TEXT', 'IMAGE', 'MIXED'], default: 'TEXT' }, // New field
        readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

// Index for efficient retrieval of messages per chat
messageSchema.index({ chatRoomId: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
