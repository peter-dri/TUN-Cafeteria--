# M-Pesa STK Push Integration Guide

## Overview
This guide explains how to set up M-Pesa STK Push payments for the Tharaka Cafeteria system. STK Push is the modern way to handle M-Pesa payments - the payment prompt is automatically sent to the customer's phone without them having to manually enter details.

## Features
- ✅ Automatic payment prompt sent to customer's phone
- ✅ Admin can initiate payments from POS system
- ✅ Customers can also pay through the web interface
- ✅ Automatic order status update when payment is confirmed
- ✅ Webhook callbacks for real-time payment confirmation

## Setup Instructions

### 1. Get M-Pesa Credentials

You need to register with Safaricom's Daraja API to get:
- **Consumer Key**
- **Consumer Secret**
- **Business Short Code** (your M-Pesa Business Account Short Code)
- **Passkey** (Lipa Na M-Pesa Online Passkey)

Steps:
1. Visit [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke)
2. Register/Login to your account
3. Create an app to get Consumer Key and Secret
4. Get your Business Short Code from your M-Pesa Business Account
5. Get your Lipa Na M-Pesa Online Passkey

### 2. Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_lipa_na_mpesa_online_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback

# Other configuration
JWT_SECRET=your_jwt_secret
NODE_ENV=production
PORT=3000
```

### 3. Update M-Pesa Module

The M-Pesa module is located at `modules/mpesa.js`. You can test with Safaricom's sandbox environment:

```javascript
// Testing with Sandbox (default)
AUTH_URL: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
STK_PUSH_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

// Production
// AUTH_URL: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
// STK_PUSH_URL: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
```

### 4. Configure Webhook Callback

M-Pesa will send payment confirmation to: `https://yourdomain.com/api/mpesa/callback`

Make sure this URL is:
- ✅ Public and accessible from the internet
- ✅ Using HTTPS (required by Safaricom)
- ✅ Configured in your Safaricom Daraja account settings

## How It Works

### Admin Flow (POS System)

```
1. Admin enters customer phone number in POS
2. Admin clicks "Place Order"
3. Order is created in system
4. STK Push is initiated - customer receives prompt on their phone
5. Customer enters PIN
6. Payment confirmed → Order automatically marked as PAID
7. Admin can prepare order
```

### Customer Flow (Web Interface)

```
1. Customer selects items and proceeds to checkout
2. Customer enters phone number and selects M-Pesa
3. Customer clicks "Confirm Order"
4. Order is created
5. STK Push is initiated - payment prompt appears on phone
6. Customer enters PIN
7. Payment confirmed → Order status updated
8. Customer sees confirmation
```

## API Endpoints

### 1. Initiate STK Push (Admin - Requires Auth)
```
POST /api/mpesa/stk-push
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "phone": "0712345678",  // or 254712345678
  "amount": 500,
  "orderId": "TUC-1001",
  "description": "Order #TUC-1001 - KSh 500"
}

Response:
{
  "success": true,
  "checkoutRequestId": "...",
  "responseCode": "0",
  "responseDescription": "Success..."
}
```

### 2. Initiate STK Push (Public - No Auth Required)
```
POST /api/mpesa/stk-push-public
Headers:
  Content-Type: application/json

Body: (same as above)
```

### 3. M-Pesa Callback (Webhook)
```
POST /api/mpesa/callback
(Automatically called by M-Pesa when user completes payment)

Payload: (from M-Pesa)
{
  "Body": {
    "stkCallback": {
      "CheckoutRequestID": "...",
      "ResultCode": 0,  // 0 = success, 1032 = user cancelled
      "ResultDesc": "The service request has been processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 500},
          {"Name": "MpesaReceiptNumber", "Value": "..."},
          {"Name": "PhoneNumber", "Value": "254712345678"}
        ]
      }
    }
  }
}
```

### 4. Query Session Status (Admin)
```
GET /api/mpesa/session/{checkoutRequestId}
Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "session": {
    "orderId": "TUC-1001",
    "phone": "254712345678",
    "amount": 500,
    "status": "completed",  // pending, completed, failed, cancelled
    "mpesaRef": "...",
    "completedAt": "2026-02-10T..."
  }
}
```

## Testing

### Sandbox Testing

1. **Get Test Credentials** from Daraja Portal
2. **Disable Callback Verification** in Daraja (for sandbox testing)
3. **Test Phone Numbers** (provided by Safaricom)
4. **Use Sandbox M-Pesa Simulator** at Daraja Portal to verify payment flow

### Test Steps

1. Place an order in admin POS with M-Pesa
2. Check server logs for STK push initiation
3. Simulate payment confirmation in Daraja Portal
4. Verify order status updates to "Paid"
5. Check data.json for session records

## Troubleshooting

### Issue: "Failed to get access token"
- ✅ Check Consumer Key and Secret
- ✅ Verify credentials are correctly set in environment variables
- ✅ Check internet connection

### Issue: "STK Push failed"
- ✅ Verify phone number format (starts with 254 or 0)
- ✅ Check amount is valid (> 1 KSh)
- ✅ Verify Business Short Code is correct
- ✅ Check if phone number is in Kenya (STK Push may fail for some countries)

### Issue: "Callback not received"
- ✅ Verify webhook URL is publicly accessible
- ✅ Check HTTPS is configured
- ✅ Verify callback URL registered in Daraja settings
- ✅ Check server logs for incoming requests

### Issue: "Order not updating to Paid"
- ✅ Check order number format in callback matches created order
- ✅ Verify data.json is writable
- ✅ Check server console for any errors

## Security Considerations

⚠️ **Important:**
- Never commit `.env` file to git - add to `.gitignore`
- Rotate credentials regularly
- Use HTTPS in production
- Validate all webhook payloads
- Keep Passkey secret - never share publicly
- Use rate limiting on payment endpoints
- Log all payment transactions for audit purposes

## File Structure

```
├── modules/
│   ├── mpesa.js              ← M-Pesa STK Push module
│   ├── admin.js              ← Updated with STK Push
│   └── payment.js            ← Updated with STK Push
├── server.js                 ← Updated with STK Push endpoints
└── data.json                 ← Stores mpesaSessions
```

## Next Steps

1. ✅ Get M-Pesa credentials from Daraja
2. ✅ Set environment variables
3. ✅ Test with sandbox environment
4. ✅ Configure webhook callback URL
5. ✅ Test STK Push flow end-to-end
6. ✅ Deploy with HTTPS
7. ✅ Switch to production credentials

## Support

For M-Pesa API issues:
- Check [Safaricom Daraja Documentation](https://developer.safaricom.co.ke)
- Review [M-Pesa API Status](https://developer.safaricom.co.ke/api-status)
- Contact Safaricom support for business account issues

## References

- [M-Pesa STK Push API Documentation](https://developer.safaricom.co.ke/apis?shell#lipa-na-m-pesa-online)
- [Safaricom Daraja Portal](https://developer.safaricom.co.ke)
- [M-Pesa Online Integration Guide](https://developer.safaricom.co.ke/docs)

---

**Last Updated:** February 10, 2026
**Version:** 1.0
**Status:** Ready for Production Setup
