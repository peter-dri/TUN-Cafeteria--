# M-Pesa STK Push - Quick Start Guide

## 5-Minute Setup

### Step 1: Get M-Pesa Credentials
```
1. Go to https://developer.safaricom.co.ke
2. Create an account
3. Create a new app
4. Copy Consumer Key and Secret
5. Get your Business Short Code from M-Pesa account
6. Get Lipa Na M-Pesa Online Passkey
```

### Step 2: Create .env File
```bash
# In project root directory
cat > .env << 'EOF'
MPESA_CONSUMER_KEY=your_key_here
MPESA_CONSUMER_SECRET=your_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
JWT_SECRET=your_secret
NODE_ENV=development
PORT=3000
EOF
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Start Server
```bash
npm start
```

### Step 5: Test Admin Payment
```javascript
// Admin places order with M-Pesa
POST /api/order
{
  "items": [
    {"id": 1, "name": "Chapati", "quantity": 2, "price": 50}
  ],
  "total": 100,
  "paymentMethod": "mpesa",
  "mpesaPhone": "0712345678"
}

// Server automatically initiates STK push
// Customer receives payment prompt on phone
// They enter PIN
// Order updates to PAID automatically
```

## API Quick Reference

### Initiate Payment (Admin)
```bash
curl -X POST http://localhost:3000/api/mpesa/stk-push \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0712345678",
    "amount": 100,
    "orderId": "TUC-1001",
    "description": "Order Payment"
  }'
```

### Check Payment Status (Admin)
```bash
curl -X GET http://localhost:3000/api/mpesa/session/CHECKOUT_REQUEST_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Webhook Test
```bash
# M-Pesa will POST to this endpoint
curl -X POST http://localhost:3000/api/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "CheckoutRequestID": "ws_CO_DMZ_123456789",
        "ResultCode": 0,
        "ResultDesc": "The service request has been processed successfully.",
        "CallbackMetadata": {
          "Item": [
            {"Name": "Amount", "Value": 100},
            {"Name": "MpesaReceiptNumber", "Value": "LHD7891234"},
            {"Name": "PhoneNumber", "Value": "254712345678"}
          ]
        }
      }
    }
  }'
```

## Code Examples

### Admin POS - Place M-Pesa Order
```javascript
// In admin.js - placePOSOrder()
async function placePOSOrder() {
  const method = document.getElementById('posPaymentMethod').value;
  const phone = document.getElementById('posMpesaPhone').value;
  
  // Create order
  const orderRes = await fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: orderItems,
      total: 100,
      paymentMethod: 'mpesa',
      mpesaPhone: phone
    })
  });

  const order = await orderRes.json();

  // Initiate STK push
  const stkRes = await fetch('/api/mpesa/stk-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      phone: phone,
      amount: 100,
      orderId: order.order.orderNumber,
      description: `Order #${order.order.orderNumber}`
    })
  });

  const stk = await stkRes.json();
  alert(`Order placed! Checkout ID: ${stk.checkoutRequestId}`);
}
```

### Customer Payment
```javascript
// In payment.js - processPayment()
async function processPayment(method, cart, total, phone) {
  // Create order
  const orderRes = await fetch('/api/order', {
    method: 'POST',
    body: JSON.stringify({
      items: cart,
      total: total,
      paymentMethod: 'mpesa',
      mpesaPhone: phone
    })
  });

  const order = await orderRes.json();

  if (method === 'mpesa') {
    // Initiate STK push
    const stkRes = await fetch('/api/mpesa/stk-push-public', {
      method: 'POST',
      body: JSON.stringify({
        phone: phone,
        amount: total,
        orderId: order.order.orderNumber,
        description: `Order #${order.order.orderNumber}`
      })
    });

    const stk = await stkRes.json();
    // Customer will see payment prompt on phone
  }
}
```

## Testing with Safaricom Sandbox

### 1. Register Callback URL
```
1. Login to Daraja Portal
2. Go to Apps > Your App
3. Settings > Callback URLs
4. Add your callback URL: https://yourdomain.com/api/mpesa/callback
5. Save
```

### 2. Use Test Phone Numbers
Safaricom provides test numbers in the Daraja portal documentation.

### 3. Simulate Payment
```
1. Go to Daraja Portal > API Simulator
2. Select "Lipa Na M-Pesa Online"
3. Enter:
   - Phone: 254712345678
   - Amount: 100
   - Reference: TUC-1001
   - Callback URL: (your callback URL)
4. Click "Send"
5. Check your server logs
```

### 4. Verify Order Status
```bash
curl http://localhost:3000/api/orders/TUC-1001
# Should show paymentStatus: "Paid"
```

## Debugging Tips

### 1. Check Server Logs
```bash
# Look for M-Pesa related messages
npm start
# Watch for: "✅ M-Pesa payment successful"
# or: "❌ M-Pesa payment failed"
```

### 2. Monitor data.json
```bash
# Check if mpesaSessions being created
grep -A 10 "mpesaSessions" data.json
```

### 3. Enable Debug Mode
```javascript
// In modules/mpesa.js
console.log('M-Pesa Request:', payload);
console.log('M-Pesa Response:', result);
```

### 4. Test Network Access
```bash
# Test if you can reach M-Pesa API
curl https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials \
  -u "consumer_key:consumer_secret"
```

## Common Issues & Solutions

### Issue: "Invalid credentials"
**Solution:** 
- Double-check Consumer Key and Secret in .env
- Make sure they match exactly (copy-paste from Daraja)
- Restart Node.js after updating .env

### Issue: "Phone number not found"
**Solution:**
- Use test phone numbers from Daraja
- Ensure phone format is correct (254712345678 or 0712345678)
- Check if number is in Kenya

### Issue: "Callback not received"
**Solution:**
- Verify callback URL is accessible from internet
- Check HTTPS is working
- Register callback URL in Daraja settings
- Check firewall/security groups allow incoming requests

### Issue: "Access Token Failed"
**Solution:**
- Verify internet connection
- Check Consumer Key/Secret are correct
- Ensure app is active in Daraja portal
- Check API rate limits

## Further Reading

- [Complete Setup Guide](./MPESA_STK_PUSH_SETUP.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Safaricom Daraja Docs](https://developer.safaricom.co.ke/docs)

## Support

For questions:
1. Check server logs with `npm start`
2. Review [MPESA_STK_PUSH_SETUP.md](./MPESA_STK_PUSH_SETUP.md) troubleshooting section
3. Check [Safaricom API Status](https://developer.safaricom.co.ke/api-status)
4. Contact Safaricom for business account issues

---

**Ready to go!** 🚀 Your system now has modern STK Push payments.
