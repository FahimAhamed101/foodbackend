import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/authenticate';
import { ChatRoom } from '../models/chatRoom.model';
import { Message } from '../models/message.model';
import { UserRole, User } from '../models/user.model';
import AppError from '../utils/AppError';
import cloudinaryConfig from '../config/cloudinary';

// ... (Previous imports and helpers remain unchanged - kept implicitly for context)

// --- HELPER: Format Response ---
const formatResponse = (data: any) => ({
    success: true,
    data,
    meta: {
        timestamp: new Date().toISOString()
    }
});

const formatUser = (user: any, role: string) => {
    if (!user) return null;
    return {
        id: user._id,
        email: user.email,
        profile: {
            fullName: user.fullName,
            profilePicture: user.profilePic || null,
            companyName: null
        }
    };
};

const transformConversation = (room: any, currentUserId: string) => {
    const participants = room.participantDetails || room.participants;

    // Identify Customer and Provider
    let customer = participants.find((p: any) => p.role === UserRole.CUSTOMER);
    let provider = participants.find((p: any) => p.role === UserRole.PROVIDER);

    // Fallback logic
    if (!customer) customer = participants.find((p: any) => p._id.toString() !== room.participants[1]?.toString());

    return {
        id: room._id,
        customerId: customer?._id,
        providerId: provider?._id,
        status: room.isActive ? 'ACTIVE' : 'ARCHIVED',
        lastMessageAt: room.lastMessageDetails?.createdAt || room.updatedAt,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        customer: formatUser(customer, UserRole.CUSTOMER),
        provider: formatUser(provider, UserRole.PROVIDER),
        messages: (room.recentMessages || []).map((msg: any) => ({
            id: msg._id,
            content: msg.content,
            senderId: msg.sender,
            role: msg.senderDetails?.role || 'UNKNOWN',
            type: msg.messageType || 'TEXT',
            attachmentUrl: msg.imageUrl || null,
            createdAt: msg.createdAt
        })).reverse(), // Show in chronological order within the array
        _count: {
            messages: room.messageCount || 0
        },
        lastMessage: room.lastMessageDetails ? {
            content: room.lastMessageDetails.content,
            createdAt: room.lastMessageDetails.createdAt
        } : null,
        unreadCount: room.unreadCount || 0
    };
};

// 1. GET CONVERSATIONS (Inbox)
export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = new Types.ObjectId(req.user?.userId);
        const limit = parseInt(req.query.limit as string) || 20;

        const conversations = await ChatRoom.aggregate([
            { $match: { participants: userId, isActive: true } }, // Filter out archived/inactive by default
            {
                $lookup: {
                    from: 'messages',
                    localField: 'lastMessage',
                    foreignField: '_id',
                    as: 'lastMessageDetails'
                }
            },
            { $unwind: { path: '$lastMessageDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { roomId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$chatRoomId', '$$roomId'] },
                                        { $not: { $in: [userId, '$readBy'] } }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'unreadInfo'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { roomId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$chatRoomId', '$$roomId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'totalMessagesInfo'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { roomId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$chatRoomId', '$$roomId'] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'sender',
                                foreignField: '_id',
                                as: 'senderDetails'
                            }
                        },
                        { $unwind: { path: '$senderDetails', preserveNullAndEmptyArrays: true } }
                    ],
                    as: 'recentMessages'
                }
            },
            {
                $project: {
                    _id: 1,
                    isActive: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    participants: 1,
                    participantDetails: 1,
                    lastMessageDetails: 1,
                    recentMessages: 1,
                    unreadCount: { $ifNull: [{ $arrayElemAt: ['$unreadInfo.count', 0] }, 0] },
                    messageCount: { $ifNull: [{ $arrayElemAt: ['$totalMessagesInfo.count', 0] }, 0] }
                }
            },
            { $sort: { updatedAt: -1 } },
            { $limit: limit }
        ]);

        const formattedConversations = conversations.map(c => transformConversation(c, userId.toString()));

        res.status(200).json(formatResponse({
            conversations: formattedConversations,
            cursor: null,
            hasMore: false
        }));

    } catch (error) {
        next(error);
    }
};

// 2. GET SINGLE CONVERSATION
export const getConversationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { conversationId } = req.params;
        const userId = new Types.ObjectId(req.user?.userId);

        const conversationAgg = await ChatRoom.aggregate([
            { $match: { _id: new Types.ObjectId(conversationId as string) } },
            // Note: Removed participant check in match to allow viewing, checked later or assumed allowed
            {
                $lookup: {
                    from: 'messages',
                    localField: 'lastMessage',
                    foreignField: '_id',
                    as: 'lastMessageDetails'
                }
            },
            { $unwind: { path: '$lastMessageDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { roomId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$chatRoomId', '$$roomId'] },
                                        { $not: { $in: [userId, '$readBy'] } }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'unreadInfo'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { roomId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$chatRoomId', '$$roomId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'totalMessagesInfo'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { roomId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$chatRoomId', '$$roomId'] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'sender',
                                foreignField: '_id',
                                as: 'senderDetails'
                            }
                        },
                        { $unwind: { path: '$senderDetails', preserveNullAndEmptyArrays: true } }
                    ],
                    as: 'recentMessages'
                }
            },
            {
                $project: {
                    _id: 1,
                    isActive: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    participants: 1,
                    participantDetails: 1,
                    lastMessageDetails: 1,
                    recentMessages: 1,
                    unreadCount: { $ifNull: [{ $arrayElemAt: ['$unreadInfo.count', 0] }, 0] },
                    messageCount: { $ifNull: [{ $arrayElemAt: ['$totalMessagesInfo.count', 0] }, 0] }
                }
            }
        ]);

        if (!conversationAgg.length) {
            return next(new AppError('Conversation not found', 404));
        }

        const formatted = transformConversation(conversationAgg[0], userId.toString());

        res.status(200).json(formatResponse(formatted));
    } catch (error) {
        next(error);
    }
};

// 3. GET MESSAGES
export const getConversationMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { conversationId } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ chatRoomId: conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'fullName email role profilePic');

        const formattedMessages = messages.map(msg => {
            const sender = msg.sender as any;
            const isRead = msg.readBy.length > 1;

            return {
                id: msg._id,
                conversationId: msg.chatRoomId,
                senderId: sender._id,
                type: msg.messageType || 'TEXT',
                content: msg.content,
                attachmentUrl: msg.imageUrl || null,
                isRead: isRead,
                readAt: isRead ? msg.updatedAt : null,
                deletedAt: null,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
                sender: {
                    id: sender._id,
                    email: sender.email,
                    role: sender.role,
                    profile: {
                        fullName: sender.fullName,
                        profilePicture: sender.profilePic || null
                    }
                }
            };
        });

        res.status(200).json(formatResponse({
            messages: formattedMessages.reverse(),
            cursor: null,
            hasMore: messages.length === limit
        }));

    } catch (error) {
        next(error);
    }
};

// 4. START Conversation
export const startConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { providerId } = req.body;
        const customerId = req.user?.userId;

        let room = await ChatRoom.findOne({
            participants: { $all: [customerId, providerId] }
        });

        if (!room) {
            room = await ChatRoom.create({
                participants: [customerId, providerId],
                isActive: true
            });
        }

        req.params.conversationId = room._id.toString();
        return getConversationById(req, res, next);

    } catch (error) {
        next(error);
    }
};

// 5. MARK READ (Updated to PATCH /read response format)
export const markRoomAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.userId;

        await Message.updateMany(
            { chatRoomId: conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
        next(error);
    }
};

// 6. ARCHIVE CONVERSATION
export const archiveConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { conversationId } = req.params;
        const { status } = req.body; // Expecting "ARCHIVED"

        const isActive = status !== 'ARCHIVED';

        // Update the room
        const room = await ChatRoom.findByIdAndUpdate(
            conversationId,
            { isActive: isActive },
            { new: true }
        );

        if (!room) {
            return next(new AppError('Conversation not found', 404));
        }

        // Return standard response format (could return the full object, but succcess is usually enough)
        res.status(200).json({
            success: true,
            data: {
                id: room._id,
                status: room.isActive ? 'ACTIVE' : 'ARCHIVED',
                updatedAt: room.updatedAt
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        next(error);
    }
};

// 7. SEND MESSAGE (TEXT + IMAGE)
export const sendMessageWithImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        let { receiverId, text } = body;
        const senderId = req.user?.userId;

        // If 'Text' (capitalized) is sent from Postman form-data, accept it
        if (!text && body.Text) text = body.Text;

        const file = req.file; // From multer

        // Validation
        if (!text && !file) {
            return next(new AppError('Message must contain text or image', 400));
        }

        if (!receiverId) {
            return next(new AppError('Receiver ID is required', 400));
        }


        // 1. Determine Chat Room (Find or Create)
        // Ensure participants are sorted or handled consistently if needed. Here rely on $all.
        let room = await ChatRoom.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!room) {
            room = await ChatRoom.create({
                participants: [senderId, receiverId], // Create new room
                isActive: true
            });
        }

        // 2. Upload Image if present
        let imageUrl: any = null;
        if (file) {
            imageUrl = await new Promise((resolve, reject) => {
                const uploadStream = cloudinaryConfig.cloudinary.uploader.upload_stream(
                    { folder: 'chat_images' },
                    (error: any, result: any) => {
                        if (error) return reject(error);
                        resolve(result?.secure_url || null);
                    }
                );
                uploadStream.end(file.buffer);
            });
        }


        // 3. Determine Message Type
        let messageType = 'TEXT';
        if (imageUrl && !text) messageType = 'IMAGE';
        else if (imageUrl && text) messageType = 'MIXED';

        // 4. Save Message
        const message: any = await Message.create({
            chatRoomId: room._id,
            sender: senderId,
            content: text || '',
            imageUrl: imageUrl,
            messageType: messageType,
            readBy: [] // Initially unread
        });

        // 5. Update Room Last Message
        await ChatRoom.findByIdAndUpdate(room._id, {
            lastMessage: message._id,
            isActive: true,
        });

        // 6. Return Response
        res.status(201).json({
            success: true,
            data: {
                messageId: message._id,
                status: 'pending',
                imageUrl: imageUrl,
                text: text,
                createdAt: message.createdAt
            }
        });

    } catch (error) {
        next(error);
    }
};
