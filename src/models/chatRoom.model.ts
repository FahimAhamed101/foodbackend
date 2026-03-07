import { Schema, model, Document, Types } from 'mongoose';

export interface IChatRoom extends Document {
    participants: Types.ObjectId[];
    isActive: boolean;
    lastMessage?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const chatRoomSchema = new Schema<IChatRoom>(
    {
        participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
        isActive: { type: Boolean, default: true },
        lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    },
    { timestamps: true }
);

// Ensure searching for participants is efficient
chatRoomSchema.index({ participants: 1 });

export const ChatRoom = model<IChatRoom>('ChatRoom', chatRoomSchema);
