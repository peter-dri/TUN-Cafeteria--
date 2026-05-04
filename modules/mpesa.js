/**
 * M-Pesa STK Push Module
 * Handles M-Pesa STK push payment initiations and webhook callbacks
 */

const https = require('https');

// M-Pesa Configuration
const MPESA_CONFIG = {
    // Sandbox credentials (Replace with your actual credentials from developer.safaricom.co.ke)
    CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || 'your_consumer_key',
    CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || 'your_consumer_secret',
    PASSKEY: process.env.MPESA_PASSKEY || 'your_passkey',
    BUSINESS_SHORT_CODE: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
    CALLBACK_URL: process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback',
    
    // API Endpoints
    AUTH_URL: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    STK_PUSH_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    QUERY_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
};

// Store access tokens with expiration
let accessTokenCache = {
    token: null,
    expiresAt: 0
};

/**
 * Get M-Pesa access token
 */
async function getAccessToken() {
    // Return cached token if still valid
    if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
        return accessTokenCache.token;
    }

    return new Promise((resolve, reject) => {
        const auth = Buffer.from(
            `${MPESA_CONFIG.CONSUMER_KEY}:${MPESA_CONFIG.CONSUMER_SECRET}`
        ).toString('base64');

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        };

        https.get(MPESA_CONFIG.AUTH_URL, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.access_token) {
                        // Cache token for 55 minutes (expires in 3600 seconds)
                        accessTokenCache.token = result.access_token;
                        accessTokenCache.expiresAt = Date.now() + (55 * 60 * 1000);
                        resolve(result.access_token);
                    } else {
                        reject(new Error('Failed to get access token: ' + data));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse access token response: ' + error.message));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Generate MD5 password for STK push
 */
function generatePassword(businessShortCode, passkey, timestamp) {
    const crypto = require('crypto');
    const data = businessShortCode + passkey + timestamp;
    return crypto.createHash('md5').update(data).digest('base64');
}

/**
 * Initiate STK push payment
 * @param {string} phoneNumber - Customer phone number (254712345678 format)
 * @param {number} amount - Amount to charge
 * @param {string} orderId - Order ID for reference
 * @param {string} description - Payment description
 */
async function initiateStkPush(phoneNumber, amount, orderId, description = 'Order Payment') {
    try {
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = generatePassword(
            MPESA_CONFIG.BUSINESS_SHORT_CODE,
            MPESA_CONFIG.PASSKEY,
            timestamp
        );

        const payload = {
            BusinessShortCode: MPESA_CONFIG.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: phoneNumber,
            PartyB: MPESA_CONFIG.BUSINESS_SHORT_CODE,
            PhoneNumber: phoneNumber,
            CallBackURL: MPESA_CONFIG.CALLBACK_URL,
            AccountReference: orderId,
            TransactionDesc: description
        };

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${token}`
                }
            };

            const req = https.request(MPESA_CONFIG.STK_PUSH_URL, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Failed to parse STK push response: ' + error.message));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    } catch (error) {
        throw new Error('STK push failed: ' + error.message);
    }
}

/**
 * Query STK push transaction status
 * @param {string} checkoutRequestId - Checkout request ID from initial STK push
 */
async function queryTransaction(checkoutRequestId) {
    try {
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = generatePassword(
            MPESA_CONFIG.BUSINESS_SHORT_CODE,
            MPESA_CONFIG.PASSKEY,
            timestamp
        );

        const payload = {
            BusinessShortCode: MPESA_CONFIG.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${token}`
                }
            };

            const req = https.request(MPESA_CONFIG.QUERY_URL, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Failed to parse query response: ' + error.message));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    } catch (error) {
        throw new Error('Query transaction failed: ' + error.message);
    }
}

module.exports = {
    initiateStkPush,
    queryTransaction,
    getAccessToken,
    MPESA_CONFIG
};
