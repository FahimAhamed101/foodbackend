# 🚀 Frontend Payment Integration - দ্রুত গাইড (বাংলা)

## ⚡ ৩ মিনিটে শুরু করুন

### ১. Install করুন
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### ২. Stripe Setup
```javascript
// lib/stripe.js
import { loadStripe } from '@stripe/stripe-js';

export const getStripe = async () => {
  const res = await fetch('http://localhost:5000/api/v1/stripe/config');
  const { data } = await res.json();
  return loadStripe(data.publishableKey);
};
```

### ৩. Payment Component
```javascript
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/success',
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit">Pay Now</button>
    </form>
  );
}
```

---

## 📡 API Calls

### Payment Intent তৈরি করুন
```javascript
const response = await fetch('http://localhost:5000/api/v1/stripe/create-payment-intent', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    providerId: 'provider_id',
    items: [
      { foodId: 'food_id', quantity: 2 }
    ]
  })
});

const { data } = await response.json();
// data.clientSecret ব্যবহার করুন
```

### Payment Status চেক করুন
```javascript
const response = await fetch(
  `http://localhost:5000/api/v1/stripe/payment-status/${paymentIntentId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data } = await response.json();
// data.orderId পাবেন
```

---

## 🎨 সম্পূর্ণ Checkout Page

```javascript
import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../lib/stripe';

export default function Checkout() {
  const [stripe, setStripe] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Stripe load করুন
    getStripe().then(setStripe);
    
    // Payment Intent তৈরি করুন
    fetch('http://localhost:5000/api/v1/stripe/create-payment-intent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providerId: 'provider_id',
        items: [{ foodId: 'food_id', quantity: 2 }]
      })
    })
    .then(res => res.json())
    .then(data => setClientSecret(data.data.clientSecret));
  }, []);

  if (!stripe || !clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <PaymentForm />
    </Elements>
  );
}
```

---

## 💳 Test Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ সফল |
| `4000 0000 0000 0002` | ❌ Decline |
| `4000 0025 0000 3155` | 🔐 3D Secure |

**Details:**
- Expiry: `12/34`
- CVC: `123`
- ZIP: `12345`

---

## 🔄 Payment Flow

```
1. User Checkout page এ যায়
   ↓
2. Backend থেকে clientSecret নিন
   POST /api/v1/stripe/create-payment-intent
   ↓
3. Stripe.js দিয়ে payment confirm করুন
   stripe.confirmPayment({ clientSecret })
   ↓
4. Success page এ redirect হবে
   /order-success?payment_intent=pi_xxx
   ↓
5. Payment status check করুন
   GET /api/v1/stripe/payment-status/:id
   ↓
6. Order details দেখান
```

---

## 🎯 Important Points

### ✅ করবেন:
- সবসময় HTTPS ব্যবহার করুন
- Backend থেকে publishable key নিন
- Error handling করুন
- Loading states দেখান
- User-friendly messages দিন

### ❌ করবেন না:
- Secret key frontend এ রাখবেন না
- Card details নিজে handle করবেন না
- Amount frontend থেকে পাঠাবেন না
- Sensitive data log করবেন না

---

## 🐛 Common Errors

### "Stripe is not defined"
```javascript
// Solution: Stripe load হওয়ার জন্য wait করুন
if (!stripe) return <div>Loading...</div>;
```

### "clientSecret is required"
```javascript
// Solution: clientSecret পাওয়ার পর render করুন
if (!clientSecret) return <div>Loading...</div>;
```

### "Network Error"
```javascript
// Solution: API URL check করুন
console.log(process.env.NEXT_PUBLIC_API_URL);
```

---

## 📚 সম্পূর্ণ Documentation

- **বিস্তারিত গাইড:** `FRONTEND_PAYMENT_INTEGRATION_BANGLA.md`
- **Example Project:** `FRONTEND_EXAMPLE_PROJECT.md`
- **Backend API:** `STRIPE_INTEGRATION_GUIDE.md`

---

## 💡 Tips

1. **Development Mode:** Test cards ব্যবহার করুন
2. **Error Handling:** সব API calls এ try-catch ব্যবহার করুন
3. **Loading States:** User experience ভালো করার জন্য
4. **Mobile:** Responsive design নিশ্চিত করুন
5. **Security:** Token secure storage এ রাখুন

---

## 🎉 Ready!

এখন আপনি frontend এ Stripe payment integrate করতে পারবেন!

**সাহায্য প্রয়োজন?**
- Stripe Docs: https://stripe.com/docs/stripe-js
- React Stripe: https://stripe.com/docs/stripe-js/react

---

**তৈরি:** Kiro AI Assistant 🇧🇩  
**তারিখ:** ফেব্রুয়ারি ২৫, ২০২৬
