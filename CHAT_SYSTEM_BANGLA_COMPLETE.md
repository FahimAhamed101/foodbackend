# 💬 Chat System - সম্পূর্ণ বিবরণ (বাংলা)

**তারিখ:** ফেব্রুয়ারি ২৬, ২০২৬  
**স্ট্যাটাস:** ✅ সম্পূর্ণ এবং কার্যকর

---

## 📋 Chat System কি আছে?

আপনার EMDR Food Delivery Platform এ একটি **সম্পূর্ণ real-time chat system** আছে যেখানে:

### ✅ কারা কার সাথে chat করতে পারে:

1. **Customer → Provider** (গ্রাহক → রেস্টুরেন্ট)
   - অর্ডার সম্পর্কে প্রশ্ন করতে পারে
   - খাবার সম্পর্কে জানতে পারে
   - ডেলিভারি সম্পর্কে কথা বলতে পারে

2. **Provider → Admin** (রেস্টুরেন্ট → এডমিন)
   - সাহায্য চাইতে পারে
   - সমস্যা রিপোর্ট করতে পারে
   - সেটিংস সম্পর্কে জানতে পারে

3. **Customer → Admin** (গ্রাহক → এডমিন)
   - সাপোর্ট চাইতে পারে
   - অভিযোগ করতে পারে
   - একাউন্ট সমস্যা সমাধান করতে পারে

---

## 🎯 Chat System এর Features

### ✅ 1. Conversation Management

**Conversation কি?**
- দুইজন user এর মধ্যে একটি chat room
- সব messages এক জায়গায় থাকে
- Inbox এ সব conversations দেখা যায়

**Features:**
- ✅ নতুন conversation শুরু করা
- ✅ সব conversations দেখা (inbox)
- ✅ একটি conversation এর সব messages দেখা
- ✅ Conversation archive করা
- ✅ Unread messages mark করা

---

### ✅ 2. Message Types

**কি ধরনের messages পাঠানো যায়:**

1. **TEXT Message** (শুধু লেখা)
   ```json
   {
     "receiverId": "provider_id",
     "text": "আমার অর্ডার কখন আসবে?"
   }
   ```

2. **IMAGE Message** (শুধু ছবি)
   ```
   Form-data:
   - receiverId: provider_id
   - image: [file upload]
   ```

3. **MIXED Message** (লেখা + ছবি)
   ```
   Form-data:
   - receiverId: provider_id
   - text: "এই খাবারটা দেখুন"
   - image: [file upload]
   ```

---

### ✅ 3. Real-time Features

**কি কি real-time হয়:**
- ✅ Message পাঠানো মাত্র receiver পায়
- ✅ Read status update হয়
- ✅ Last message update হয়
- ✅ Unread count update হয়

---

## 🗄️ Database Structure

### ChatRoom Model

```typescript
{
  _id: ObjectId,
  participants: [userId1, userId2],  // দুইজন user
  isActive: true,                     // Active/Archived
  lastMessage: messageId,             // শেষ message
  createdAt: Date,
  updatedAt: Date
}
```

**Example:**
```json
{
  "_id": "65f1234567890abcdef12345",
  "participants": [
    "699a469eaf1d0c8714b662e0",  // Customer ID
    "69714abce548ab10b90c0e50"   // Provider ID
  ],
  "isActive": true,
  "lastMessage": "65f9876543210fedcba98765",
  "createdAt": "2026-02-26T10:00:00.000Z",
  "updatedAt": "2026-02-26T10:30:00.000Z"
}
```

---

### Message Model

```typescript
{
  _id: ObjectId,
  chatRoomId: ObjectId,              // কোন conversation এ
  sender: ObjectId,                   // কে পাঠিয়েছে
  content: string,                    // Message text
  imageUrl?: string,                  // Image URL (optional)
  messageType: 'TEXT' | 'IMAGE' | 'MIXED',
  readBy: [userId1, userId2],        // কারা পড়েছে
  createdAt: Date,
  updatedAt: Date
}
```

**Example:**
```json
{
  "_id": "65f9876543210fedcba98765",
  "chatRoomId": "65f1234567890abcdef12345",
  "sender": "699a469eaf1d0c8714b662e0",
  "content": "আমার অর্ডার কখন আসবে?",
  "imageUrl": null,
  "messageType": "TEXT",
  "readBy": ["699a469eaf1d0c8714b662e0"],
  "createdAt": "2026-02-26T10:30:00.000Z",
  "updatedAt": "2026-02-26T10:30:00.000Z"
}
```

---

## 🔌 API Endpoints

### 1️⃣ Get All Conversations (Inbox)

**Endpoint:**
```
GET /api/v1/chat/conversations
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "65f1234567890abcdef12345",
      "otherUser": {
        "id": "69714abce548ab10b90c0e50",
        "name": "Pizza House",
        "avatar": "https://...",
        "role": "PROVIDER"
      },
      "lastMessage": {
        "text": "আপনার অর্ডার পাঠানো হয়েছে",
        "timestamp": "2026-02-26T10:30:00.000Z",
        "sender": "provider"
      },
      "unreadCount": 2,
      "isActive": true,
      "updatedAt": "2026-02-26T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

---

### 2️⃣ Start New Conversation

**Endpoint:**
```
POST /api/v1/chat/conversations
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "providerId": "69714abce548ab10b90c0e50"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "65f1234567890abcdef12345",
    "otherUser": {
      "id": "69714abce548ab10b90c0e50",
      "name": "Pizza House",
      "avatar": "https://...",
      "role": "PROVIDER"
    },
    "lastMessage": null,
    "unreadCount": 0,
    "isActive": true,
    "createdAt": "2026-02-26T10:00:00.000Z"
  }
}
```

---

### 3️⃣ Get Single Conversation

**Endpoint:**
```
GET /api/v1/chat/conversations/{conversationId}
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "65f1234567890abcdef12345",
    "otherUser": {
      "id": "69714abce548ab10b90c0e50",
      "name": "Pizza House",
      "avatar": "https://...",
      "role": "PROVIDER"
    },
    "lastMessage": {
      "text": "আপনার অর্ডার পাঠানো হয়েছে",
      "timestamp": "2026-02-26T10:30:00.000Z"
    },
    "unreadCount": 2,
    "isActive": true
  }
}
```

---

### 4️⃣ Get Conversation Messages

**Endpoint:**
```
GET /api/v1/chat/conversations/{conversationId}/messages?page=1&limit=20
```

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "65f9876543210fedcba98765",
      "sender": {
        "id": "699a469eaf1d0c8714b662e0",
        "name": "John Doe",
        "avatar": "https://...",
        "role": "CUSTOMER"
      },
      "content": "আমার অর্ডার কখন আসবে?",
      "imageUrl": null,
      "messageType": "TEXT",
      "isRead": true,
      "createdAt": "2026-02-26T10:30:00.000Z"
    },
    {
      "id": "65f9876543210fedcba98766",
      "sender": {
        "id": "69714abce548ab10b90c0e50",
        "name": "Pizza House",
        "avatar": "https://...",
        "role": "PROVIDER"
      },
      "content": "আপনার অর্ডার পাঠানো হয়েছে",
      "imageUrl": null,
      "messageType": "TEXT",
      "isRead": false,
      "createdAt": "2026-02-26T10:31:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

---

### 5️⃣ Send Text Message

**Endpoint:**
```
POST /api/v1/chat/message/customer-to-provider
POST /api/v1/chat/message/provider-to-admin
POST /api/v1/chat/message/customer-to-admin
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "receiverId": "69714abce548ab10b90c0e50",
  "text": "আমার অর্ডার কখন আসবে?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "65f9876543210fedcba98765",
    "status": "pending",
    "imageUrl": null,
    "text": "আমার অর্ডার কখন আসবে?",
    "createdAt": "2026-02-26T10:30:00.000Z"
  }
}
```

---

### 6️⃣ Send Image Message

**Endpoint:**
```
POST /api/v1/chat/message/customer-to-provider
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (Form-data):**
```
receiverId: 69714abce548ab10b90c0e50
text: এই খাবারটা দেখুন (optional)
image: [file upload]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "65f9876543210fedcba98765",
    "status": "pending",
    "imageUrl": "https://res.cloudinary.com/...",
    "text": "এই খাবারটা দেখুন",
    "createdAt": "2026-02-26T10:30:00.000Z"
  }
}
```

---

### 7️⃣ Mark as Read

**Endpoint:**
```
PATCH /api/v1/chat/conversations/{conversationId}/read
```

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Marked as read"
}
```

---

### 8️⃣ Archive Conversation

**Endpoint:**
```
PATCH /api/v1/chat/conversations/{conversationId}/archive
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "status": "ARCHIVED"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "65f1234567890abcdef12345",
    "status": "ARCHIVED",
    "updatedAt": "2026-02-26T10:35:00.000Z"
  },
  "meta": {
    "timestamp": "2026-02-26T10:35:00.000Z"
  }
}
```

---

## 🔄 Chat Flow (কিভাবে কাজ করে)

### Scenario 1: Customer → Provider Chat

**Step 1: Customer নতুন conversation শুরু করে**
```
POST /chat/conversations
Body: { "providerId": "provider_id" }
→ Conversation তৈরি হয় বা existing conversation return হয়
```

**Step 2: Customer message পাঠায়**
```
POST /chat/message/customer-to-provider
Body: { "receiverId": "provider_id", "text": "Hello!" }
→ Message save হয়
→ ChatRoom এর lastMessage update হয়
```

**Step 3: Provider inbox check করে**
```
GET /chat/conversations
→ সব conversations দেখে
→ Unread count দেখে
```

**Step 4: Provider messages পড়ে**
```
GET /chat/conversations/{conversationId}/messages
→ সব messages দেখে
```

**Step 5: Provider mark as read করে**
```
PATCH /chat/conversations/{conversationId}/read
→ সব messages read হয়ে যায়
```

**Step 6: Provider reply করে**
```
POST /chat/message/customer-to-provider
Body: { "receiverId": "customer_id", "text": "Hi! How can I help?" }
→ Message save হয়
```

---

### Scenario 2: Image সহ Message

**Step 1: Customer image upload করে**
```
POST /chat/message/customer-to-provider
Content-Type: multipart/form-data
Body:
  - receiverId: provider_id
  - text: "এই খাবারটা দেখুন"
  - image: [file]
```

**Step 2: Backend process করে**
```
1. Image Cloudinary তে upload হয়
2. Image URL পাওয়া যায়
3. Message save হয় (messageType: 'MIXED')
4. ChatRoom update হয়
```

**Step 3: Provider image দেখে**
```
GET /chat/conversations/{conversationId}/messages
→ Message এ imageUrl থাকে
→ Frontend image display করে
```

---

## 🎨 Frontend Integration

### React/Next.js Example

**1. Get Conversations:**
```javascript
const getConversations = async () => {
  const response = await fetch('/api/v1/chat/conversations', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data; // Array of conversations
};
```

**2. Send Text Message:**
```javascript
const sendMessage = async (receiverId, text) => {
  const response = await fetch('/api/v1/chat/message/customer-to-provider', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ receiverId, text })
  });
  const data = await response.json();
  return data.data;
};
```

**3. Send Image Message:**
```javascript
const sendImageMessage = async (receiverId, text, imageFile) => {
  const formData = new FormData();
  formData.append('receiverId', receiverId);
  formData.append('text', text);
  formData.append('image', imageFile);

  const response = await fetch('/api/v1/chat/message/customer-to-provider', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  const data = await response.json();
  return data.data;
};
```

**4. Get Messages:**
```javascript
const getMessages = async (conversationId, page = 1) => {
  const response = await fetch(
    `/api/v1/chat/conversations/${conversationId}/messages?page=${page}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data; // Array of messages
};
```

**5. Mark as Read:**
```javascript
const markAsRead = async (conversationId) => {
  await fetch(`/api/v1/chat/conversations/${conversationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
```

---

## 🧪 Postman দিয়ে Testing

### Step 1: Collection Import করুন
```
File → Import → postmanfile/postman_chat_system_complete.json
```

### Step 2: Login করুন
```
POST /auth/login
→ Token automatically save হবে
```

### Step 3: Conversations দেখুন
```
GET /chat/conversations
→ সব conversations দেখবেন
```

### Step 4: নতুন Conversation শুরু করুন
```
POST /chat/conversations
Body: { "providerId": "REAL_PROVIDER_ID" }
→ Conversation ID save হবে
```

### Step 5: Message পাঠান
```
POST /chat/message/customer-to-provider
Body: { "receiverId": "PROVIDER_ID", "text": "Hello!" }
→ Message পাঠানো হবে
```

### Step 6: Messages দেখুন
```
GET /chat/conversations/{conversationId}/messages
→ সব messages দেখবেন
```

---

## 📊 Database থেকে Real IDs পাওয়া

### MongoDB Compass বা mongo shell এ:

**Provider ID পেতে:**
```javascript
db.users.findOne({ role: "PROVIDER" }, { _id: 1, name: 1 })
```

**Customer ID পেতে:**
```javascript
db.users.findOne({ role: "CUSTOMER" }, { _id: 1, name: 1 })
```

**Admin ID পেতে:**
```javascript
db.users.findOne({ role: "ADMIN" }, { _id: 1, name: 1 })
```

**Existing Conversations দেখতে:**
```javascript
db.chatrooms.find().populate('participants').populate('lastMessage')
```

**Messages দেখতে:**
```javascript
db.messages.find({ chatRoomId: ObjectId("conversation_id") })
```

---

## ✅ Chat System এর সুবিধা

### 1. **Automatic Room Creation**
- User প্রথমবার message পাঠালে automatically conversation তৈরি হয়
- Duplicate conversation তৈরি হয় না

### 2. **Image Support**
- Cloudinary তে image upload হয়
- 5MB পর্যন্ত image support
- Image URL save হয়

### 3. **Read Status**
- কে কখন message পড়েছে track করা যায়
- Unread count automatically calculate হয়

### 4. **Archive Feature**
- পুরনো conversations archive করা যায়
- Archive করলেও data থাকে

### 5. **Pagination**
- Messages page by page load হয়
- Performance ভালো থাকে

---

## 🔒 Security Features

### ✅ Authentication Required
- সব endpoints JWT protected
- শুধু authenticated users access করতে পারে

### ✅ Authorization
- User শুধু নিজের conversations দেখতে পারে
- অন্যের messages access করতে পারে না

### ✅ File Upload Security
- শুধু image files allowed
- 5MB size limit
- Cloudinary secure upload

---

## 🎯 Summary

**আপনার Chat System এ আছে:**

✅ Customer ↔ Provider chat  
✅ Provider ↔ Admin chat  
✅ Customer ↔ Admin chat  
✅ Text messages  
✅ Image messages  
✅ Mixed messages (text + image)  
✅ Conversation list (inbox)  
✅ Message history  
✅ Read/Unread status  
✅ Archive feature  
✅ Pagination  
✅ Cloudinary image upload  
✅ JWT authentication  
✅ Complete Postman collection  

**সব কিছু কাজ করছে এবং production-ready!** 🚀

---

**তৈরি করেছেন:** Kiro AI Assistant 🇧🇩  
**তারিখ:** ফেব্রুয়ারি ২৬, ২০২৬  
**স্ট্যাটাস:** ✅ সম্পূর্ণ এবং কার্যকর
