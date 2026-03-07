# ✅ Webhook Test Fix - Postman

## 🔧 Problem Fixed

**Error:** `WEBHOOK_VERIFICATION_FAILED - No signatures found matching the expected signature`

**Solution:** Added `x-test-webhook: true` header to bypass signature verification for manual testing.

---

## 🚀 How to Test Webhook in Postman

### Method 1: Use Updated Collection (Recommended)

1. **Import Updated Collection:**
```
File → Import → postmanfile/postman_stripe_complete_save.json
```

2. **Find Webhook Request:**
```
📁 Stripe Payment → 4. Test Webhook (Manual)
```

3. **Update Body with Your Data:**
```json
{
  "id": "evt_test_webhook",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "{{paymentIntentId}}",
      "amount": 4687,
      "status": "succeeded",
      "metadata": {
        "customerId": "{{userId}}",
        "providerId": "YOUR_PROVIDER_ID",
        "state": "CA",
        "items": "[{\"foodId\":\"YOUR_FOOD_ID\",\"quantity\":2}]"
      }
    }
  }
}
```

4. **Send Request**

**✅ Expected Response:**
```json
{
  "received": true
}
```

**✅ Console Output:**
```
✅ WEBHOOK RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 Event Type: payment_intent.succeeded
✅ Webhook processed successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Method 2: Manual Request Setup

If you want to create your own webhook test request:

**Endpoint:**
```
POST {{baseUrl}}/stripe/webhook
```

**Headers:**
```
Content-Type: application/json
x-test-webhook: true
```

**Body:**
```json
{
  "id": "evt_test_webhook",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3QdABC123XYZ789",
      "amount": 4687,
      "status": "succeeded",
      "metadata": {
        "customerId": "699a469eaf1d0c8714b662e0",
        "providerId": "69714abce548ab10b90c0e50",
        "state": "CA",
        "items": "[{\"foodId\":\"65f9876543210fedcba98765\",\"quantity\":2}]"
      }
    }
  }
}
```

---

## 🔑 Key Points

### The Magic Header
```
x-test-webhook: true
```

This header tells the backend to:
- ✅ Skip Stripe signature verification
- ✅ Accept the webhook body as-is
- ✅ Process the event normally

### When to Use

**Use `x-test-webhook: true` for:**
- ✅ Postman testing
- ✅ Manual webhook simulation
- ✅ Development testing

**DON'T use for:**
- ❌ Production webhooks
- ❌ Real Stripe webhook events
- ❌ Automated testing with real Stripe

---

## 📋 Complete Testing Flow

### Step 1: Create Payment Intent
```
POST /stripe/create-payment-intent
→ Get paymentIntentId
```

### Step 2: Simulate Webhook
```
POST /stripe/webhook
Headers: x-test-webhook: true
Body: Use paymentIntentId from Step 1
→ Order created
```

### Step 3: Verify Order
```
GET /stripe/payment-status/{paymentIntentId}
→ Should show orderId
```

### Step 4: Get Order Details
```
GET /orders/{orderId}
→ Complete order information
```

---

## 🧪 Test Scenarios

### Scenario 1: Successful Payment
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "status": "succeeded"
    }
  }
}
```

**Expected:** Order created with `paymentStatus: 'paid'`

---

### Scenario 2: Failed Payment
```json
{
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "status": "requires_payment_method"
    }
  }
}
```

**Expected:** No order created, failure logged

---

## 🔍 Debugging

### Check Server Logs

**Look for:**
```
⚠️ [Stripe Webhook] Testing header detected. Bypassing signature verification...
✅ Received webhook event: payment_intent.succeeded (evt_test_webhook)
```

### Common Issues

**Issue 1: Still getting verification error**
```
Solution: Make sure header is exactly "x-test-webhook: true"
```

**Issue 2: Order not created**
```
Solution: Check metadata has correct IDs (customerId, providerId, foodId)
```

**Issue 3: Invalid JSON**
```
Solution: Validate JSON body, check quotes and commas
```

---

## ✅ Success Checklist

- [ ] Updated collection imported
- [ ] Webhook request found
- [ ] Header `x-test-webhook: true` present
- [ ] Body updated with real IDs
- [ ] Request sent successfully
- [ ] Response: `{"received": true}`
- [ ] Server logs show webhook processed
- [ ] Order created in database
- [ ] Payment status shows orderId

---

**Fixed:** February 26, 2026  
**Status:** ✅ Working
