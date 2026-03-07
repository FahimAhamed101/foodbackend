import { SupportTicket, TicketStatus } from '../models/supportTicket.model';
import { User, UserRole } from '../models/user.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

import { ChatRoom } from '../models/chatRoom.model';

class SupportTicketService {
    /**
     * Create a new support ticket
     */
    async createTicket(userId: string, data: any) {
        const user = await User.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        const userType = user.role === UserRole.PROVIDER ? 'Restaurant' : 'Customer';

        // Auto-create a ChatRoom if not provided
        let chatRoomId = data.chatRoomId;
        if (!chatRoomId) {
            // Find an admin to add to the chat room (optional, or just add the user)
            const admin = await User.findOne({ role: UserRole.ADMIN });
            const participants = [new Types.ObjectId(userId)];
            if (admin) participants.push(admin._id as Types.ObjectId);

            const newRoom = await ChatRoom.create({
                participants,
                isActive: true
            });
            chatRoomId = newRoom._id;
        }

        const ticket = await SupportTicket.create({
            userId: new Types.ObjectId(userId),
            userType,
            subject: data.subject,
            description: data.description,
            priority: data.priority,
            chatRoomId: new Types.ObjectId(chatRoomId)
        });

        return ticket;
    }

    /**
     * Get tickets for Admin with search and filters
     */
    async getAdminTickets(queryParams: any) {
        const { search, status, priority, userType, page = 1, limit = 10 } = queryParams;

        const filter: any = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (userType) filter.userType = userType;
        if (search) {
            filter.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { ticketId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [tickets, total] = await Promise.all([
            SupportTicket.find(filter)
                .populate('userId', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            SupportTicket.countDocuments(filter)
        ]);

        const admin = await User.findOne({ role: UserRole.ADMIN }).select('_id');

        const formattedTickets = await Promise.all(tickets.map(async (t: any) => {
            let chatRoomId = t.chatRoomId;

            // Auto-Healing: If chatRoomId is empty, create one and update the ticket
            if (!chatRoomId) {
                const participants = [t.userId?._id || t.userId];
                if (admin) participants.push(admin._id as Types.ObjectId);

                const newRoom = await ChatRoom.create({
                    participants,
                    isActive: true
                });
                chatRoomId = newRoom._id;

                // Sync back to database so next time it's already there
                await SupportTicket.findByIdAndUpdate(t._id, { chatRoomId: newRoom._id });
            }

            return {
                id: t._id,
                "convershasonId": chatRoomId,
                "userID": t.userId?._id || t.userId || "",
                "Ticket ID": t.ticketId,
                "Subject": t.subject,
                "User Type": t.userType,
                "User": t.userId?.fullName || 'Unknown User',
                "Priority": t.priority,
                "Status": t.status,
                "Date": t.createdAt,
                "Description": t.description
            };
        }));

        return {
            tickets: formattedTickets,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    /**
     * Get tickets for a specific user
     */
    async getUserTickets(userId: string) {
        return await SupportTicket.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
    }

    /**
     * Update ticket status or priority
     */
    async updateTicket(ticketId: string, data: any) {
        const ticket = await SupportTicket.findByIdAndUpdate(
            ticketId,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!ticket) throw new AppError('Ticket not found', 404);
        return ticket;
    }

    /**
     * Get single ticket details
     */
    async getTicket(ticketId: string) {
        const ticket = await SupportTicket.findById(ticketId).populate('userId', 'fullName email phone');
        if (!ticket) throw new AppError('Ticket not found', 404);
        return ticket;
    }
}

export default new SupportTicketService();
