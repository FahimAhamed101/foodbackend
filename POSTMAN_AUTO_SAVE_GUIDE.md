# 🎯 Postman Auto-Save Response Guide (বাংলা)

## ✅ আপডেট করা হয়েছে!

আপনার Postman collection এখন **automatic response saving** সহ আপডেট করা হয়েছে। এখন প্রতিটি request এর response automatically save হবে এবং পরবর্তী requests এ ব্যবহার হবে।

---

## 🎨 কি কি Auto-Save হবে?

### 1. Login Request (0. Login)
**Auto-saves:**
- ✅ `token` - Authentication token
- ✅ User info (console এ দেখাবে)

**Console Output:**
```
✅ Token saved successfully
🔑 Token: eyJhbGciOiJIUzI1NiI...
👤 User: John Doe
📧 Email: customer@example.com
🎭 Role: CUSTOMER
```

---

### 2. Get Stripe Config (1. Get Stripe Config)
**Auto-saves:**
- ✅ `publishableKey` - Stripe publishable key

**Console Output:**
```
✅ Publishable key saved
🔑 Key: pk_test_51ABC123...
```

---

### 3. Create Payment Intent (2. Create Payment Intent)
**Auto-saves:**
- ✅ `clientSecret` - Payment intent client secret
- ✅ `paymentIntentId` - Payment intent ID

**Console Output:**
```
✅ Payment Intent created successfully
🔑 Client Secret: pi_3ABC123_secret_XYZ...
🆔 Payment Intent ID: pi_3ABC123
💰 Amount: $45.67

📊 Price Breakdown:
   Subtotal: $40.00
   Platform Fee (10%): $4.00
   State Tax: $2.87
   Total: $46.87
   Vendor Gets: $36.00
   State: CA
```

---

### 4. Get Payment Status (3. Get Payment Status)
**Auto-saves:**
- ✅ `orderId` - Order ID (যখন order তৈরি হবে)

**Console Output:**
```
✅ Payment Status retrieved
📊 Status: succeeded
💰 Amount: $45.67
🆔 Order ID: ORD-1709123456-7890
📦 Order Status: pending
💳 Payment Status: paid
```

---

### 5. Get Order Details (4. Get Order Details)
**Shows:**
- Complete order information
- Price breakdown
- Stripe payment intent ID

**Console Output:**
```
✅ Order Details retrieved

📦 Order Information:
   Order ID: ORD-1709123456-7890
   Status: pending
   Payment Status: paid
   Payment Method: stripe

💰 Pricing:
   Subtotal: $40.00
   Platform Fee: $4.00
   State Tax: $2.87
   Total: $46.87
   Vendor Amount: $36.00

📍 Location:
   State: CA

🔗 Stripe:
   Payment Intent ID: pi_3ABC123

📅 Created: 2/25/2026, 10:30:00 AM
```

---

### 6. Create Refund (5. Create Refund)
**Shows:**
- Refund ID
- Refund amount
- Refund status

**Console Output:**
```
✅ Refund created successfully
🆔 Refund ID: re_3ABC123
💰 Amount: $45.67
📊 Status: succeeded
```

---

## 🔄 কিভাবে কাজ করে?

### Step 1: Request পাঠান
```
POST {{baseUrl}}/stripe/create-payment-intent
```

### Step 2: Response আসে
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_3ABC123_secret_XYZ789",
    "paymentIntentId": "pi_3ABC123",
    "amount": 45.67
  }
}
```

### Step 3: Auto-Save Script চলে
```javascript
// Tests tab এর script automatically চলে
pm.collectionVariables.set('clientSecret', response.data.clientSecret);
pm.collectionVariables.set('paymentIntentId', response.data.paymentIntentId);
```

### Step 4: পরবর্তী Request এ ব্যবহার
```
GET {{baseUrl}}/stripe/payment-status/{{paymentIntentId}}
                                        ↑
                                  Auto-filled!
```

---

## 📊 Collection Variables দেখুন

### Postman এ Variables দেখার জন্য:

1. Collection এ click করুন
2. **Variables** tab select করুন
3. দেখবেন সব saved values:

| Variable | Current Value |
|----------|---------------|
| `baseUrl` | http://localhost:5000/api/v1 |
| `token` | eyJhbGciOiJIUzI1NiI... |
| `clientSecret` | pi_3ABC123_secret_... |
| `paymentIntentId` | pi_3ABC123 |
| `orderId` | ORD-1709123456-7890 |
| `publishableKey` | pk_test_51ABC... |

---

## 🎯 Testing Flow (Auto-Save সহ)

### ধাপ ১: Login
```
POST /auth/login
↓
✅ Token auto-saved
```

### ধাপ ২: Get Config
```
GET /stripe/config
↓
✅ Publishable key auto-saved
```

### ধাপ ৩: Create Payment Intent
```
POST /stripe/create-payment-intent
Uses: {{token}} (auto-filled)
↓
✅ clientSecret auto-saved
✅ paymentIntentId auto-saved
```

### ধাপ ৪: Check Payment Status
```
GET /stripe/payment-status/{{paymentIntentId}}
Uses: {{token}} (auto-filled)
Uses: {{paymentIntentId}} (auto-filled)
↓
✅ orderId auto-saved (যখন available)
```

### ধাপ ৫: Get Order Details
```
GET /orders/{{orderId}}
Uses: {{token}} (auto-filled)
Uses: {{orderId}} (auto-filled)
↓
✅ Complete order info displayed
```

### ধাপ ৬: Create Refund
```
POST /stripe/refund
Uses: {{token}} (auto-filled)
Uses: {{orderId}} (auto-filled in body)
↓
✅ Refund created
```

---

## 🧪 Tests যোগ করা হয়েছে

প্রতিটি request এ automatic tests আছে:

### Collection Level Tests (সব requests এ চলে):
```javascript
✅ Response time is acceptable (< 5000ms)
✅ Response has correct format (JSON)
```

### Request Specific Tests:

**Login:**
```javascript
✅ Login successful
✅ Token exists
```

**Get Config:**
```javascript
✅ Config retrieved successfully
✅ Publishable key starts with 'pk_test_'
```

**Create Payment Intent:**
```javascript
✅ Payment Intent created
✅ Client secret exists
✅ Amount is greater than 0
✅ Breakdown is correct
```

**Get Payment Status:**
```javascript
✅ Payment status retrieved
✅ Status exists
```

**Get Order Details:**
```javascript
✅ Order retrieved successfully
✅ Order is paid
```

**Create Refund:**
```javascript
✅ Refund created
✅ Refund ID exists
```

---

## 📝 Console Logs

প্রতিটি request এর পরে console এ detailed logs দেখবেন:

### Console খুলতে:
1. Postman এর নিচে **Console** button click করুন
2. অথবা `Ctrl + Alt + C` (Windows) / `Cmd + Alt + C` (Mac)

### Example Console Output:
```
🚀 Request: POST http://localhost:5000/api/v1/stripe/create-payment-intent
📅 Timestamp: 2026-02-25T10:30:00.000Z

✅ Payment Intent created successfully
🔑 Client Secret: pi_3ABC123_secret_XYZ...
🆔 Payment Intent ID: pi_3ABC123
💰 Amount: $45.67

📊 Price Breakdown:
   Subtotal: $40.00
   Platform Fee (10%): $4.00
   State Tax: $2.87
   Total: $46.87
   Vendor Amount: $36.00
   State: CA

📊 Response Status: 200
⏱️ Response Time: 234ms

✅ Response time is acceptable
✅ Response has correct format
✅ Payment Intent created
✅ Client secret exists
✅ Amount is greater than 0
✅ Breakdown is correct
```

---

## 🎨 কিভাবে ব্যবহার করবেন?

### 1. Collection Import করুন
```
File → Import → postmanfile/postman_stripe_integration.json
```

### 2. Variables Check করুন
```
Collection → Variables tab
baseUrl: http://localhost:5000/api/v1 ✅
```

### 3. Requests Run করুন (ক্রমানুসারে)
```
0. Login → Token auto-saved ✅
1. Get Config → Key auto-saved ✅
2. Create Payment Intent → Secrets auto-saved ✅
3. Get Payment Status → Order ID auto-saved ✅
4. Get Order Details → Details displayed ✅
5. Create Refund → Refund created ✅
```

### 4. Console দেখুন
```
View → Show Postman Console
সব logs এবং saved values দেখুন
```

---

## 🔧 Troubleshooting

### Issue: Variables save হচ্ছে না

**Solution:**
1. Collection Variables tab check করুন
2. Tests tab এ scripts আছে কিনা verify করুন
3. Console এ error আছে কিনা দেখুন

### Issue: Token expire হয়ে গেছে

**Solution:**
1. Login request আবার run করুন
2. নতুন token auto-save হবে
3. পরবর্তী requests automatically নতুন token ব্যবহার করবে

### Issue: Order ID পাচ্ছি না

**Solution:**
1. Webhook setup করেছেন কিনা check করুন
2. Payment confirm করেছেন কিনা verify করুন
3. কিছুক্ষণ wait করুন (webhook processing time)
4. Payment Status request আবার run করুন

---

## 🎉 Benefits

### ✅ Manual Copy-Paste নেই
- সব values automatically save হয়
- পরবর্তী requests এ auto-fill হয়

### ✅ Detailed Logs
- Console এ সব information দেখা যায়
- Debugging সহজ হয়

### ✅ Automatic Tests
- প্রতিটি request verify হয়
- Errors তাড়াতাড়ি ধরা পড়ে

### ✅ Professional Workflow
- Production-ready testing
- Team collaboration সহজ

---

## 📚 আরও তথ্য

- **Complete Testing Guide:** `POSTMAN_TESTING_GUIDE_BANGLA.md`
- **Backend API:** `STRIPE_INTEGRATION_GUIDE.md`
- **Frontend Guide:** `FRONTEND_PAYMENT_INTEGRATION_BANGLA.md`

---

**✅ Ready to Test!**

এখন আপনি Postman দিয়ে সহজে test করতে পারবেন। সব responses automatically save হবে! 🚀

**তৈরি:** Kiro AI Assistant 🇧🇩  
**তারিখ:** ফেব্রুয়ারি ২৫, ২০২৬
