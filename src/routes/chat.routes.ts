import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import {
    getConversations,
    getConversationById,
    getConversationMessages,
    startConversation,
    markRoomAsRead,
    archiveConversation,
    sendMessageWithImage
} from '../controllers/chat.controller';

const router = express.Router();

router.use(authenticate);

// 1. Get All Conversations (Inbox)
router.get('/conversations', getConversations);

// 2. Start Conversation
router.post('/conversations', startConversation);

// 3. Get Single Conversation
router.get('/conversations/:conversationId', getConversationById);

// 4. Get Messages for Conversation
router.get('/conversations/:conversationId/messages', getConversationMessages);

// 5. Mark as Read
router.patch('/conversations/:conversationId/read', markRoomAsRead);

// 6. Archive Conversation
router.patch('/conversations/:conversationId/archive', archiveConversation);

// 7. Send Message (Text + Image) - Unified Endpoint
// Configure simple memory storage for multer inside this route file for simplicity, 
// or assume a global upload middleware is available. We will use a basic one here.
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/message/customer-to-provider', upload.single('image'), sendMessageWithImage);
router.post('/message/provider-to-admin', upload.single('image'), sendMessageWithImage);
router.post('/message/customer-to-admin', upload.single('image'), sendMessageWithImage);


export default router;
