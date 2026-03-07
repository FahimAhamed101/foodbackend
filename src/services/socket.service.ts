import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/user.model';
import { ChatRoom } from '../models/chatRoom.model';
import { Message } from '../models/message.model';
import { Notification, NotificationType } from '../models/notification.model';

// Extend socket definition
declare module 'socket.io' {
    interface Socket {
        user?: { userId: string; role: string };
    }
}

class SocketService {
    private io: Server;

    constructor() {
        this.io = null as any;
    }

    public init(httpServer: any) {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        // Auth Middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.token;
                if (!token) return next(new Error('Authentication error: Token required'));

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key') as { userId: string; role: string };
                const user = await User.findById(decoded.userId);

                if (!user) return next(new Error('Authentication error: User not found'));

                socket.user = { userId: user._id.toString(), role: user.role };
                next();
            } catch (err) {
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this.io.on('connection', (this.handleConnection.bind(this)));
        console.log('Socket.IO initialized with Notifications');
    }

    private handleConnection(socket: Socket) {
        const { userId, role } = socket.user!;

        console.log(`User connected: ${userId} (${role})`);

        // 1. Join Personal Room for Notifications
        socket.join(userId);

        // 2. Join Role Room (For Admin Dashboard presence)
        socket.join(`role_${role}`);

        socket.on('join_room', async ({ targetUserId }, callback) => {
            this.handleJoinRoom(socket, targetUserId, callback);
        });

        socket.on('send_message', async (data, callback) => {
            this.handleSendMessage(socket, data, callback);
        });

        socket.on('typing', ({ chatRoomId }) => {
            socket.to(chatRoomId).emit('typing', { userId, chatRoomId });
        });

        socket.on('stop_typing', ({ chatRoomId }) => {
            socket.to(chatRoomId).emit('stop_typing', { userId, chatRoomId });
        });

        socket.on('disconnect', () => {
            // Admin Dashboard could update "Online Status" here
            // socket.to('role_ADMIN').emit('user_offline', { userId });
        });
    }

    private async handleJoinRoom(socket: Socket, targetUserId: string, callback: any) {
        try {
            const currentUserId = socket.user!.userId;
            const currentUserRole = socket.user!.role;

            const targetUser = await User.findById(targetUserId);
            if (!targetUser) throw new Error('Target user not found');

            // RBAC
            if ((currentUserRole === UserRole.CUSTOMER && targetUser.role === UserRole.ADMIN) ||
                (currentUserRole === UserRole.ADMIN && targetUser.role === UserRole.CUSTOMER)) {
                throw new Error('Chat forbidden between Customer and Admin');
            }

            let room = await ChatRoom.findOne({ participants: { $all: [currentUserId, targetUserId] } });

            if (!room) {
                room = await ChatRoom.create({ participants: [currentUserId, targetUserId], isActive: true });
            }

            const roomId = room._id.toString();
            socket.join(roomId);

            // Fetch last 50 messages
            const messages = await Message.find({ chatRoomId: room._id })
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('sender', 'fullName profilePic')
                .lean();

            if (callback) callback({ status: 'ok', roomId, messages: messages.reverse() });

        } catch (error: any) {
            console.error('Join Error:', error);
            if (callback) callback({ status: 'error', message: error.message });
        }
    }

    private async handleSendMessage(socket: Socket, { chatRoomId, content }: any, callback: any) {
        try {
            const message = await Message.create({
                chatRoomId,
                sender: socket.user!.userId,
                content,
                readBy: [socket.user!.userId]
            });

            await ChatRoom.findByIdAndUpdate(chatRoomId, { lastMessage: message._id });

            const populatedMessage = await message.populate('sender', 'fullName profilePic');

            // Broadcast to the chat room
            this.io.to(chatRoomId).emit('receive_message', populatedMessage);

            // Handle Notification for Recipient
            // Identify recipient (the one who is NOT the sender)
            const room = await ChatRoom.findById(chatRoomId);
            if (room) {
                const recipientId = room.participants.find(p => p.toString() !== socket.user!.userId);
                if (recipientId) {
                    // Check if recipient is IN the room? (Optimization: Socket.io 4 has detailed room API)
                    // reliable approach: Just emit to their personal room 'notification'
                    // Frontend decides to show toast or not (if already in chat view)

                    // 1. Persist Notification (For Activity Feed)
                    await Notification.create({
                        userId: recipientId,
                        type: NotificationType.MESSAGE,
                        title: `New message from ${(populatedMessage.sender as any).fullName}`,
                        message: content.substring(0, 50),
                        metadata: { chatRoomId, senderId: socket.user!.userId }
                    });

                    // 2. Emit Real-time signal
                    this.io.to(recipientId.toString()).emit('notification', {
                        type: 'message',
                        chatRoomId,
                        senderName: (populatedMessage.sender as any).fullName,
                        content: content.substring(0, 30)
                    });
                }
            }

            if (callback) callback({ status: 'ok', message: populatedMessage });

        } catch (error: any) {
            console.error('Send Error:', error);
            if (callback) callback({ status: 'error', message: error.message });
        }
    }
}

export const socketService = new SocketService();
