# 🚀 Complete Frontend Example Project Structure

## 📁 Project Structure

```
my-food-delivery-app/
├── public/
│   └── images/
├── src/
│   ├── components/
│   │   ├── PaymentForm.jsx
│   │   ├── PaymentFormCard.jsx
│   │   ├── OrderSummary.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/
│   │   ├── checkout.jsx
│   │   ├── order-success.jsx
│   │   └── orders.jsx
│   ├── lib/
│   │   ├── stripe.js
│   │   └── api.js
│   ├── styles/
│   │   ├── checkout.css
│   │   └── global.css
│   └── utils/
│       ├── formatters.js
│       └── validators.js
├── package.json
└── .env.local
```

---

## 📦 package.json

```json
{
  "name": "food-delivery-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@stripe/stripe-js": "^2.4.0",
    "@stripe/react-stripe-js": "^2.4.0",
    "axios": "^1.6.0"
  }
}
```

---

## 🔧 .env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📚 lib/api.js (API Helper)

```javascript
// lib/api.js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API methods
export const stripeAPI = {
  // Get Stripe config
  getConfig: async () => {
    const response = await api.get('/stripe/config');
    return response.data;
  },

  // Create payment intent
  createPaymentIntent: async (providerId, items) => {
    const response = await api.post('/stripe/create-payment-intent', {
      providerId,
      items,
    });
    return response.data;
  },

  // Get payment status
  getPaymentStatus: async (paymentIntentId) => {
    const response = await api.get(`/stripe/payment-status/${paymentIntentId}`);
    return response.data;
  },
};

export const orderAPI = {
  // Get order details
  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Get user orders
  getUserOrders: async (page = 1, limit = 10) => {
    const response = await api.get(`/customer/orders?page=${page}&limit=${limit}`);
    return response.data;
  },
};

export default api;
```

---

## 🎨 lib/stripe.js

```javascript
// lib/stripe.js
import { loadStripe } from '@stripe/stripe-js';
import { stripeAPI } from './api';

let stripePromise = null;

export const getStripePromise = async () => {
  if (!stripePromise) {
    try {
      const { data } = await stripeAPI.getConfig();
      stripePromise = loadStripe(data.publishableKey);
    } catch (error) {
      console.error('Failed to load Stripe:', error);
      throw error;
    }
  }
  return stripePromise;
};
```

---

## 🛠️ utils/formatters.js

```javascript
// utils/formatters.js

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    pending: '#ffc107',
    preparing: '#17a2b8',
    ready_for_pickup: '#28a745',
    picked_up: '#007bff',
    completed: '#28a745',
    cancelled: '#dc3545',
  };
  return colors[status] || '#6c757d';
};

export const getPaymentStatusBadgeColor = (status) => {
  const colors = {
    pending: '#ffc107',
    processing: '#17a2b8',
    paid: '#28a745',
    failed: '#dc3545',
    refunded: '#6c757d',
  };
  return colors[status] || '#6c757d';
};
```

---

## 🎯 components/LoadingSpinner.jsx

```javascript
// components/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>{message}</p>
      
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #5469d4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        p {
          color: #666;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
```

---

## 🎯 Complete Checkout Page with Error Handling

```javascript
// pages/checkout.jsx
import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '../lib/stripe';
import { stripeAPI } from '../lib/api';
import PaymentForm from '../components/PaymentForm';
import OrderSummary from '../components/OrderSummary';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CheckoutPage() {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get cart from localStorage or state management
  const [cart, setCart] = useState(null);

  useEffect(() => {
    initializeCheckout();
  }, []);

  const initializeCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load cart
      const cartData = JSON.parse(localStorage.getItem('cart') || '{}');
      if (!cartData.items || cartData.items.length === 0) {
        setError('আপনার cart খালি। অনুগ্রহ করে items যোগ করুন।');
        return;
      }
      setCart(cartData);

      // Initialize Stripe
      const stripe = await getStripePromise();
      setStripePromise(stripe);

      // Create payment intent
      const result = await stripeAPI.createPaymentIntent(
        cartData.providerId,
        cartData.items.map(item => ({
          foodId: item.id,
          quantity: item.quantity
        }))
      );

      if (result.success) {
        setClientSecret(result.data.clientSecret);
        setBreakdown(result.data.breakdown);
      } else {
        setError(result.message || 'Payment intent তৈরি করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error('Checkout initialization error:', err);
      setError(
        err.response?.data?.message || 
        'Checkout initialize করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Checkout প্রস্তুত করা হচ্ছে..." />;
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2>একটি সমস্যা হয়েছে</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={initializeCheckout} className="retry-button">
              🔄 আবার চেষ্টা করুন
            </button>
            <button onClick={() => window.location.href = '/'} className="home-button">
              🏠 Home এ যান
            </button>
          </div>
        </div>

        <style jsx>{`
          .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            padding: 20px;
          }

          .error-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            max-width: 500px;
            text-align: center;
          }

          .error-icon {
            font-size: 60px;
            margin-bottom: 20px;
          }

          h2 {
            color: #e74c3c;
            margin-bottom: 15px;
          }

          p {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
          }

          .error-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
          }

          button {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          }

          .retry-button {
            background: #5469d4;
            color: white;
            border: none;
          }

          .retry-button:hover {
            background: #4355c8;
          }

          .home-button {
            background: white;
            color: #5469d4;
            border: 2px solid #5469d4;
          }

          .home-button:hover {
            background: #f8f9fa;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>💳 Checkout</h1>
        
        <div className="checkout-grid">
          <div className="order-section">
            <OrderSummary 
              items={cart.items}
              breakdown={breakdown}
            />
          </div>

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

      <style jsx>{`
        .checkout-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }

        .checkout-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        h1 {
          color: #333;
          margin-bottom: 30px;
        }

        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        @media (max-width: 768px) {
          .checkout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
```

---

## 🎯 Orders List Page

```javascript
// pages/orders.jsx
import React, { useState, useEffect } from 'react';
import { orderAPI } from '../lib/api';
import { formatCurrency, formatDate, getStatusBadgeColor } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await orderAPI.getUserOrders(page, 10);
      
      if (result.success) {
        setOrders(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      setError('Orders load করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (loading && orders.length === 0) {
    return <LoadingSpinner message="Orders load হচ্ছে..." />;
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>📋 My Orders</h1>

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>কোনো order নেই</h2>
            <p>আপনার প্রথম order place করুন!</p>
            <button onClick={() => window.location.href = '/'}>
              🍔 Browse Foods
            </button>
          </div>
        ) : (
          <>
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3>{order.orderId}</h3>
                      <p className="order-date">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="order-badges">
                      <span 
                        className="status-badge"
                        style={{ background: getStatusBadgeColor(order.status) }}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="order-body">
                    <div className="order-info">
                      <span>Items: {order.items?.length || 0}</span>
                      <span>Total: {formatCurrency(order.totalPrice)}</span>
                    </div>
                  </div>

                  <div className="order-footer">
                    <button 
                      onClick={() => window.location.href = `/orders/${order.orderId}`}
                      className="view-button"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span>Page {page} of {pagination.pages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .orders-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }

        .orders-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        h1 {
          color: #333;
          margin-bottom: 30px;
        }

        .error-banner {
          background: #fee;
          color: #e74c3c;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .empty-state {
          background: white;
          padding: 60px 40px;
          border-radius: 12px;
          text-align: center;
        }

        .empty-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }

        .empty-state h2 {
          color: #333;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 30px;
        }

        .empty-state button {
          padding: 14px 28px;
          background: #5469d4;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .order-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 15px;
        }

        .order-header h3 {
          color: #333;
          margin-bottom: 5px;
        }

        .order-date {
          color: #666;
          font-size: 14px;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .order-body {
          margin-bottom: 15px;
        }

        .order-info {
          display: flex;
          gap: 20px;
          color: #666;
        }

        .order-footer {
          display: flex;
          justify-content: flex-end;
        }

        .view-button {
          padding: 10px 20px;
          background: #5469d4;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .view-button:hover {
          background: #4355c8;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-top: 30px;
        }

        .pagination button {
          padding: 10px 20px;
          background: white;
          border: 2px solid #5469d4;
          color: #5469d4;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination button:not(:disabled):hover {
          background: #f8f9fa;
        }
      `}</style>
    </div>
  );
}
```

---

## 📝 Usage Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Test Payment Flow
1. Add items to cart
2. Go to `/checkout`
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. View order on success page

---

## 🎯 Key Features

✅ Complete payment flow  
✅ Error handling  
✅ Loading states  
✅ Responsive design  
✅ Order history  
✅ Payment status tracking  
✅ User-friendly messages  
✅ Mobile support  
✅ Test mode ready  

---

**Ready to use!** 🚀
