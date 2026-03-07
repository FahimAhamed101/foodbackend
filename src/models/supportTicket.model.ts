import { Schema, model, Document, Types } from 'mongoose';

export enum TicketPriority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High'
}

export enum TicketStatus {
    OPEN = 'Open',
    IN_PROGRESS = 'In Progress',
    RESOLVED = 'Resolved'
}

export interface ISupportTicket extends Document {
    ticketId: string;
    userId: Types.ObjectId;
    userType: 'Customer' | 'Restaurant';
    subject: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
    chatRoomId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
    {
        ticketId: {
            type: String,
            unique: true,
            required: true,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        userType: {
            type: String,
            enum: ['Customer', 'Restaurant'],
            required: true
        },
        subject: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        priority: {
            type: String,
            enum: Object.values(TicketPriority),
            default: TicketPriority.MEDIUM
        },
        status: {
            type: String,
            enum: Object.values(TicketStatus),
            default: TicketStatus.OPEN,
            index: true
        },
        chatRoomId: {
            type: Schema.Types.ObjectId,
            ref: 'ChatRoom'
        }
    },
    {
        timestamps: true
    }
);

// Auto-increment ticketId logic (simple version)
supportTicketSchema.pre('validate', async function () {
    if (this.isNew && !this.ticketId) {
        const SupportTicketModel = model('SupportTicket');
        const lastTicket = await SupportTicketModel.findOne().sort({ createdAt: -1 });

        let nextNum = 1000;
        if (lastTicket && lastTicket.ticketId) {
            const lastNum = parseInt(lastTicket.ticketId.split('-')[1]);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        this.ticketId = `TKT-${nextNum}`;
    }
});

export const SupportTicket = model<ISupportTicket>('SupportTicket', supportTicketSchema);
