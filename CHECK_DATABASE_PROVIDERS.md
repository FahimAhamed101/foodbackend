# 🔍 Database Check - Provider Data

## MongoDB Queries to Check Provider Data

### 1. Check if Users with PROVIDER role exist

```javascript
// MongoDB Compass or mongo shell
db.users.find({ role: "PROVIDER" }).count()
```

**Expected:** Should return number > 0

**If 0:** No provider users exist, need to create them first

---

### 2. Check Provider Profiles

```javascript
db.providerprofiles.find().count()
```

**Expected:** Should return number > 0

**If 0:** No provider profiles exist

---

### 3. Check Provider Profiles with Details

```javascript
db.providerprofiles.find({}, {
  restaurantName: 1,
  providerId: 1,
  isActive: 1,
  status: 1,
  verificationStatus: 1,
  city: 1,
  state: 1
}).pretty()
```

**Expected Output:**
```json
{
  "_id": ObjectId("..."),
  "restaurantName": "Pizza House",
  "providerId": ObjectId("..."),
  "isActive": true,
  "status": "ACTIVE",
  "verificationStatus": "APPROVED",
  "city": "New York",
  "state": "NY"
}
```

---

### 4. Check if Provider IDs are populated correctly

```javascript
db.providerprofiles.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "providerId",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $project: {
      restaurantName: 1,
      providerId: 1,
      userExists: { $size: "$user" },
      userName: { $arrayElemAt: ["$user.fullName", 0] }
    }
  }
])
```

**Expected:** `userExists` should be 1 for each provider

---

### 5. Check Reviews

```javascript
db.reviews.find().count()
```

**Expected:** Should return number > 0 if you want to see ratings

---

### 6. Check Reviews by Provider

```javascript
db.reviews.aggregate([
  {
    $group: {
      _id: "$providerId",
      averageRating: { $avg: "$rating" },
      totalReviews: { $sum: 1 }
    }
  },
  {
    $sort: { totalReviews: -1 }
  }
])
```

**Expected Output:**
```json
{
  "_id": ObjectId("provider_id"),
  "averageRating": 4.5,
  "totalReviews": 25
}
```

---

## 🔧 Fix Issues

### Issue 1: No Provider Users

**Create a provider user:**

```javascript
db.users.insertOne({
  fullName: "Test Restaurant Owner",
  email: "provider@test.com",
  password: "$2a$10$...", // hashed password
  role: "PROVIDER",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

### Issue 2: No Provider Profiles

**Create a provider profile:**

```javascript
db.providerprofiles.insertOne({
  providerId: ObjectId("USER_ID_HERE"),
  restaurantName: "Test Restaurant",
  contactEmail: "restaurant@test.com",
  phoneNumber: "+1-555-0123",
  restaurantAddress: "123 Main St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  verificationStatus: "APPROVED",
  isVerify: true,
  isActive: true,
  status: "ACTIVE",
  cuisine: ["Italian", "Pizza"],
  profile: "https://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

### Issue 3: providerId is null in Provider Profiles

**Fix null providerId:**

```javascript
// Find profiles with null providerId
db.providerprofiles.find({ providerId: null })

// If found, you need to update them with valid user IDs
// First, get a valid provider user ID
db.users.findOne({ role: "PROVIDER" }, { _id: 1 })

// Then update the profile
db.providerprofiles.updateOne(
  { _id: ObjectId("PROFILE_ID") },
  { $set: { providerId: ObjectId("USER_ID") } }
)
```

---

## 🧪 Quick Test Script

Run this in MongoDB shell to check everything:

```javascript
print("=== DATABASE CHECK ===\n");

print("1. Total Users:");
print("   - Total: " + db.users.count());
print("   - Providers: " + db.users.count({ role: "PROVIDER" }));
print("   - Customers: " + db.users.count({ role: "CUSTOMER" }));
print("   - Admins: " + db.users.count({ role: "ADMIN" }));

print("\n2. Provider Profiles:");
print("   - Total: " + db.providerprofiles.count());
print("   - Active: " + db.providerprofiles.count({ isActive: true }));
print("   - Approved: " + db.providerprofiles.count({ verificationStatus: "APPROVED" }));
print("   - With null providerId: " + db.providerprofiles.count({ providerId: null }));

print("\n3. Reviews:");
print("   - Total: " + db.reviews.count());

print("\n4. Foods:");
print("   - Total: " + db.foods.count());
print("   - Available: " + db.foods.count({ foodStatus: true }));

print("\n5. Sample Provider Profile:");
var sampleProvider = db.providerprofiles.findOne({}, {
  restaurantName: 1,
  providerId: 1,
  isActive: 1,
  status: 1,
  verificationStatus: 1
});
printjson(sampleProvider);

print("\n=== END CHECK ===");
```

---

## 🎯 Expected Results for Working System

✅ Users with PROVIDER role: > 0  
✅ Provider Profiles: > 0  
✅ Provider Profiles with null providerId: 0  
✅ Active & Approved Providers: > 0  
✅ Reviews (optional): >= 0  

---

## 📞 Next Steps

1. Run the queries above in MongoDB Compass or mongo shell
2. Check the results
3. If any issues found, use the fix scripts
4. Test the API again

---

**Created:** February 26, 2026  
**Purpose:** Database verification for Top Rated Restaurants API
