# 💳 Frontend Payment Integration - সম্পূর্ণ গাইড (বাংলা)

## 📋 ভূমিকা

এই গাইডে আপনি শিখবেন কিভাবে React/Next.js frontend এ Stripe payment integration করতে হয়। সম্পূর্ণ step-by-step process এবং ready-to-use code examples দেওয়া আছে।

---

## 🚀 দ্রুত শুরু করুন (৩টি ধাপ)

### ধাপ ১: Stripe.js Install করুন

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### ধাপ ২: Stripe Initialize করুন

```javascript
// lib/stripe.js
import { loadStripe } from '@stripe/stripe-js';

// Backend থেকে publishable key নিন
export const getStripePromise = async () => {
  const response = await fetch('http://localhost:5000/api/v1/stripe/config');
  const { data } = await response.json();
  return loadStripe(data.publishableKey);
};
```

### ধাপ ৩: Payment Component তৈরি করুন

নিচে সম্পূর্ণ working example দেওয়া আছে।

---

## 🎨 সম্পূর্ণ Payment Flow (React Example)

### 1. Checkout Page Component

```javascript
// pages/checkout.jsx
import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '../lib/stripe';
import PaymentForm from '../components/PaymentForm';
import OrderSummary from '../components/OrderSummary';

export default function CheckoutPage() {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart থেকে items নিন (আপনার state management অনুযায়ী)
  const cartItems = [
    { id: '65f9876543210fedcba98765', name: 'Burger', price: 15.00, quantity: 2 },
    { id: '65f1111111111111111111111', name: 'Pizza', price: 20.00, quantity: 1 }
  ];
  const providerId = '65f1234567890abcdef12345'; // Provider ID

  useEffect(() => {
    // Stripe initialize করুন
    getStripePromise().then(setStripePromise);
    
    // Payment Intent তৈরি করুন
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token'); // আপনার auth token
      
      const response = await fetch('http://localhost:5000/api/v1/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: providerId,
          items: cartItems.map(item => ({
            foodId: item.id,
            quantity: item.quantity
          }))
        })
      });

      const result = await response.json();

      if (result.success) {
        setClientSecret(result.data.clientSecret);
        setBreakdown(result.data.breakdown);
      } else {
        setError(result.message || 'Payment intent তৈরি করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Payment প্রস্তুত করা হচ্ছে...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={createPaymentIntent}>আবার চেষ্টা করুন</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>
        
        <div className="checkout-grid">
          {/* Order Summary */}
          <div className="order-section">
            <OrderSummary 
              items={cartItems}
              breakdown={breakdown}
            />
          </div>

          {/* Payment Form */}
          <div className="payment-section">
            {clientSecret && stripePromise && (
              <Elements 
                stripe={stripePromise} 
                options={{ clientSecret }}
              >
                <PaymentForm 
                  clientSecret={clientSecret}
                  amount={breakdown.total}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2. Order Summary Component

```javascript
// components/OrderSummary.jsx
import React from 'react';

export default function OrderSummary({ items, breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="order-summary">
      <h2>অর্ডার সারাংশ</h2>
      
      {/* Items List */}
      <div className="items-list">
        {items.map((item, index) => (
          <div key={index} className="item-row">
            <div className="item-info">
              <span className="item-name">{item.name}</span>
              <span className="item-quantity">× {item.quantity}</span>
            </div>
            <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="divider"></div>

      {/* Price Breakdown */}
      <div className="price-breakdown">
        <div className="price-row">
          <span>Subtotal</span>
          <span>${breakdown.subtotal.toFixed(2)}</span>
        </div>

        <div className="price-row">
          <span>
            Platform Fee 
            <small> ({breakdown.state === 'CA' ? '10%' : '7%'})</small>
          </span>
          <span>${breakdown.platformFee.toFixed(2)}</span>
        </div>

        {breakdown.stateTax > 0 && (
          <div className="price-row">
            <span>Tax ({breakdown.state})</span>
            <span>${breakdown.stateTax.toFixed(2)}</span>
          </div>
        )}

        <div className="divider"></div>

        <div className="price-row total">
          <strong>মোট</strong>
          <strong>${breakdown.total.toFixed(2)}</strong>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="vendor-info">
        <small>
          🏪 Restaurant পাবে: ${breakdown.vendorAmount.toFixed(2)}
        </small>
      </div>
    </div>
  );
}
```

---

### 3. Payment Form Component (Option A - Payment Element)

```javascript
// components/PaymentForm.jsx
import React, { useState } from 'react';
import { 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { useRouter } from 'next/router'; // Next.js এর জন্য

export default function PaymentForm({ clientSecret, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
      });

      if (submitError) {
        setError(getErrorMessage(submitError));
        setProcessing(false);
      }
      // Success হলে Stripe automatically redirect করবে
    } catch (err) {
      setError('Payment process করতে সমস্যা হয়েছে');
      setProcessing(false);
    }
  };

  const getErrorMessage = (error) => {
    const messages = {
      'card_declined': 'আপনার কার্ড decline হয়েছে। অন্য কার্ড ব্যবহার করুন।',
      'insufficient_funds': 'অপর্যাপ্ত balance। অন্য কার্ড ব্যবহার করুন।',
      'expired_card': 'কার্ডের মেয়াদ শেষ। অন্য কার্ড ব্যবহার করুন।',
      'incorrect_cvc': 'ভুল CVC। আবার চেষ্টা করুন।',
      'processing_error': 'Payment process করতে সমস্যা হয়েছে।',
    };
    return messages[error.code] || error.message || 'একটি সমস্যা হয়েছে';
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h2>💳 Payment তথ্য</h2>
      
      <PaymentElement />

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="pay-button"
      >
        {processing ? (
          <>
            <span className="spinner-small"></span>
            Processing...
          </>
        ) : (
          `💰 ${amount.toFixed(2)} টাকা Pay করুন`
        )}
      </button>

      <div className="secure-badge">
        🔒 Secure payment powered by Stripe
      </div>
    </form>
  );
}
```

---

### 4. Payment Form Component (Option B - Card Element)

```javascript
// components/PaymentFormCard.jsx
import React, { useState } from 'react';
import { 
  CardElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#9e2146',
    },
  },
};

export default function PaymentFormCard({ clientSecret, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event) => {
    setCardComplete(event.complete);
    setError(event.error ? event.error.message : null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Customer Name', // আপনার user data থেকে নিন
            }
          }
        }
      );

      if (error) {
        setError(error.message);
        setProcessing(false);
      } else if (paymentIntent.status === 'succeeded') {
        // Success! Redirect to success page
        window.location.href = `/order-success?payment_intent=${paymentIntent.id}`;
      }
    } catch (err) {
      setError('Payment process করতে সমস্যা হয়েছে');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h2>💳 Card তথ্য</h2>
      
      <div className="card-element-container">
        <CardElement 
          options={CARD_ELEMENT_OPTIONS}
          onChange={handleCardChange}
        />
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={!stripe || processing || !cardComplete}
        className="pay-button"
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}
```

---

### 5. Success Page Component

```javascript
// pages/order-success.jsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OrderSuccessPage() {
  const router = useRouter();
  const { payment_intent } = router.query;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (payment_intent) {
      checkPaymentStatus(payment_intent);
    }
  }, [payment_intent]);

  const checkPaymentStatus = async (paymentIntentId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Payment status check করুন
      const response = await fetch(
        `http://localhost:5000/api/v1/stripe/payment-status/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (result.success && result.data.orderId) {
        // Order details fetch করুন
        const orderResponse = await fetch(
          `http://localhost:5000/api/v1/orders/${result.data.orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const orderData = await orderResponse.json();
        setOrder(orderData.data);
      } else {
        setError('Order খুঁজে পাওয়া যায়নি');
      }
    } catch (err) {
      setError('Order details load করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Order details load হচ্ছে...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/orders')}>
          My Orders দেখুন
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="error-container">
        <h2>⚠️ Order পাওয়া যায়নি</h2>
        <p>Support এর সাথে যোগাযোগ করুন</p>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        {/* Success Icon */}
        <div className="success-icon">
          ✅
        </div>

        <h1>Payment সফল হয়েছে!</h1>
        <p className="success-message">
          আপনার order সফলভাবে place হয়েছে
        </p>

        {/* Order Details */}
        <div className="order-details-card">
          <div className="detail-row">
            <span className="label">Order ID:</span>
            <span className="value">{order.orderId}</span>
          </div>

          <div className="detail-row">
            <span className="label">মোট:</span>
            <span className="value">${order.totalPrice.toFixed(2)}</span>
          </div>

          <div className="detail-row">
            <span className="label">Status:</span>
            <span className="value status-badge">{order.status}</span>
          </div>

          <div className="detail-row">
            <span className="label">Payment:</span>
            <span className="value payment-badge">
              {order.paymentStatus === 'paid' ? '✅ Paid' : order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="order-items">
          <h3>Order Items:</h3>
          {order.items.map((item, index) => (
            <div key={index} className="item-row">
              <span>{item.quantity}x {item.foodId.name}</span>
              <span>${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="action-buttons">
          <button 
            onClick={() => router.push('/orders')}
            className="primary-button"
          >
            📋 My Orders দেখুন
          </button>
          
          <button 
            onClick={() => router.push('/')}
            className="secondary-button"
          >
            🏠 Home এ যান
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 CSS Styles

```css
/* styles/checkout.css */

.checkout-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

.checkout-container {
  max-width: 1200px;
  margin: 0 auto;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 30px;
}

@media (max-width: 768px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}

/* Order Summary */
.order-summary {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.order-summary h2 {
  margin-bottom: 20px;
  color: #333;
}

.items-list {
  margin-bottom: 20px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.item-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.item-name {
  font-weight: 500;
}

.item-quantity {
  color: #666;
  font-size: 14px;
}

.price-breakdown {
  margin-top: 20px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  color: #666;
}

.price-row.total {
  font-size: 1.2em;
  color: #333;
  padding-top: 15px;
}

.price-row small {
  font-size: 12px;
  color: #999;
}

.divider {
  height: 1px;
  background: #eee;
  margin: 15px 0;
}

.vendor-info {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.vendor-info small {
  color: #666;
}

/* Payment Form */
.payment-form {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.payment-form h2 {
  margin-bottom: 20px;
  color: #333;
}

.card-element-container {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
}

.error-message {
  color: #e74c3c;
  padding: 12px;
  background: #fee;
  border-radius: 6px;
  margin: 15px 0;
  font-size: 14px;
}

.pay-button {
  width: 100%;
  padding: 16px;
  background: #5469d4;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.pay-button:hover:not(:disabled) {
  background: #4355c8;
}

.pay-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secure-badge {
  text-align: center;
  margin-top: 15px;
  color: #666;
  font-size: 13px;
}

/* Success Page */
.success-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.success-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.1);
  max-width: 600px;
  text-align: center;
}

.success-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.success-container h1 {
  color: #27ae60;
  margin-bottom: 10px;
}

.success-message {
  color: #666;
  margin-bottom: 30px;
}

.order-details-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: 600;
}

.status-badge {
  background: #fff3cd;
  color: #856404;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.payment-badge {
  background: #d4edda;
  color: #155724;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.order-items {
  margin: 20px 0;
  text-align: left;
}

.order-items h3 {
  margin-bottom: 15px;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.primary-button, .secondary-button {
  flex: 1;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-button {
  background: #5469d4;
  color: white;
  border: none;
}

.primary-button:hover {
  background: #4355c8;
}

.secondary-button {
  background: white;
  color: #5469d4;
  border: 2px solid #5469d4;
}

.secondary-button:hover {
  background: #f8f9fa;
}

/* Loading & Error States */
.loading-container, .error-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #5469d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 🧪 Test করার জন্য

### Test Cards (Development Mode)

```javascript
// Test করার সময় এই cards ব্যবহার করুন

const TEST_CARDS = {
  success: '4242 4242 4242 4242',        // ✅ সফল হবে
  decline: '4000 0000 0000 0002',        // ❌ Decline হবে
  requiresAuth: '4000 0025 0000 3155',   // 🔐 3D Secure চাইবে
  insufficientFunds: '4000 0000 0000 9995' // 💳 Insufficient funds
};

// Card details:
// Expiry: যেকোনো ভবিষ্যৎ তারিখ (12/34)
// CVC: যেকোনো 3 digit (123)
// ZIP: যেকোনো 5 digit (12345)
```

---

## 📱 Mobile Responsive

```javascript
// Mobile এর জন্য deep link support
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const returnUrl = isMobile 
  ? 'myapp://order-success'  // Mobile app deep link
  : `${window.location.origin}/order-success`; // Web URL

await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: returnUrl,
  },
});
```

---

## 🔐 Security Best Practices

```javascript
// ✅ করবেন:
1. সবসময় HTTPS ব্যবহার করুন
2. Backend থেকে publishable key নিন
3. Token secure storage এ রাখুন (httpOnly cookies)
4. Amount backend থেকে verify করুন
5. Error messages user-friendly রাখুন

// ❌ করবেন না:
1. Secret key frontend এ expose করবেন না
2. Card details নিজে handle করবেন না
3. Amount frontend থেকে পাঠাবেন না
4. Sensitive data log করবেন না
```

---

## 🎯 সম্পূর্ণ Flow Summary

```
1. User Checkout page এ যায়
   ↓
2. Frontend Payment Intent তৈরি করে
   POST /api/v1/stripe/create-payment-intent
   ↓
3. Backend clientSecret return করে
   ↓
4. User card details দেয়
   ↓
5. Stripe.js payment confirm করে
   ↓
6. Stripe webhook পাঠায়
   ↓
7. Backend Order তৈরি করে
   ↓
8. User Success page এ redirect হয়
   ↓
9. Order details দেখায়
```

---

## 📞 সাহায্য প্রয়োজন?

- Backend API: `STRIPE_INTEGRATION_GUIDE.md` দেখুন
- Testing: `STRIPE_TESTING_GUIDE.md` দেখুন
- Stripe Docs: https://stripe.com/docs/stripe-js

---

**তৈরি করেছেন:** Kiro AI Assistant  
**তারিখ:** ফেব্রুয়ারি ২৫, ২০২৬  
**ভাষা:** বাংলা 🇧🇩
