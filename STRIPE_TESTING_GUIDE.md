# 🧪 Stripe Integration Testing Guide

## 📋 Prerequisites

### 1. Stripe Account Setup
1. Go to https://dashboard.stripe.com/register
2. Create a free Stripe account
3. Activate test mode (toggle in top right)

### 2. Get API Keys
1. Navigate to: https://dashboard.stripe.com/test/apikeys
2. Copy your keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal test key")

### 3. Configure Webhook
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-domain.com/api/v1/stripe/webhook`
   - For local testing: Use ngrok or similar tunnel
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret**: `whsec_...`

### 4. Update .env File
```env
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-11-20.acacia
```

---

## 🔧 Local Testing Setup

### Option 1: Using ngrok (Recommended)
```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, create tunnel
ngrok http 5000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update Stripe webhook endpoint to: https://abc123.ngrok.io/api/v1/stripe/webhook
```

### Option 2: Using Stripe CLI
```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe
# Linux: See https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/v1/stripe/webhook

# Copy the webhook signing secret from output
# Update STRIPE_WEBHOOK_SECRET in .env
```

---

## 🧪 Test Scenarios

### Test Cards (Stripe Test Mode)

| Card Number | Scenario | Expected Result |
|-------------|----------|-----------------|
| `4242 4242 4242 4242` | Success | Payment succeeds, order created |
| `4000 0000 0000 0002` | Decline | Payment fails, no order created |
| `4000 0025 0000 3155` | 3D Secure | Requires authentication |
| `4000 0000 0000 9995` | Insufficient funds | Payment fails |
| `4000 0000 0000 0259` | Slow processing | Takes 5 seconds |

**Card Details for Testing:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

---

## 📝 Testing Workflow

### Step 1: Create Payment Intent

**Endpoint:** `POST /api/v1/stripe/create-payment-intent`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "providerId": "65f1234567890abcdef12345",
  "items": [
    {
      "foodId": "65f9876543210fedcba98765",
      "quantity": 2
    },
    {
      "foodId": "65f1111111111111111111111",
      "quantity": 1
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "clientSecret": "pi_3ABC123_secret_XYZ789",
    "paymentIntentId": "pi_3ABC123",
    "amount": 45.67,
    "breakdown": {
      "subtotal": 40.00,
      "platformFee": 2.80,
      "stateTax": 2.87,
      "total": 45.67,
      "vendorAmount": 37.20,
      "state": "CA",
      "items": [
        {
          "foodId": "65f9876543210fedcba98765",
          "name": "Burger",
          "price": 15.00,
          "quantity": 2,
          "itemTotal": 30.00,
          "platformFee": 2.10
        }
      ]
    }
  }
}
```

**Validation Checks:**
- ✅ Backend fetches food prices from DB (not from request)
- ✅ Platform fee calculated based on customer's state
- ✅ State tax applied correctly
- ✅ Total matches Stripe PaymentIntent amount

---

### Step 2: Confirm Payment (Frontend)

**Using Stripe.js (Frontend):**
```javascript
// Load Stripe.js
const stripe = Stripe('pk_test_...');

// Get clientSecret from Step 1
const { clientSecret } = response.data;

// Confirm payment
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement, // Stripe Card Element
      billing_details: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    }
  }
);

if (error) {
  console.error('Payment failed:', error.message);
} else if (paymentIntent.status === 'succeeded') {
  console.log('Payment succeeded!');
  // Redirect to success page or poll for order
}
```

**Using Stripe Payment Element (Recommended):**
```javascript
const stripe = Stripe('pk_test_...');
const elements = stripe.elements({ clientSecret });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// On form submit
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://yourapp.com/order-success'
  }
});
```

---

### Step 3: Webhook Triggered

**Stripe sends webhook to:** `POST /api/v1/stripe/webhook`

**Webhook Event (payment_intent.succeeded):**
```json
{
  "id": "evt_1ABC123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3ABC123",
      "amount": 4567,
      "status": "succeeded",
      "metadata": {
        "customerId": "65f1234567890abcdef12345",
        "providerId": "65f9876543210fedcba98765",
        "state": "CA",
        "items": "[{\"foodId\":\"...\",\"quantity\":2}]"
      }
    }
  }
}
```

**Backend Actions:**
1. ✅ Verify webhook signature
2. ✅ Check idempotency (prevent duplicate orders)
3. ✅ Recalculate prices (verify integrity)
4. ✅ Create Order in database
5. ✅ Create Payment record
6. ✅ Send notifications
7. ✅ Clear customer's cart
8. ✅ Return 200 OK to Stripe

---

### Step 4: Verify Order Created

**Endpoint:** `GET /api/v1/orders/:orderId`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-1709123456-7890",
    "customerId": "...",
    "providerId": "...",
    "items": [...],
    "subtotal": 40.00,
    "platformFee": 2.80,
    "stateTax": 2.87,
    "totalPrice": 45.67,
    "vendorAmount": 37.20,
    "status": "pending",
    "paymentStatus": "paid",
    "paymentMethod": "stripe",
    "stripePaymentIntentId": "pi_3ABC123",
    "state": "CA",
    "createdAt": "2026-02-25T10:30:00.000Z"
  }
}
```

---

## 🔍 Testing Checklist

### ✅ Happy Path
- [ ] Create payment intent with valid items
- [ ] Receive clientSecret
- [ ] Confirm payment with test card `4242 4242 4242 4242`
- [ ] Webhook received and processed
- [ ] Order created in database
- [ ] Payment record created
- [ ] Notifications sent
- [ ] Cart cleared

### ❌ Error Scenarios
- [ ] Invalid food ID → 404 error
- [ ] Unavailable food item → 400 error
- [ ] Payment declined (card `4000 0000 0000 0002`) → No order created
- [ ] Webhook replay → Only one order created (idempotency)
- [ ] Invalid webhook signature → 400 error
- [ ] Amount mismatch → Error logged

### 💰 Price Validation
- [ ] Backend recalculates prices (doesn't trust frontend)
- [ ] Platform fee varies by state (CA: 10%, others: 7%)
- [ ] State tax applied correctly
- [ ] Vendor amount calculated correctly

### 🔐 Security
- [ ] Webhook signature verified
- [ ] Idempotency prevents duplicate orders
- [ ] User can only view their own payment status
- [ ] Prices fetched from database, not request

### 🔄 Edge Cases
- [ ] Multiple items in cart
- [ ] Customer with no state → No tax applied
- [ ] Webhook timeout → Retry handling
- [ ] Concurrent webhook deliveries → Idempotency works

---

## 🐛 Debugging Tips

### Check Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/payments
2. View recent PaymentIntents
3. Check status, amount, metadata

### Check Webhook Logs
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint
3. View "Recent deliveries"
4. Check response codes and errors

### Check Application Logs
```bash
# View server logs
npm run dev

# Look for:
# - "Received webhook event: payment_intent.succeeded"
# - "Webhook event already processed, skipping"
# - Any error messages
```

### Test Webhook Manually
```bash
# Using Stripe CLI
stripe trigger payment_intent.succeeded

# Or send test webhook from dashboard
# Dashboard → Webhooks → Your endpoint → Send test webhook
```

---

## 📊 Monitoring & Alerts

### Production Checklist
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Monitor webhook failure rate
- [ ] Alert on payment failures
- [ ] Track order creation success rate
- [ ] Monitor idempotency key collisions
- [ ] Set up Stripe alerts for:
  - Failed payments
  - Webhook failures
  - Unusual activity

### Key Metrics to Track
- Payment success rate
- Average order value
- Platform fee collected
- Webhook processing time
- Order creation latency

---

## 🚨 Common Issues & Solutions

### Issue 1: Webhook not receiving events
**Symptoms:** Payment succeeds but no order created

**Solutions:**
1. Check webhook URL is correct and accessible
2. Verify HTTPS (Stripe requires HTTPS in production)
3. Check firewall/security groups
4. Use ngrok for local testing
5. Check Stripe dashboard → Webhooks → Recent deliveries

### Issue 2: Signature verification fails
**Symptoms:** `Webhook Error: No signatures found matching the expected signature`

**Solutions:**
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure raw body is passed to `constructEvent`
3. Check `express.raw()` middleware is applied before `express.json()`
4. Verify webhook secret matches endpoint in Stripe dashboard

### Issue 3: Duplicate orders created
**Symptoms:** Same payment creates multiple orders

**Solutions:**
1. Check idempotency implementation
2. Verify `WebhookEvent` model is working
3. Check for race conditions in webhook processing
4. Ensure unique index on `idempotencyKey` in Order model

### Issue 4: Amount mismatch
**Symptoms:** `Amount mismatch: expected X, got Y`

**Solutions:**
1. Verify Stripe uses cents (multiply by 100)
2. Check rounding errors (use `toFixed(2)`)
3. Ensure food prices haven't changed between intent creation and webhook
4. Verify state tax calculation

### Issue 5: Order created but payment shows pending
**Symptoms:** Order exists but `paymentStatus` is not "paid"

**Solutions:**
1. Check webhook is being processed
2. Verify `payment_intent.succeeded` event is selected in webhook config
3. Check for errors in webhook processing logs
4. Manually trigger webhook from Stripe dashboard

---

## 📞 Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Webhook Guide:** https://stripe.com/docs/webhooks
- **Testing Guide:** https://stripe.com/docs/testing
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Support:** https://support.stripe.com

---

**Last Updated:** February 2026  
**Version:** 1.0.0
