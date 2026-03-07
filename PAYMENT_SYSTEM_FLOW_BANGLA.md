# 💳 Payment System - কিভাবে কাজ করে (বাংলা)

**তারিখ:** ফেব্রুয়ারি ২৬, ২০২৬  
**স্ট্যাটাস:** ✅ সম্পূর্ণ এবং কার্যকর

---

## 📋 Payment System Overview

আপনার EMDR Food Delivery App এ **Stripe Payment Integration** আছে যা **webhook-driven order creation** ব্যবহার করে।

---

## 🔄 Complete Payment Flow (Step by Step)

### ধাপ ১: Customer Cart এ Items Add করে

**Frontend:**
```javascript
// Customer food items select করে
addToCart(foodId, quantity)
```

**Backend API:**
```
POST /api/v1/cart
Body: {
  "foodId": "65f9876543210fedcba98765",
  "quantity": 2
}
```

**Database:**
```javascript
// Cart collection এ save হয়
{
  customerId: ObjectId("customer_id"),
  items: [
    {
      foodId: ObjectId("food_id"),
      quantity: 2,
      price: 15.99
    }
  ]
}
```

---

### ধাপ ২: Customer Checkout করে

**Frontend:**
```javascript
// Checkout button click করলে
checkout(providerId, items)
```

**Backend API:**
```
POST /api/v1/stripe/create-payment-intent
Headers: Authorization: Bearer {token}
Body: {
  "providerId": "69714abce548ab10b90c0e50",
  "items": [
    {
      "foodId": "65f9876543210fedcba98765",
      "quantity": 2
    }
  ]
}
```

---

### ধাপ ৩: Backend Price Calculate করে

**Backend Process:**

1. **Customer State খুঁজে বের করা:**
```javascript
const customer = await Profile.findOne({ userId: customerId });
const customerState = customer.state; // "CA"
```

2. **Food Prices Database থেকে নেওয়া:**
```javascript
const food = await Food.findById(foodId);
const price = food.finalPriceTag; // $15.99
```

3. **Subtotal Calculate:**
```javascript
subtotal = price × quantity
subtotal = $15.99 × 2 = $31.98
```

4. **Platform Fee Calculate (State-based):**
```javascript
if (state === "CA") {
  platformFeeRate = 0.10; // 10%
} else {
  platformFeeRate = 0.07; // 7%
}

platformFee = subtotal × platformFeeRate
platformFee = $31.98 × 0.10 = $3.20
```

5. **State Tax Calculate:**
```javascript
const stateData = await State.findOne({ code: "CA" });
const taxRate = stateData.taxRate; // 0.0725 (7.25%)

stateTax = subtotal × taxRate
stateTax = $31.98 × 0.0725 = $2.32
```

6. **Total Calculate:**
```javascript
total = subtotal + platformFee + stateTax
total = $31.98 + $3.20 + $2.32 = $37.50
```

7. **Vendor Amount Calculate:**
```javascript
vendorAmount = subtotal - platformFee
vendorAmount = $31.98 - $3.20 = $28.78
```

---

### ধাপ ৪: Stripe Payment Intent তৈরি করা

**Backend:**
```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(total * 100), // $37.50 → 3750 cents
  currency: 'usd',
  metadata: {
    customerId: "customer_id",
    providerId: "provider_id",
    state: "CA",
    items: JSON.stringify(items),
    subtotal: "31.98",
    platformFee: "3.20",
    stateTax: "2.32",
    vendorAmount: "28.78"
  }
});
```

**Response to Frontend:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_3ABC123_secret_XYZ789",
    "paymentIntentId": "pi_3ABC123",
    "amount": 37.50,
    "breakdown": {
      "subtotal": 31.98,
      "platformFee": 3.20,
      "stateTax": 2.32,
      "total": 37.50,
      "vendorAmount": 28.78,
      "state": "CA",
      "items": [...]
    }
  }
}
```

---

### ধাপ ৫: Frontend Payment Confirm করে

**Frontend (React/Next.js):**
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

// Stripe initialize
const stripePromise = loadStripe('pk_test_...');

// Payment confirm
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://yourapp.com/order-success',
  },
});

if (error) {
  // Payment failed
  console.error(error.message);
} else {
  // Payment processing...
  // Webhook will create the order
}
```

**Stripe Process:**
1. Customer card details enter করে
2. Stripe payment process করে
3. Payment successful হলে webhook trigger হয়

---

### ধাপ ৬: Stripe Webhook Backend এ পাঠায়

**Stripe → Backend:**
```
POST /api/v1/stripe/webhook
Headers: 
  - stripe-signature: t=1234567890,v1=abc123...
Body: {
  "id": "evt_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3ABC123",
      "amount": 3750,
      "status": "succeeded",
      "metadata": {
        "customerId": "...",
        "providerId": "...",
        "items": "[...]",
        ...
      }
    }
  }
}
```

---

### ধাপ ৭: Backend Webhook Verify করে

**Backend Security Checks:**

1. **Signature Verification:**
```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  webhookSecret
);
// ✅ Verified: Request actually came from Stripe
```

2. **Idempotency Check:**
```javascript
const existingEvent = await WebhookEvent.findOne({ 
  eventId: event.id 
});
if (existingEvent) {
  return; // Already processed
}
// ✅ Not a duplicate
```

3. **Amount Verification:**
```javascript
// Recalculate prices from metadata
const recalculatedTotal = calculateTotal(metadata);
if (recalculatedTotal !== event.data.object.amount) {
  throw new Error('Amount mismatch');
}
// ✅ Amount matches
```

---

### ধাপ ৮: Order তৈরি করা

**Backend:**
```javascript
// Create Order
const order = await Order.create({
  orderId: `ORD-${Date.now()}-${randomString}`,
  customerId: metadata.customerId,
  providerId: metadata.providerId,
  items: JSON.parse(metadata.items),
  subtotal: parseFloat(metadata.subtotal),
  platformFee: parseFloat(metadata.platformFee),
  stateTax: parseFloat(metadata.stateTax),
  totalPrice: event.data.object.amount / 100,
  vendorAmount: parseFloat(metadata.vendorAmount),
  state: metadata.state,
  paymentMethod: 'stripe',
  paymentStatus: 'paid',
  stripePaymentIntentId: event.data.object.id,
  status: 'pending'
});
```

**Database:**
```javascript
// orders collection
{
  _id: ObjectId("..."),
  orderId: "ORD-1709123456-7890",
  customerId: ObjectId("customer_id"),
  providerId: ObjectId("provider_id"),
  items: [
    {
      foodId: ObjectId("food_id"),
      quantity: 2,
      price: 15.99
    }
  ],
  subtotal: 31.98,
  platformFee: 3.20,
  stateTax: 2.32,
  totalPrice: 37.50,
  vendorAmount: 28.78,
  state: "CA",
  paymentMethod: "stripe",
  paymentStatus: "paid",
  stripePaymentIntentId: "pi_3ABC123",
  status: "pending",
  createdAt: ISODate("2026-02-26T10:30:00Z")
}
```

---

### ধাপ ৯: Payment Record তৈরি করা

**Backend:**
```javascript
// Create Payment Record
const payment = await Payment.create({
  orderId: order._id,
  customerId: metadata.customerId,
  providerId: metadata.providerId,
  amount: order.totalPrice,
  paymentMethod: 'stripe',
  status: 'completed',
  stripePaymentIntentId: event.data.object.id,
  stripeChargeId: event.data.object.charges?.data[0]?.id,
  vendorAmount: order.vendorAmount
});
```

---

### ধাপ ১০: Cart Clear করা

**Backend:**
```javascript
// Clear customer's cart
await Cart.deleteMany({ 
  customerId: metadata.customerId 
});
```

---

### ধাপ ১১: Notifications পাঠানো

**Backend:**
```javascript
// Notify Customer
await Notification.create({
  userId: customerId,
  title: "Order Confirmed",
  message: `Your order ${order.orderId} has been confirmed`,
  type: "order"
});

// Notify Provider
await Notification.create({
  userId: providerId,
  title: "New Order",
  message: `You have a new order ${order.orderId}`,
  type: "order"
});
```

---

### ধাপ ১২: Frontend Order Success দেখায়

**Frontend:**
```javascript
// Redirect to success page
window.location.href = '/order-success?orderId=ORD-1709123456-7890';

// Or poll for order status
const checkOrderStatus = async (paymentIntentId) => {
  const response = await fetch(
    `/api/v1/stripe/payment-status/${paymentIntentId}`
  );
  const data = await response.json();
  
  if (data.data.orderId) {
    // Order created!
    showOrderDetails(data.data.orderId);
  }
};
```

---

## 💰 Money Flow (কিভাবে টাকা ভাগ হয়)

### Example: $37.50 Total Payment

```
Customer Pays: $37.50
├─ Subtotal: $31.98 (food price × quantity)
├─ Platform Fee: $3.20 (10% of subtotal for CA)
└─ State Tax: $2.32 (7.25% of subtotal)

Money Distribution:
├─ Vendor Gets: $28.78 (subtotal - platform fee)
├─ Platform Gets: $3.20 (platform fee)
└─ State Tax: $2.32 (goes to government)
```

### State-based Platform Fee:

| State | Platform Fee | Example (on $100) |
|-------|--------------|-------------------|
| California (CA) | 10% | $10.00 |
| All Others | 7% | $7.00 |

---

## 🔒 Security Features

### ✅ 1. Webhook Signature Verification
```javascript
// Ensures webhook actually came from Stripe
stripe.webhooks.constructEvent(body, signature, secret)
```

### ✅ 2. Idempotency Protection
```javascript
// Prevents duplicate order creation
WebhookEvent.findOne({ eventId: event.id })
```

### ✅ 3. Backend Price Validation
```javascript
// Never trusts frontend prices
const price = await Food.findById(foodId).finalPriceTag
```

### ✅ 4. Amount Verification
```javascript
// Recalculates and verifies on webhook
if (calculatedAmount !== webhookAmount) throw Error
```

### ✅ 5. No Card Data Storage
```javascript
// Stripe handles all card data
// We only store payment intent IDs
```

---

## 📊 Database Collections Involved

### 1. **users** - Customer & Provider info
### 2. **profiles** - Customer state (for tax calculation)
### 3. **providerprofiles** - Provider details
### 4. **foods** - Food prices
### 5. **states** - Tax rates
### 6. **cart** - Shopping cart
### 7. **orders** - Order records
### 8. **payments** - Payment records
### 9. **webhookevents** - Webhook tracking
### 10. **notifications** - User notifications

---

## 🎯 Key Points

### ✅ Order Creation
- **NEVER** created before payment
- **ONLY** created after Stripe confirms payment
- **ALWAYS** created via webhook

### ✅ Price Calculation
- **ALWAYS** done on backend
- **NEVER** trusts frontend
- **ALWAYS** fetches from database

### ✅ Platform Fee
- **State-based** (CA: 10%, Others: 7%)
- **Deducted** from vendor amount
- **Transparent** in breakdown

### ✅ Security
- **Webhook** signature verified
- **Idempotency** protected
- **Amount** verified
- **No card data** stored

---

## 🔄 Alternative Flows

### Scenario 1: Payment Failed

```
Customer → Payment Intent → Stripe → Payment Failed
                                    ↓
                              Webhook: payment_intent.payment_failed
                                    ↓
                              Backend logs failure
                                    ↓
                              NO order created
                                    ↓
                              Cart preserved
```

### Scenario 2: Refund

```
Admin/Provider → Refund Request
              ↓
        Backend API: POST /stripe/refund
              ↓
        Stripe processes refund
              ↓
        Webhook: charge.refunded
              ↓
        Update order: paymentStatus = 'refunded'
              ↓
        Update payment: status = 'refunded'
              ↓
        Notify customer
```

---

## 📝 API Endpoints Summary

### Customer Endpoints:
```
POST /api/v1/stripe/create-payment-intent
GET  /api/v1/stripe/payment-status/:paymentIntentId
GET  /api/v1/stripe/config
```

### Webhook Endpoint:
```
POST /api/v1/stripe/webhook
```

### Admin/Provider Endpoints:
```
POST /api/v1/stripe/refund
```

---

## 🧪 Testing Flow

### 1. Create Payment Intent
```
POST /stripe/create-payment-intent
→ Get clientSecret
```

### 2. Confirm Payment (Stripe Dashboard)
```
Use test card: 4242 4242 4242 4242
→ Payment succeeds
```

### 3. Webhook Triggers
```
Stripe → Backend webhook
→ Order created
```

### 4. Check Order
```
GET /stripe/payment-status/:paymentIntentId
→ Returns orderId
```

---

## ✅ Summary

**Payment System:**
- ✅ Stripe integration complete
- ✅ Webhook-driven order creation
- ✅ State-based platform fees
- ✅ Secure and production-ready
- ✅ Complete money flow tracking

**Key Features:**
- Backend price validation
- Webhook signature verification
- Idempotency protection
- Transparent fee breakdown
- Automatic notifications

**Money Flow:**
- Customer pays total
- Vendor gets (subtotal - platform fee)
- Platform gets platform fee
- State gets tax

**সব কিছু কাজ করছে এবং production-ready!** 🚀

---

**তৈরি করেছেন:** Kiro AI Assistant 🇧🇩  
**তারিখ:** ফেব্রুয়ারি ২৬, ২০২৬  
**স্ট্যাটাস:** ✅ সম্পূর্ণ এবং কার্যকর
