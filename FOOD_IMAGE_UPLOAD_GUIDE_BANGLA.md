# 🍔 Food Image Upload Guide - Form-Data Support (বাংলা)

**তারিখ:** মার্চ ২, ২০২৬  
**স্ট্যাটাস:** ✅ সম্পূর্ণ এবং কার্যকর

---

## 📋 Overview

`POST /api/v1/foods` এবং `PATCH /api/v1/foods/:id` endpoints এখন **2 ভাবে** image support করে:

1. **JSON Body** - Image URL string পাঠানো (existing)
2. **Form-Data** - Image file upload করা (new ✨)

---

## 🎯 Method 1: JSON Body (Image URL)

### Create Food with Image URL

```http
POST {{baseUrl}}/api/v1/foods
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "categoryId": "65f9876543210fedcba98765",
  "image": "https://res.cloudinary.com/demo/image/upload/v123456/burger.jpg",
  "title": "Cheese Burger",
  "foodAvailability": true,
  "calories": 450,
  "productDescription": "Delicious cheese burger with fresh ingredients",
  "baseRevenue": 8.99,
  "serviceFee": 1.00,
  "foodStatus": true
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "_id": "65f9876543210fedcba98765",
    "categoryId": "65f9876543210fedcba98765",
    "providerId": "69714abce548ab10b90c0e50",
    "image": "https://res.cloudinary.com/demo/image/upload/v123456/burger.jpg",
    "title": "Cheese Burger",
    "finalPriceTag": 9.99,
    "foodAvailability": true,
    "calories": 450,
    "productDescription": "Delicious cheese burger with fresh ingredients",
    "baseRevenue": 8.99,
    "serviceFee": 1.00,
    "foodStatus": true,
    "createdAt": "2026-03-02T10:30:00.000Z"
  }
}
```

---

## 🎯 Method 2: Form-Data (File Upload) ✨ NEW

### Create Food with File Upload

```http
POST {{baseUrl}}/api/v1/foods
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

Form Data:
├─ categoryId: 65f9876543210fedcba98765
├─ image: [FILE] burger.jpg
├─ title: Cheese Burger
├─ foodAvailability: true
├─ calories: 450
├─ productDescription: Delicious cheese burger
├─ baseRevenue: 8.99
├─ serviceFee: 1.00
└─ foodStatus: true
```

### Response:
```json
{
  "success": true,
  "data": {
    "_id": "65f9876543210fedcba98765",
    "categoryId": "65f9876543210fedcba98765",
    "providerId": "69714abce548ab10b90c0e50",
    "image": "https://res.cloudinary.com/dbglkfj2z/image/upload/v1709123456/uploads/burger_abc123.jpg",
    "title": "Cheese Burger",
    "finalPriceTag": 9.99,
    "foodAvailability": true,
    "calories": 450,
    "productDescription": "Delicious cheese burger",
    "baseRevenue": 8.99,
    "serviceFee": 1.00,
    "foodStatus": true,
    "createdAt": "2026-03-02T10:30:00.000Z"
  }
}
```

**✅ Image automatically uploaded to Cloudinary and URL saved in database!**

---

## 📱 Postman Setup - Form-Data

### Step 1: Create New Request

1. Method: `POST`
2. URL: `{{baseUrl}}/api/v1/foods`
3. Headers:
   - `Authorization`: `Bearer {{token}}`
   - **DON'T** add `Content-Type` (Postman auto-sets it for form-data)

### Step 2: Select Body Type

1. Click **Body** tab
2. Select **form-data** (NOT raw JSON)

### Step 3: Add Form Fields

| Key | Type | Value |
|-----|------|-------|
| categoryId | Text | 65f9876543210fedcba98765 |
| image | File | [Select burger.jpg] |
| title | Text | Cheese Burger |
| foodAvailability | Text | true |
| calories | Text | 450 |
| productDescription | Text | Delicious cheese burger |
| baseRevenue | Text | 8.99 |
| serviceFee | Text | 1.00 |
| foodStatus | Text | true |

### Step 4: Select Image File

1. Click on **image** field
2. Change type from **Text** to **File**
3. Click **Select Files**
4. Choose your image (burger.jpg, pizza.png, etc.)

### Step 5: Send Request

Click **Send** button

---

## 🔄 Update Food with Image

### Update with Form-Data

```http
PATCH {{baseUrl}}/api/v1/foods/65f9876543210fedcba98765
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

Form Data:
├─ image: [FILE] new-burger.jpg
├─ title: Updated Cheese Burger
└─ baseRevenue: 9.99
```

### Update with JSON (Image URL)

```http
PATCH {{baseUrl}}/api/v1/foods/65f9876543210fedcba98765
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "image": "https://res.cloudinary.com/demo/image/upload/v123456/new-burger.jpg",
  "title": "Updated Cheese Burger",
  "baseRevenue": 9.99
}
```

---

## 🎨 Supported Image Formats

Cloudinary supports:
- ✅ JPG/JPEG
- ✅ PNG
- ✅ GIF
- ✅ WebP
- ✅ SVG
- ✅ BMP
- ✅ TIFF

**Max File Size:** 20MB

---

## 🔒 Security Features

### ✅ 1. Authentication Required
```javascript
// Must be logged in as PROVIDER
Authorization: Bearer {token}
```

### ✅ 2. Provider Approval Required
```javascript
// Provider must be approved by admin
requireApproval middleware
```

### ✅ 3. File Size Limit
```javascript
// Max 20MB per file
limits: { fileSize: 20 * 1024 * 1024 }
```

### ✅ 4. Cloudinary Upload
```javascript
// Files uploaded to secure Cloudinary storage
// Returns HTTPS URL
```

### ✅ 5. Image Required
```javascript
// Either URL or file must be provided
if (!image) {
  throw new AppError('Image is required', 400);
}
```

---

## 📊 Complete Postman Collection

### 1. Create Food (JSON with URL)

```json
{
  "name": "Create Food - JSON (Image URL)",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{token}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"categoryId\": \"{{categoryId}}\",\n  \"image\": \"https://res.cloudinary.com/demo/image/upload/v123456/burger.jpg\",\n  \"title\": \"Cheese Burger\",\n  \"foodAvailability\": true,\n  \"calories\": 450,\n  \"productDescription\": \"Delicious cheese burger\",\n  \"baseRevenue\": 8.99,\n  \"serviceFee\": 1.00,\n  \"foodStatus\": true\n}"
    },
    "url": {
      "raw": "{{baseUrl}}/api/v1/foods",
      "host": ["{{baseUrl}}"],
      "path": ["api", "v1", "foods"]
    }
  }
}
```

### 2. Create Food (Form-Data with File)

```json
{
  "name": "Create Food - Form-Data (File Upload)",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{token}}"
      }
    ],
    "body": {
      "mode": "formdata",
      "formdata": [
        {
          "key": "categoryId",
          "value": "{{categoryId}}",
          "type": "text"
        },
        {
          "key": "image",
          "type": "file",
          "src": "/path/to/burger.jpg"
        },
        {
          "key": "title",
          "value": "Cheese Burger",
          "type": "text"
        },
        {
          "key": "foodAvailability",
          "value": "true",
          "type": "text"
        },
        {
          "key": "calories",
          "value": "450",
          "type": "text"
        },
        {
          "key": "productDescription",
          "value": "Delicious cheese burger",
          "type": "text"
        },
        {
          "key": "baseRevenue",
          "value": "8.99",
          "type": "text"
        },
        {
          "key": "serviceFee",
          "value": "1.00",
          "type": "text"
        },
        {
          "key": "foodStatus",
          "value": "true",
          "type": "text"
        }
      ]
    },
    "url": {
      "raw": "{{baseUrl}}/api/v1/foods",
      "host": ["{{baseUrl}}"],
      "path": ["api", "v1", "foods"]
    }
  }
}
```

### 3. Update Food (Form-Data with File)

```json
{
  "name": "Update Food - Form-Data (File Upload)",
  "request": {
    "method": "PATCH",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{token}}"
      }
    ],
    "body": {
      "mode": "formdata",
      "formdata": [
        {
          "key": "image",
          "type": "file",
          "src": "/path/to/new-burger.jpg"
        },
        {
          "key": "title",
          "value": "Updated Cheese Burger",
          "type": "text"
        },
        {
          "key": "baseRevenue",
          "value": "9.99",
          "type": "text"
        }
      ]
    },
    "url": {
      "raw": "{{baseUrl}}/api/v1/foods/{{foodId}}",
      "host": ["{{baseUrl}}"],
      "path": ["api", "v1", "foods", "{{foodId}}"]
    }
  }
}
```

---

## 🧪 Testing Steps

### Test 1: Create Food with JSON (Image URL)

```bash
1. Open Postman
2. Create new request: POST {{baseUrl}}/api/v1/foods
3. Add Authorization header with Bearer token
4. Select Body > raw > JSON
5. Paste JSON with image URL
6. Click Send
7. ✅ Food created with image URL
```

### Test 2: Create Food with Form-Data (File Upload)

```bash
1. Open Postman
2. Create new request: POST {{baseUrl}}/api/v1/foods
3. Add Authorization header with Bearer token
4. Select Body > form-data
5. Add all fields (categoryId, title, etc.)
6. Change "image" field type to "File"
7. Select image file from computer
8. Click Send
9. ✅ Food created with uploaded image
10. ✅ Image URL in response is Cloudinary URL
```

### Test 3: Update Food Image

```bash
1. Open Postman
2. Create new request: PATCH {{baseUrl}}/api/v1/foods/:id
3. Add Authorization header with Bearer token
4. Select Body > form-data
5. Add "image" field as File type
6. Select new image file
7. Click Send
8. ✅ Food image updated
```

---

## ❌ Common Errors

### Error 1: Image Required

```json
{
  "success": false,
  "errorCode": "IMAGE_REQUIRED",
  "message": "Image is required. Provide image URL in JSON or upload file via form-data"
}
```

**Solution:** Either provide `image` URL in JSON or upload file via form-data

### Error 2: Invalid Image URL

```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Invalid image URL"
}
```

**Solution:** Provide valid HTTPS URL for image

### Error 3: File Too Large

```json
{
  "success": false,
  "errorCode": "FILE_TOO_LARGE",
  "message": "File size exceeds 20MB limit"
}
```

**Solution:** Compress image or use smaller file

### Error 4: Unauthorized

```json
{
  "success": false,
  "errorCode": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**Solution:** Add valid Bearer token in Authorization header

---

## 💡 Pro Tips

### Tip 1: Use Form-Data for Mobile Apps
```javascript
// React Native example
const formData = new FormData();
formData.append('categoryId', categoryId);
formData.append('image', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'food.jpg',
});
formData.append('title', 'Cheese Burger');
formData.append('calories', '450');
formData.append('baseRevenue', '8.99');
formData.append('serviceFee', '1.00');

fetch('http://localhost:5000/api/v1/foods', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});
```

### Tip 2: Use JSON for Web Apps (if image already uploaded)
```javascript
// Next.js/React example
const response = await fetch('/api/v1/foods', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    categoryId,
    image: 'https://res.cloudinary.com/demo/image/upload/v123456/burger.jpg',
    title: 'Cheese Burger',
    calories: 450,
    baseRevenue: 8.99,
    serviceFee: 1.00,
  }),
});
```

### Tip 3: Optimize Images Before Upload
```bash
# Use tools like:
- TinyPNG (https://tinypng.com/)
- ImageOptim (Mac)
- Squoosh (https://squoosh.app/)

# Recommended:
- Format: JPG or WebP
- Max width: 1200px
- Quality: 80-85%
- Size: < 500KB
```

---

## 🔄 Migration Guide

### Before (Only JSON):
```javascript
// Only supported image URL
{
  "image": "https://example.com/image.jpg"
}
```

### After (Both JSON and Form-Data):
```javascript
// Option 1: JSON with URL (existing)
{
  "image": "https://example.com/image.jpg"
}

// Option 2: Form-Data with file (new)
FormData:
  image: [FILE]
```

**✅ Backward compatible - existing code still works!**

---

## 📝 Summary

### ✅ What Changed:
- Added `upload.single('image')` middleware to routes
- Controller handles both `req.body.image` (URL) and `req.file` (uploaded file)
- Validation made `image` optional in schema (because file comes via form-data)
- Service validates that image is provided (either way)

### ✅ What Works:
- JSON body with image URL ✅
- Form-data with image file ✅
- Update food with new image ✅
- Cloudinary automatic upload ✅
- 20MB file size limit ✅

### ✅ Endpoints Updated:
- `POST /api/v1/foods` - Create food
- `PATCH /api/v1/foods/:id` - Update food

---

**তৈরি করেছেন:** Kiro AI Assistant 🇧🇩  
**তারিখ:** মার্চ ২, ২০২৬  
**স্ট্যাটাস:** ✅ সম্পূর্ণ এবং কার্যকর
