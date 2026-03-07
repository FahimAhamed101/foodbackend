# Order API - Automatic Price Calculation

## Endpoint
`POST {{baseUrl}}/api/v1/orders`

## Features Implemented

### 1. Platform Fee (Per Item Quantity)
- Platform fee is calculated based on total quantity of all items
- If you order 2 items of quantity 2 each (total 4 items), platform fee applies to all 4 items
- Configurable as either:
  - **Fixed**: Fee per item (e.g., $0.50 per item)
  - **Percentage**: Percentage of subtotal (e.g., 5% of subtotal)

### 2. State Tax (Once Per Order)
- State tax is applied ONCE per order based on customer's state
- Tax rate is retrieved from the customer's profile state
- Applied on the subtotal amount
- Example: If customer is in California with 8% tax, it applies once to the subtotal

### 3. Automatic Backend Calculation
- Backend automatically calculates:
  - **Subtotal**: Sum of (price × quantity) for all items
  - **Platform Fee**: Based on configuration and total quantity
  - **State Tax**: Based on customer's state tax rate
  - **Total Price**: Subtotal + Platform Fee + State Tax

## Request Body

```json
{
  "providerId": "{{targetProviderId}}",
  "items": [
    {
      "foodId": "65c3d4e5f6a7b8c9d0e1f2a3",
      "quantity": 2,
      "price": 1500
    }
  ],
  "paymentMethod": "Cash On Delivery",
  "logisticsType": "Delivery"
}
```

**Note**: `totalPrice` is NO LONGER required in the request body. Backend calculates it automatically.

## Response Example

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orderId": "ORD-1769380113590-4474",
    "providerId": "69714abce548ab10b90c0e50",
    "customerId": "697012afe0d562ec1527056b",
    "items": [
      {
        "foodId": "65c3d4e5f6a7b8c9d0e1f2a3",
        "quantity": 2,
        "price": 1500,
        "_id": "69769911ffae2b15f22bcbe9"
      }
    ],
    "subtotal": 3000,
    "platformFee": 150,
    "stateTax": 240,
    "totalPrice": 3390,
    "state": "CA",
    "status": "pending",
    "paymentMethod": "Cash On Delivery",
    "logisticsType": "Delivery",
    "_id": "69769911ffae2b15f22bcbe8",
    "createdAt": "2026-01-25T22:28:33.591Z",
    "updatedAt": "2026-01-25T22:28:33.591Z",
    "__v": 0
  }
}
```

## Calculation Breakdown

### Example Scenario:
- **Item**: Food item priced at $15.00
- **Quantity**: 2
- **Customer State**: California (8% tax)
- **Platform Fee Config**: 5% of subtotal OR $2.50 per item

### Calculation:
1. **Subtotal** = 15.00 × 2 = $30.00
2. **Platform Fee** (if percentage) = 30.00 × 5% = $1.50
   OR **Platform Fee** (if fixed) = 2.50 × 2 = $5.00
3. **State Tax** = 30.00 × 8% = $2.40 (applied once per order)
4. **Total Price** = 30.00 + 1.50 + 2.40 = **$33.90**

## Multiple Items Example

### Request:
```json
{
  "providerId": "69714abce548ab10b90c0e50",
  "items": [
    {
      "foodId": "65c3d4e5f6a7b8c9d0e1f2a3",
      "quantity": 2,
      "price": 1500
    },
    {
      "foodId": "65c3d4e5f6a7b8c9d0e1f2a4",
      "quantity": 3,
      "price": 2000
    }
  ],
  "paymentMethod": "Credit Card",
  "logisticsType": "Delivery"
}
```

### Calculation:
1. **Subtotal** = (1500 × 2) + (2000 × 3) = 3000 + 6000 = $90.00
2. **Total Quantity** = 2 + 3 = 5 items
3. **Platform Fee** (if fixed $2.50/item) = 2.50 × 5 = $12.50
4. **State Tax** (8%) = 90.00 × 8% = $7.20
5. **Total Price** = 90.00 + 12.50 + 7.20 = **$109.70**

## Admin Configuration

To configure platform fees, use the System Config API:

```bash
# Set fixed fee per item
POST /api/v1/config/platform-fee
{
  "type": "fixed",
  "value": 2.50
}

# Set percentage fee
POST /api/v1/config/platform-fee
{
  "type": "percentage",
  "value": 5
}
```

## Next Steps

After order creation, you can proceed to the payment API with the `orderId` and `totalPrice` from the response.

## Key Changes Summary

✅ **Platform Fee**: Calculated per item quantity (not per order)
✅ **State Tax**: Applied once per order based on customer's state
✅ **Automatic Calculation**: All pricing calculated in backend
✅ **Detailed Response**: Shows subtotal, platformFee, stateTax, and totalPrice separately
✅ **No totalPrice in Request**: Client only sends items, backend calculates everything
