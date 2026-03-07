# 🔧 Cart Cleanup Script

## Problem:
Cart collection এ ভুলভাবে `providerId` field add হয়ে গেছে যেটা cart model এ নেই।

## Solution:
Database থেকে এই field remove করতে হবে।

---

## MongoDB Shell Command:

```javascript
// Connect to MongoDB
use emdr-db

// Remove providerId field from all cart documents
db.carts.updateMany(
  {},
  { $unset: { providerId: "" } }
)

// Verify the change
db.carts.find().pretty()
```

---

## Or using MongoDB Compass:

1. Open MongoDB Compass
2. Connect to your database
3. Go to `carts` collection
4. Click on "Aggregations" tab
5. Add this pipeline:

```json
[
  {
    "$project": {
      "providerId": 0
    }
  },
  {
    "$out": "carts"
  }
]
```

6. Click "Run"

---

## Or using Node.js Script:

Create a file `cleanup-cart.js`:

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/emdr-db');

async function cleanup() {
  const result = await mongoose.connection.db.collection('carts').updateMany(
    {},
    { $unset: { providerId: "" } }
  );
  
  console.log(`✅ Updated ${result.modifiedCount} cart documents`);
  process.exit(0);
}

cleanup();
```

Run it:
```bash
node cleanup-cart.js
```

---

## ✅ After Cleanup:

Cart response এখন এরকম হবে:

```json
{
  "success": true,
  "data": {
    "_id": "699a49c9af1d0c8714b66321",
    "userId": "699a469eaf1d0c8714b662e0",
    "items": [
      {
        "foodId": {
          "_id": "69a5e74df2bbe6450c4317a1",
          "title": "Fiery Tandoori Comfort Bowl",
          "image": "http://res.cloudinary.com/.../n8jqbtdglyq4faf26nsz.png",
          "serviceFee": 1,
          "finalPriceTag": 6.99,
          "foodAvailability": true,
          "providerId": "69a4837b7aed271fc59f2ff8"  ← Food এর provider ID
        },
        "quantity": 1,
        "price": 6.99
      }
    ],
    "subtotal": 6.99,
    "createdAt": "2026-02-22T00:11:53.134Z",
    "updatedAt": "2026-03-02T19:41:01.196Z"
  }
}
```

**Note:** `providerId` এখন cart level এ নেই, food level এ আছে (যেটা সঠিক)।

---

## Why This Happened:

Cart collection এ manually বা কোনো পুরানো code দিয়ে `providerId` add হয়ে গিয়েছিল। কিন্তু cart model এ এই field define করা নেই।

## Correct Structure:

- ❌ Cart level এ `providerId` থাকা উচিত না
- ✅ প্রতিটা food item এর নিজস্ব `providerId` থাকবে
- ✅ এতে multiple providers এর food একসাথে cart এ রাখা যাবে
