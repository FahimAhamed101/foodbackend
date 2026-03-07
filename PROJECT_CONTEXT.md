# EMDR - Food Delivery Platform - Complete Project Context

## 📋 Project Overview

**Project Name**: EMDR (Food Delivery Management & Restaurant)  
**Type**: Full-stack Food Delivery Platform Backend API  
**Tech Stack**: Node.js + Express + TypeScript + MongoDB + Socket.IO  
**Architecture**: RESTful API with Real-time Features  
**Port**: 5000  
**Database**: MongoDB (Local: mongodb://localhost:27017/emdr-db)

---

## 🎯 Core Business Model

### Three User Roles:
1. **CUSTOMER** - Orders food from restaurants
2. **PROVIDER** - Restaurant owners who manage food items and orders
3. **ADMIN** - Platform administrators with full control

### Key Features:
- Multi-restaurant food ordering system
- Real-time order tracking with Socket.IO
- Provider approval workflow
- Payment processing with multiple methods
- State-based tax calculation
- Platform fee management
- Review and rating system
- Chat system between customers and providers
- Analytics and dashboard for all roles
- Compliance and legal document management

---

## 🏗️ System Architecture

### Technology Stack:

**Backend Framework:**
- Express.js 5.2.1
- TypeScript 5.9.3
- Node.js

**Database & Caching:**
- MongoDB (Mongoose 9.1.3)
- Redis (ioredis 5.9.2) - Session management

**Authentication & Security:**
- JWT (jsonwebtoken 9.0.3)
- bcrypt 6.0.0
- Google OAuth (google-auth-library 10.5.0)
- express-rate-limit 8.2.1

**File Upload & Storage:**
- Cloudinary 2.9.0
- Multer 2.0.2

**Real-time Communication:**
- Socket.IO 4.8.3

**Validation:**
- Zod 4.3.5

**Email:**
- Nodemailer 7.0.12

---

## 📁 Project Structure

```
emdr/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.ts      # Main config (DB, Email, etc.)
│   │   ├── cloudinary.ts # Cloudinary setup
│   │   └── redis.ts      # Redis connection
│   │
│   ├── models/           # MongoDB Schemas (26 models)
│   │   ├── user.model.ts
│   │   ├── order.model.ts
│   │   ├── food.model.ts
│   │   ├── payment.model.ts
│   │   ├── profile.model.ts
│   │   ├── providerProfile.model.ts
│   │   ├── category.model.ts
│   │   ├── cart.model.ts
│   │   ├── favorite.model.ts
│   │   ├── review.model.ts
│   │   ├── notification.model.ts
│   │   ├── state.model.ts
│   │   ├── systemConfig.model.ts
│   │   ├── paymentMethod.model.ts
│   │   ├── banner.model.ts
│   │   ├── chatRoom.model.ts
│   │   ├── message.model.ts
│   │   ├── supportTicket.model.ts
│   │   ├── legalDocument.model.ts
│   │   ├── complianceViolation.model.ts
│   │   ├── auditLog.model.ts
│   │   ├── session.model.ts
│   │   ├── otp.model.ts
│   │   ├── blacklistedToken.model.ts
│   │   ├── stepUpVerification.model.ts
│   │   └── providerDocument.model.ts
│   │
│   ├── controllers/      # Request handlers (40+ controllers)
│   │   ├── auth.controller.ts
│   │   ├── order.controller.ts
│   │   ├── food.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── provider.controller.ts
│   │   ├── dashboard.controller.ts
│   │   ├── analytics.controller.ts
│   │   ├── admin*.controller.ts (10+ admin controllers)
│   │   └── ...
│   │
│   ├── services/         # Business logic (40+ services)
│   │   ├── auth.service.ts
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   ├── notification.service.ts
│   │   ├── socket.service.ts
│   │   ├── cloudinary.service.ts
│   │   ├── sessionManagement.service.ts
│   │   ├── systemConfig.service.ts
│   │   └── ...
│   │
│   ├── routes/           # API endpoints (40+ route files)
│   │   ├── auth.routes.ts
│   │   ├── order.routes.ts
│   │   ├── food.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── admin*.routes.ts
│   │   └── ...
│   │
│   ├── middlewares/      # Express middlewares
│   │   ├── authenticate.ts           # JWT authentication
│   │   ├── authenticateEnhanced.ts   # Enhanced auth with sessions
│   │   ├── requireRole.ts            # Role-based access control
│   │   ├── requireApproval.ts        # Provider approval check
│   │   ├── validate.ts               # Zod validation
│   │   ├── upload.ts                 # File upload (Multer)
│   │   └── errorMiddleware.ts        # Global error handler
│   │
│   ├── validations/      # Zod schemas for validation
│   │   ├── auth.validation.ts
│   │   ├── order.validation.ts
│   │   └── ...
│   │
│   ├── repositories/     # Data access layer
│   │   ├── analytics.repository.ts
│   │   ├── payment.repository.ts
│   │   └── provider.repository.ts
│   │
│   ├── utils/            # Helper functions
│   │   ├── AppError.ts           # Custom error class
│   │   ├── catchAsync.ts         # Async error wrapper
│   │   ├── authUtils.ts          # JWT helpers
│   │   ├── emailService.ts       # Email sending
│   │   ├── emailTemplate.ts      # Email templates
│   │   ├── date.utils.ts         # Date helpers
│   │   └── distance.utils.ts     # Distance calculation
│   │
│   ├── jobs/             # Background jobs
│   │   └── cleanup.job.ts        # Cleanup expired data
│   │
│   ├── data/             # Static data
│   │   └── usa-states.json       # US states data
│   │
│   ├── database/
│   │   └── db.ts         # MongoDB connection
│   │
│   ├── app.ts            # Express app setup
│   ├── server.ts         # Server entry point
│   └── seedStates.ts     # State seeder script
│
├── postmanfile/          # Postman collections
│   ├── postman_order_api_v2.json
│   ├── postman_admin_dashboard_detailed.json
│   ├── postman_admin_settings_v1.json
│   └── postman_admin_transactions_orders.json
│
├── .env                  # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 Authentication & Authorization

### Authentication Methods:
1. **Email/Password** - Traditional registration
2. **Google OAuth** - Social login
3. **JWT Tokens** - Access & Refresh tokens

### Security Features:
- Password hashing with bcrypt
- JWT token-based authentication
- Refresh token rotation
- Session management with Redis
- Rate limiting on all routes
- Step-up verification for sensitive operations
- Blacklisted tokens for logout
- OTP verification for email
- Provider approval workflow

### User Roles & Permissions:
```typescript
enum UserRole {
    CUSTOMER = 'CUSTOMER',    // Can order food, review, chat
    PROVIDER = 'PROVIDER',    // Can manage restaurant, food items, orders
    ADMIN = 'ADMIN'           // Full platform control
}
```

---

## 📦 Core Modules

### 1. Authentication Module
**Routes**: `/api/v1/auth`, `/api/auth` (OAuth)
- Register (Email/Password)
- Login
- Google OAuth
- Email verification
- Password reset
- Refresh token
- Logout
- Session management

### 2. Order Management Module
**Routes**: `/api/v1/orders`, `/api/v1/customer/orders`

**Order Flow:**
```
PENDING → PREPARING → READY_FOR_PICKUP → PICKED_UP → COMPLETED
                                    ↓
                                CANCELLED
```

**Features:**
- Create order with automatic price calculation
- Platform fee (per item quantity or percentage)
- State tax (once per order based on customer state)
- Order status tracking
- Order cancellation (Customer: pending only, Provider: preparing only)
- Real-time notifications
- Order history with pagination

**Pricing Calculation:**
```
Subtotal = Σ(item.price × item.quantity)
Platform Fee = Fixed per item OR Percentage of subtotal
State Tax = Subtotal × State Tax Rate (once per order)
Total Price = Subtotal + Platform Fee + State Tax
```

### 3. Food & Category Module
**Routes**: `/api/v1/foods`, `/api/v1/categories`
- CRUD operations for food items
- Category management
- Image upload to Cloudinary
- Provider-specific food items
- Search and filtering

### 4. Provider Module
**Routes**: `/api/v1/provider`, `/api/v1` (onboarding)

**Provider Onboarding Flow:**
1. Email registration (no password yet)
2. Email verification
3. Password setup
4. Profile completion
5. Document upload
6. Admin approval
7. Account activation

**Features:**
- Provider profile management
- Restaurant details
- Business hours
- Location & delivery radius
- Document verification
- Approval workflow

### 5. Payment Module
**Routes**: `/api/v1/provider/payments`
- Payment tracking
- Transaction history
- Payment methods management
- Revenue analytics
- Payout management

### 6. Dashboard & Analytics
**Routes**: 
- `/api/v1/dashboard` (Provider)
- `/api/v1/provider/analytics`
- `/api/v1/admin/dashboard`
- `/api/v1/admin/analytics`

**Metrics:**
- Revenue tracking
- Order statistics
- Customer analytics
- Provider performance
- Platform-wide metrics
- Time-based reports

### 7. Review & Rating System
**Routes**: `/api/v1/reviews`
- Customer reviews for providers
- Rating system (1-5 stars)
- Review moderation
- Average rating calculation

### 8. Cart & Favorites
**Routes**: `/api/v1/cart`, `/api/v1/favorites`
- Shopping cart management
- Favorite restaurants
- Cart persistence

### 9. Notification System
**Routes**: `/api/v1/notifications`, `/api/v1/admin/notifications`
- Real-time notifications via Socket.IO
- Push notifications
- Email notifications
- Notification history
- Read/unread status

### 10. Chat System
**Routes**: `/api/v1/chat`
- Real-time chat with Socket.IO
- Customer-Provider communication
- Chat rooms
- Message history

### 11. State & Tax Management
**Routes**: `/api/v1/states`, `/api/v1/admin/tax`
- US states data
- State-specific tax rates
- Tax configuration

### 12. System Configuration
**Routes**: `/api/v1/config`, `/api/v1/admin/config`
- Platform fee configuration (fixed or percentage)
- App logo management
- Dashboard permissions
- System-wide settings

### 13. Admin Module
**Routes**: `/api/v1/admin/*`

**Admin Capabilities:**
- User management (customers, providers, admins)
- Order management
- Transaction monitoring
- Restaurant approval
- Tax configuration
- Payment method management
- Legal document management
- Banner management
- Analytics & reports
- Compliance monitoring
- Support ticket management

### 14. Support & Compliance
**Routes**: `/api/v1/support`, `/api/v1/compliance`
- Support ticket system
- Compliance violation tracking
- Legal document management
- Audit logs

### 15. Profile Management
**Routes**: `/api/v1/profile`
- Customer profile
- Provider profile
- Address management
- State selection (for tax calculation)

---

## 🗄️ Database Models

### Key Models:

**User Model:**
```typescript
{
  fullName, email, passwordHash, role,
  isEmailVerified, authProvider,
  googleId, googleEmail, googlePicture,
  isProviderApproved, isActive, isSuspended,
  phone, profilePic, lastLoginAt
}
```

**Order Model:**
```typescript
{
  orderId, providerId, customerId,
  items: [{ foodId, quantity, price }],
  subtotal, platformFee, stateTax, totalPrice,
  status, paymentMethod, logisticsType,
  state, cancellationReason,
  orderStatusHistory
}
```

**Food Model:**
```typescript
{
  name, description, price, image,
  category, providerId,
  isAvailable, preparationTime
}
```

**Profile Model:**
```typescript
{
  userId, name, phone, dateOfBirth,
  address, city, state,
  profilePic, bio, isVerify
}
```

**State Model:**
```typescript
{
  name, code, country,
  tax, isActive
}
```

**SystemConfig Model:**
```typescript
{
  key, value, description
}
```

---

## 🔌 API Endpoints Summary

### Public Routes:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/auth/google`
- `POST /api/v1/auth/verify-email`

### Customer Routes:
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:orderId` - Get order details
- `PATCH /api/v1/orders/:orderId/cancel` - Cancel order
- `GET /api/v1/foods` - Browse food items
- `POST /api/v1/cart` - Manage cart
- `POST /api/v1/reviews` - Submit review
- `GET /api/v1/feed` - Browse restaurants

### Provider Routes:
- `GET /api/v1/orders` - Get provider orders
- `PATCH /api/v1/orders/:orderId/accept` - Accept order
- `PATCH /api/v1/orders/:orderId/ready` - Mark ready
- `PATCH /api/v1/orders/:orderId/complete` - Complete order
- `POST /api/v1/foods` - Add food item
- `GET /api/v1/dashboard` - Provider dashboard
- `GET /api/v1/provider/analytics` - Analytics

### Admin Routes:
- `GET /api/v1/admin/users` - Manage users
- `GET /api/v1/admin/orders` - All orders
- `GET /api/v1/admin/transactions-orders` - Transactions
- `POST /api/v1/admin/tax` - Configure taxes
- `POST /api/v1/config/platform-fee` - Set platform fee
- `GET /api/v1/admin/dashboard` - Admin dashboard

---

## ⚙️ Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/emdr-db

# JWT
JWT_SECRET=your_super_secret_jwt_key_12345
JWT_EXPIRE=12h
JWT_REFRESH_SECRET=your_super_refresh_secret_key_12345
JWT_REFRESH_EXPIRE=7d

# OTP
OTP_EXPIRE_IN=600000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Security
REQUIRE_PROVIDER_APPROVAL=true
ENABLE_STEP_UP_VERIFICATION=true
MAX_SESSIONS_PER_USER=5
ALLOW_PROVIDER_SIGNUPS=true

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

---

## 🚀 Running the Project

### Development:
```bash
npm run dev
```

### Production:
```bash
npm run build
npm start
```

### Seed Data:
```bash
npm run seed:states
npm run seed:admin
```

---

## 🔄 Order Workflow (Updated)

### Customer Creates Order:
1. Customer selects food items from provider
2. Adds to cart with quantity
3. Proceeds to checkout
4. Backend automatically calculates:
   - Subtotal from items
   - Platform fee (per item quantity)
   - State tax (from customer's state)
   - Total price
5. Order created with status: PENDING
6. Notifications sent to customer & provider

### Provider Processes Order:
1. Provider receives notification
2. Accepts order → Status: PREPARING
3. Marks ready → Status: READY_FOR_PICKUP
4. Delivery person picks up → Status: PICKED_UP
5. Delivery completed → Status: COMPLETED

### Cancellation:
- Customer can cancel: PENDING orders only
- Provider can cancel: PREPARING orders only

---

## 📊 Key Business Logic

### Platform Fee Configuration:
```typescript
// Fixed fee per item
{
  type: 'fixed',
  value: 2.50  // $2.50 per item
}

// Percentage fee
{
  type: 'percentage',
  value: 5  // 5% of subtotal
}
```

### State Tax:
- Retrieved from customer's profile state
- Applied once per order on subtotal
- Configurable per state by admin

### Provider Approval:
- New providers require admin approval
- Can be disabled via `REQUIRE_PROVIDER_APPROVAL=false`
- Approval tracked with timestamp and admin ID

---

## 🔔 Real-time Features (Socket.IO)

### Events:
- Order status updates
- New order notifications
- Chat messages
- Payment confirmations

### Rooms:
- User-specific rooms
- Order-specific rooms
- Chat rooms

---

## 📈 Analytics & Reporting

### Provider Analytics:
- Daily/Weekly/Monthly revenue
- Order count and trends
- Popular items
- Customer demographics
- Peak hours

### Admin Analytics:
- Platform-wide metrics
- Provider performance
- Customer activity
- Revenue breakdown
- Tax collection

---

## 🛡️ Security Features

1. **Rate Limiting**: 100 requests per 15 minutes
2. **JWT Authentication**: Access & refresh tokens
3. **Password Hashing**: bcrypt with salt
4. **Input Validation**: Zod schemas
5. **SQL Injection Protection**: Mongoose ODM
6. **XSS Protection**: Input sanitization
7. **CORS**: Configured for specific origins
8. **Session Management**: Redis-based
9. **Token Blacklisting**: Logout security
10. **Step-up Verification**: Sensitive operations

---

## 📝 Recent Updates

### Order API v2 (Latest):
✅ Automatic price calculation in backend  
✅ Platform fee per item quantity  
✅ State tax once per order  
✅ Detailed pricing breakdown in response  
✅ Removed totalPrice from request body  
✅ Enhanced order model with subtotal, platformFee, stateTax fields

---

## 🎯 Next Steps

Based on your message, the next API to implement is:
- **Payment API** - Process payments using orderId and totalPrice from order response

---

## 📞 Support & Documentation

- Postman Collections: `/postmanfile/`
- API Documentation: `ORDER_API_DOCUMENTATION.md`
- Project Context: `PROJECT_CONTEXT.md` (this file)

---

**Project Status**: Active Development  
**Last Updated**: February 2026  
**Version**: 1.0.0
