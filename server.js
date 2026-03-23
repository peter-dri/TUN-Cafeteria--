const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mpesaModule = require('./modules/mpesa');

<<<<<<< HEAD
// Import new modules
const InventoryManager = require('./modules/inventory');
const AnalyticsManager = require('./modules/analytics');
const LoyaltyManager = require('./modules/loyalty');
const RoleManager = require('./modules/roles');
=======
require('dotenv').config();

// Import SQLite database connection and models
const dbConnection = require('./database/sqlite-connection');
const Admin = require('./database/models/sqlite/Admin');
const FoodItem = require('./database/models/sqlite/FoodItem');
const Order = require('./database/models/sqlite/Order');

// Import existing modules
const menuModule = require('./modules/menu');
const cartModule = require('./modules/cart');
const authModule = require('./modules/auth');
const adminModule = require('./modules/admin');
const paymentModule = require('./modules/payment');
const reviewsModule = require('./modules/reviews');
const recommendationsModule = require('./modules/recommendations');
const userProfileModule = require('./modules/userProfile');
const recommendationUIModule = require('./modules/recommendationUI');
const recommendationAnalyticsModule = require('./modules/recommendationAnalytics');
>>>>>>> f8f8213b5ba510b7bb4bb8290c3d8637abeb125e

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATA_FILE = path.join(__dirname, 'data.json');

// ============= SECURITY MIDDLEWARE =============

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'your-domain.com' : '*',
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('.'))

// ============= AUTHENTICATION MIDDLEWARE =============

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ============= DATA MANAGEMENT UTILITIES =============

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
    return getDefaultData();
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

function getDefaultData() {
    return {
        foodData: { breakfast: [], lunch: [], snacks: [] },
        orderHistory: [],
        orderCounter: 1000,
        userPreferences: {},
        reviews: {},
        adminAccounts: []
    };
}

// ============= VALIDATION UTILITIES =============

function validateOrderData(items, total, paymentMethod, mpesaPhone) {
    const errors = [];

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push('Order must contain at least one item');
    }

    // Validate each item
    items?.forEach((item, index) => {
        if (!item.id || !item.name || !item.price || !item.quantity) {
            errors.push(`Item ${index + 1} is missing required fields`);
        }
        if (item.quantity < 1) {
            errors.push(`Item ${index + 1} quantity must be at least 1`);
        }
        if (item.price < 0) {
            errors.push(`Item ${index + 1} price cannot be negative`);
        }
    });

    // Validate total
    if (total === undefined || total === null) {
        errors.push('Order total is required');
    }
    if (typeof total !== 'number' || total < 0) {
        errors.push('Order total must be a non-negative number');
    }

    // Validate totals match
    if (items && items.length > 0) {
        const calculatedTotal = items.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0
        );
        // Allow small rounding differences (e.g., 0.99)
        if (Math.abs(calculatedTotal - total) > 0.99) {
            errors.push(`Total mismatch: calculated ${calculatedTotal}, submitted ${total}`);
        }
    }

    // Validate payment method
    if (!paymentMethod || !['cash', 'mpesa'].includes(paymentMethod)) {
        errors.push('Invalid payment method. Must be "cash" or "mpesa"');
    }

    // Validate M-Pesa phone if needed
    if (paymentMethod === 'mpesa') {
        if (!mpesaPhone || !mpesaPhone.match(/^[0-9]{10}$/)) {
            errors.push('Invalid M-Pesa phone number. Must be 10 digits');
        }
    }

    return errors;
}

// ============= ADMIN AUTHENTICATION =============

/**
 * POST /api/admin/login
 * Authenticate admin user and return JWT token
 */
app.post('/api/admin/login', (req, res) => {
    try {
        console.log('DEBUG: admin login body =>', req.body);
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }

        // Hardcoded credentials (production should use database)
        const defaultAdmins = {
            'admin': 'admin123'
        };

        if (!defaultAdmins[username] || defaultAdmins[username] !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                username,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= DATA ENDPOINTS (CORE) =============

/**
 * GET /api/data
 * Get all cafeteria data (menu, orders, preferences, etc.)
 */
app.get('/api/data', (req, res) => {
    try {
        const data = loadData();
        
        // Return essential data
        res.json({
            foodData: data.foodData,
            orderCounter: data.orderCounter,
            orderHistory: data.orderHistory,
            userPreferences: data.userPreferences || {}
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

/**
 * POST /api/data
 * Save entire data file (ADMIN ONLY)
 */
app.post('/api/data', authenticateToken, (req, res) => {
    try {
        const data = req.body;

        // Validate data structure
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        // Ensure required fields exist
        if (!data.foodData) data.foodData = {};
        if (!Array.isArray(data.orderHistory)) data.orderHistory = [];
        if (!data.orderCounter) data.orderCounter = 1000;

        // Save to file
        if (saveData(data)) {
            res.json({ 
                success: true, 
                message: 'Data saved successfully' 
            });
        } else {
            res.status(500).json({ error: 'Failed to save data' });
        }
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data', details: error.message });
    }
});

/**
 * GET /api/admin/data
 * Get complete data including sensitive information (ADMIN ONLY)
 */
app.get('/api/admin/data', authenticateToken, (req, res) => {
    try {
        const data = loadData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching admin data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// ============= ORDER MANAGEMENT ENDPOINTS =============

/**
 * POST /api/orders
 * Place a new order with full validation
 */
app.post('/api/orders', (req, res) => {
    try {
        const { items, total, paymentMethod, mpesaPhone } = req.body;

        // Validate order data
        const validationErrors = validateOrderData(items, total, paymentMethod, mpesaPhone);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Load current data
        const data = loadData();

        // Check inventory
        const inventoryErrors = [];
        for (const reqItem of items) {
            let found = false;
            for (const category in data.foodData) {
                const foodItem = data.foodData[category].find(item => item.id === reqItem.id);
                if (foodItem) {
                    if (foodItem.available < reqItem.quantity) {
                        inventoryErrors.push({
                            itemName: foodItem.name,
                            requested: reqItem.quantity,
                            available: foodItem.available
                        });
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                return res.status(404).json({
                    success: false,
                    error: 'Item not found',
                    itemId: reqItem.id
                });
            }
        }

        if (inventoryErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient inventory',
                inventoryErrors
            });
        }

        // Deduct from inventory
        for (const reqItem of items) {
            for (const category in data.foodData) {
                const foodItem = data.foodData[category].find(item => item.id === reqItem.id);
                if (foodItem) {
                    foodItem.available -= reqItem.quantity;
                    break;
                }
            }
        }

        // Create order
        const orderId = Date.now();
        const orderNumber = `TUC-${++data.orderCounter}`;
        const timestamp = new Date().toLocaleString();

        const newOrder = {
            id: orderId,
            orderNumber,
            timestamp,
            items,
            total,
            paymentMethod,
            mpesaPhone: paymentMethod === 'mpesa' ? mpesaPhone : undefined,
                paymentStatus: paymentMethod === 'mpesa' ? 'Pending Verification' : 'Pending Confirmation',
            orderStatus: 'Received',
            lastStatusUpdate: timestamp,
            notes: []
        };

        // Add order to history
        data.orderHistory.unshift(newOrder);

        // Award loyalty points if phone number and payment confirmed
        if (mpesaPhone && newOrder.paymentStatus === 'Paid') {
            const loyaltyResult = LoyaltyManager.awardPoints(data, mpesaPhone, total, orderNumber);
            newOrder.loyaltyPoints = loyaltyResult.pointsAwarded;
            console.log(`💎 ${loyaltyResult.message}`);
        }

        // Save data
        if (saveData(data)) {
            console.log(`✅ Order ${orderNumber} created successfully`);
            res.status(201).json({
                success: true,
                order: newOrder,
                message: 'Order placed successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save order'
            });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            details: error.message
        });
    }
});

/**
 * Backward compatibility: POST /api/order
 * Alias for POST /api/orders
 */
app.post('/api/order', (req, res) => {
    try {
        const { items, total, paymentMethod, mpesaPhone } = req.body;

        // Validate order data
        const validationErrors = validateOrderData(items, total, paymentMethod, mpesaPhone);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Load current data
        const data = loadData();

        // Check inventory
        const inventoryErrors = [];
        for (const reqItem of items) {
            let found = false;
            for (const category in data.foodData) {
                const foodItem = data.foodData[category].find(item => item.id === reqItem.id);
                if (foodItem) {
                    if (foodItem.available < reqItem.quantity) {
                        inventoryErrors.push({
                            itemName: foodItem.name,
                            requested: reqItem.quantity,
                            available: foodItem.available
                        });
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                return res.status(404).json({
                    success: false,
                    error: 'Item not found',
                    itemId: reqItem.id
                });
            }
        }

        if (inventoryErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient inventory',
                inventoryErrors
            });
        }

        // Deduct from inventory
        for (const reqItem of items) {
            for (const category in data.foodData) {
                const foodItem = data.foodData[category].find(item => item.id === reqItem.id);
                if (foodItem) {
                    foodItem.available -= reqItem.quantity;
                    break;
                }
            }
        }

        // Create order
        const orderId = Date.now();
        const orderNumber = `TUC-${++data.orderCounter}`;
        const timestamp = new Date().toLocaleString();

        const newOrder = {
            id: orderId,
            orderNumber,
            timestamp,
            items,
            total,
            paymentMethod,
            mpesaPhone: paymentMethod === 'mpesa' ? mpesaPhone : undefined,
            paymentStatus: paymentMethod === 'mpesa' ? 'Pending Verification' : 'Pending Confirmation',
            orderStatus: 'Received',
            lastStatusUpdate: timestamp,
            notes: []
        };

        // Add order to history
        data.orderHistory.unshift(newOrder);

        // Award loyalty points if phone number and payment confirmed
        if (mpesaPhone && newOrder.paymentStatus === 'Paid') {
            const loyaltyResult = LoyaltyManager.awardPoints(data, mpesaPhone, total, orderNumber);
            newOrder.loyaltyPoints = loyaltyResult.pointsAwarded;
            console.log(`💎 ${loyaltyResult.message}`);
        }

        // Save data
        if (saveData(data)) {
            console.log(`✅ Order ${orderNumber} created successfully`);
            res.status(201).json({
                success: true,
                order: newOrder,
                message: 'Order placed successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save order'
            });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            details: error.message
        });
    }
});

/**
 * GET /api/orders/:orderNumber
 * Get order details by order number
 */
app.get('/api/orders/:orderNumber', (req, res) => {
    try {
        const { orderNumber } = req.params;
        const data = loadData();

        const order = data.orderHistory.find(o => o.orderNumber === orderNumber);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

/**
 * PUT /api/orders/:orderNumber/status
 * Update order status (ADMIN ONLY)
 */
app.put('/api/orders/:orderNumber/status', authenticateToken, (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const data = loadData();
        const order = data.orderHistory.find(o => o.orderNumber === orderNumber);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update order
        order.orderStatus = status;
        order.lastStatusUpdate = new Date().toLocaleString();
        if (notes) {
            order.notes.push({
                timestamp: new Date().toLocaleString(),
                text: notes
            });
        }

        // Save
        if (saveData(data)) {
            res.json({
                success: true,
                message: `Order status updated to ${status}`,
                order
            });
        } else {
            res.status(500).json({ error: 'Failed to update order' });
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

/**
 * PUT /api/orders/:orderNumber/payment
 * Update payment status (ADMIN ONLY)
 */
app.put('/api/orders/:orderNumber/payment', authenticateToken, (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { paymentStatus, mpesaRef } = req.body;

        const validPaymentStatuses = ['Pending Verification', 'Pending Confirmation', 'Confirmed', 'Paid', 'Failed', 'Refunded'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validPaymentStatuses.join(', ')}`
            });
        }

        const data = loadData();
        const order = data.orderHistory.find(o => o.orderNumber === orderNumber);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.paymentStatus = paymentStatus;
        if (mpesaRef) order.mpesaRef = mpesaRef;

        if (saveData(data)) {
            res.json({
                success: true,
                message: `Payment status updated to ${paymentStatus}`,
                order
            });
        } else {
            res.status(500).json({ error: 'Failed to update payment' });
        }
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// ============= M-PESA STK PUSH ENDPOINTS =============

/**
 * POST /api/mpesa/stk-push
 * Initiate M-Pesa STK Push payment (ADMIN ONLY)
 * Body: { phone, amount, orderId, description }
 */
app.post('/api/mpesa/stk-push', authenticateToken, async (req, res) => {
    try {
        const { phone, amount, orderId, description } = req.body;

        // Validate inputs
        if (!phone || !amount || !orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: phone, amount, orderId'
            });
        }

        // Validate phone number format
        let formattedPhone = phone;
        if (phone.startsWith('0')) {
            formattedPhone = '254' + phone.substring(1);
        } else if (!phone.startsWith('254')) {
            formattedPhone = '254' + phone;
        }

        // Validate amount
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a valid number greater than 0'
            });
        }

        try {
            // Initiate STK push
            const result = await mpesaModule.initiateStkPush(
                formattedPhone,
                numAmount,
                orderId,
                description || 'Order Payment'
            );

            // Check if STK push was successful
            if (result.ResponseCode === '0') {
                // Store STK push session info
                const data = loadData();
                if (!data.mpesaSessions) data.mpesaSessions = {};
                
                data.mpesaSessions[result.CheckoutRequestID] = {
                    orderId,
                    phone: formattedPhone,
                    amount: numAmount,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                };
                
                saveData(data);

                res.json({
                    success: true,
                    message: 'STK Push initiated successfully',
                    checkoutRequestId: result.CheckoutRequestID,
                    responseCode: result.ResponseCode,
                    responseDescription: result.ResponseDescription
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.errorMessage || 'Failed to initiate STK Push',
                    responseCode: result.ResponseCode
                });
            }
        } catch (error) {
            console.error('M-Pesa STK Push error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initiate M-Pesa payment: ' + error.message
            });
        }
    } catch (error) {
        console.error('Error in STK Push endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

/**
 * POST /api/mpesa/stk-push-public
 * Initiate M-Pesa STK Push payment (PUBLIC - for customer and admin use)
 * Body: { phone, amount, orderId, description }
 */
app.post('/api/mpesa/stk-push-public', async (req, res) => {
    try {
        const { phone, amount, orderId, description } = req.body;

        // Validate inputs
        if (!phone || !amount || !orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: phone, amount, orderId'
            });
        }

        // Validate phone number format
        let formattedPhone = phone;
        if (phone.startsWith('0')) {
            formattedPhone = '254' + phone.substring(1);
        } else if (!phone.startsWith('254')) {
            formattedPhone = '254' + phone;
        }

        // Validate amount
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a valid number greater than 0'
            });
        }

        try {
            // Initiate STK push
            const result = await mpesaModule.initiateStkPush(
                formattedPhone,
                numAmount,
                orderId,
                description || 'Order Payment'
            );

            // Check if STK push was successful
            if (result.ResponseCode === '0') {
                // Store STK push session info
                const data = loadData();
                if (!data.mpesaSessions) data.mpesaSessions = {};
                
                data.mpesaSessions[result.CheckoutRequestID] = {
                    orderId,
                    phone: formattedPhone,
                    amount: numAmount,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                };
                
                saveData(data);

                res.json({
                    success: true,
                    message: 'STK Push initiated successfully',
                    checkoutRequestId: result.CheckoutRequestID,
                    responseCode: result.ResponseCode,
                    responseDescription: result.ResponseDescription
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.errorMessage || 'Failed to initiate STK Push',
                    responseCode: result.ResponseCode
                });
            }
        } catch (error) {
            console.error('M-Pesa STK Push error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initiate M-Pesa payment: ' + error.message
            });
        }
    } catch (error) {
        console.error('Error in STK Push endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

/**
 * POST /api/mpesa/callback
 * M-Pesa webhook callback for payment notifications
 * This receives payment confirmation from M-Pesa
 */
app.post('/api/mpesa/callback', (req, res) => {
    try {
        // Immediately acknowledge receipt to M-Pesa
        res.json({ success: true });

        const body = req.body;
        console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

        // Handle stk push callback
        if (body.Body && body.Body.stkCallback) {
            const callback = body.Body.stkCallback;
            const checkoutRequestId = callback.CheckoutRequestID;
            const resultCode = callback.ResultCode;
            const resultDesc = callback.ResultDesc;

            const data = loadData();
            
            if (!data.mpesaSessions) data.mpesaSessions = {};
            const session = data.mpesaSessions[checkoutRequestId];

            if (session) {
                if (resultCode === 0) {
                    // Success - Extract transaction details
                    const callbackMetadata = callback.CallbackMetadata;
                    const amount = callbackMetadata.Item.find(item => item.Name === 'Amount')?.Value;
                    const mpesaRef = callbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
                    const phoneNumber = callbackMetadata.Item.find(item => item.Name === 'PhoneNumber')?.Value;

                    // Update session
                    session.status = 'completed';
                    session.mpesaRef = mpesaRef;
                    session.amount = amount;
                    session.phoneNumber = phoneNumber;
                    session.completedAt = new Date().toISOString();

                    // Update order payment status
                    const order = data.orderHistory.find(o => o.orderNumber === session.orderId || o.id.toString() === session.orderId);
                    if (order) {
                        order.paymentStatus = 'Paid';
                        order.mpesaRef = mpesaRef;
                        console.log(`✅ Order ${order.orderNumber} marked as paid`);
                    }

                    saveData(data);
                    console.log(`✅ M-Pesa payment successful for session ${checkoutRequestId}`);
                } else if (resultCode === 1032) {
                    // Cancelled
                    session.status = 'cancelled';
                    session.cancelledAt = new Date().toISOString();
                    console.log(`⚠️ M-Pesa payment cancelled for session ${checkoutRequestId}`);
                    saveData(data);
                } else {
                    // Failed
                    session.status = 'failed';
                    session.resultCode = resultCode;
                    session.resultDesc = resultDesc;
                    session.failedAt = new Date().toISOString();
                    console.log(`❌ M-Pesa payment failed for session ${checkoutRequestId}: ${resultDesc}`);
                    saveData(data);
                }
            }
        }
    } catch (error) {
        console.error('Error processing M-Pesa callback:', error);
    }
});

/**
 * GET /api/mpesa/session/:checkoutRequestId
 * Query STK push session status
 */
app.get('/api/mpesa/session/:checkoutRequestId', authenticateToken, (req, res) => {
    try {
        const { checkoutRequestId } = req.params;
        const data = loadData();

        if (!data.mpesaSessions) data.mpesaSessions = {};
        const session = data.mpesaSessions[checkoutRequestId];

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session'
        });
    }
});

/**
 * GET /api/orders
 * Search and list orders (ADMIN ONLY)
 */
app.get('/api/orders', authenticateToken, (req, res) => {
    try {
        const { search, status, paymentMethod, limit } = req.query;
        const data = loadData();
        let orders = [...data.orderHistory];

        // Filter by search term
        if (search) {
            orders = orders.filter(o => 
                o.orderNumber.includes(search) || 
                o.id.toString().includes(search)
            );
        }

        // Filter by status
        if (status) {
            orders = orders.filter(o => o.orderStatus === status);
        }

        // Filter by payment method
        if (paymentMethod) {
            orders = orders.filter(o => o.paymentMethod === paymentMethod);
        }

        // Apply limit
        const maxLimit = Math.min(parseInt(limit) || 50, 200);
        orders = orders.slice(0, maxLimit);

        res.json({
            total: data.orderHistory.length,
            returned: orders.length,
            orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// ============= ADMIN ANALYTICS =============

/**
 * GET /api/admin/statistics
 * Get cafeteria statistics (ADMIN ONLY)
 */
app.get('/api/admin/statistics', authenticateToken, (req, res) => {
    try {
        const data = loadData();

        // Calculate stats
        const totalOrders = data.orderHistory.length;
        const totalRevenue = data.orderHistory.reduce((sum, order) => 
            sum + (order.paymentStatus !== 'Failed' ? order.total : 0), 0
        );
        const pendingOrders = data.orderHistory.filter(o => 
            o.orderStatus !== 'Completed' && o.orderStatus !== 'Cancelled'
        ).length;

        const paymentBreakdown = {
            cash: data.orderHistory.filter(o => o.paymentMethod === 'cash').length,
            mpesa: data.orderHistory.filter(o => o.paymentMethod === 'mpesa').length
        };

        const statusBreakdown = {};
        data.orderHistory.forEach(order => {
            statusBreakdown[order.orderStatus] = (statusBreakdown[order.orderStatus] || 0) + 1;
        });

        // Count inventory
        let totalItems = 0, outOfStock = 0;
        for (const category in data.foodData) {
            data.foodData[category].forEach(item => {
                totalItems++;
                if (item.available <= 0) outOfStock++;
            });
        }

        res.json({
            orders: {
                total: totalOrders,
                pending: pendingOrders,
                revenue: totalRevenue,
                paymentMethods: paymentBreakdown,
                statusBreakdown
            },
            inventory: {
                total: totalItems,
                outOfStock,
                inStock: totalItems - outOfStock
            },
            timestamp: new Date().toLocaleString()
        });
    } catch (error) {
        console.error('Error calculating statistics:', error);
        res.status(500).json({ error: 'Failed to calculate statistics' });
    }
});

// ============= MENU MANAGEMENT ENDPOINTS =============

/**
 * GET /api/menu
 * Get all food items or filtered by category/search
 */
app.get('/api/menu', (req, res) => {
    try {
        const { category, search } = req.query;
        const data = loadData();
        let items = [];

        // Flatten all food items
        for (const cat in data.foodData) {
            items = items.concat(data.foodData[cat]);
        }

        // Filter by category
        if (category) {
            items = items.filter(item => item.category === category);
        }

        // Filter by search term
        if (search) {
            const searchLower = search.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        res.json(items);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

/**
 * GET /api/menu/categories
 * Get all food categories
 */
app.get('/api/menu/categories', (req, res) => {
    try {
        const data = loadData();
        const categories = Object.keys(data.foodData || {});
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * PUT /api/menu/:itemId
 * Update item details (ADMIN ONLY)
 */
app.put('/api/menu/:itemId', authenticateToken, (req, res) => {
    try {
        const { itemId } = req.params;
        const updates = req.body;

        const data = loadData();
        let found = false;

        for (const category in data.foodData) {
            const item = data.foodData[category].find(i => i.id === itemId);
            if (item) {
                // Update allowed fields
                const allowedFields = ['name', 'price', 'available', 'unit', 'tags', 'description'];
                allowedFields.forEach(field => {
                    if (field in updates) {
                        item[field] = updates[field];
                    }
                });
                found = true;
                break;
            }
        }

        if (!found) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (saveData(data)) {
            res.json({
                success: true,
                message: 'Item updated successfully'
            });
        } else {
            res.status(500).json({ error: 'Failed to update item' });
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// ============= REVIEWS ENDPOINTS =============

/**
 * GET /api/reviews/:itemId
 * Get reviews for a specific food item
 */
app.get('/api/reviews/:itemId', (req, res) => {
    try {
        const { itemId } = req.params;
        const data = loadData();

        const itemReviews = data.reviews?.[itemId] || [];
        const avgRating = itemReviews.length > 0 
            ? itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length 
            : 0;

        res.json({
            itemId,
            reviews: itemReviews,
            averageRating: avgRating.toFixed(1),
            totalReviews: itemReviews.length
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * POST /api/reviews/:itemId
 * Add a new review for a food item
 */
app.post('/api/reviews/:itemId', (req, res) => {
    try {
        const { itemId } = req.params;
        const { rating, comment, userName } = req.body;

        // Validate review data
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        if (!userName || userName.trim().length === 0) {
            return res.status(400).json({ error: 'User name is required' });
        }

        const data = loadData();
        if (!data.reviews) data.reviews = {};
        if (!data.reviews[itemId]) data.reviews[itemId] = [];

        const newReview = {
            id: Date.now(),
            rating: parseInt(rating),
            comment: comment.trim(),
            userName: userName.trim(),
            timestamp: new Date().toLocaleString()
        };

        data.reviews[itemId].push(newReview);

        if (saveData(data)) {
            res.status(201).json({
                success: true,
                message: 'Review added successfully',
                review: newReview
            });
        } else {
            res.status(500).json({ error: 'Failed to save review' });
        }
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Failed to add review' });
    }
});

// ============= USER PREFERENCES & PROFILE ENDPOINTS =============

/**
 * GET /api/user/preferences/:userId
 * Get user preferences
 */
app.get('/api/user/preferences/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const data = loadData();

        const preferences = data.userPreferences?.[userId] || {
            dietaryRestrictions: [],
            favoriteItems: [],
            dislikedItems: [],
            spicyPreference: 'medium'
        };

        res.json(preferences);
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

/**
 * PUT /api/user/preferences/:userId
 * Update user preferences
 */
app.put('/api/user/preferences/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const data = loadData();
        if (!data.userPreferences) data.userPreferences = {};

        // Merge preferences
        data.userPreferences[userId] = {
            ...data.userPreferences[userId],
            ...updates
        };

        if (saveData(data)) {
            res.json({
                success: true,
                message: 'Preferences updated',
                preferences: data.userPreferences[userId]
            });
        } else {
            res.status(500).json({ error: 'Failed to update preferences' });
        }
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// ============= RECOMMENDATIONS ENDPOINTS =============

/**
 * GET /api/recommendations/:userId
 * Get personalized recommendations for a user
 */
app.get('/api/recommendations/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { limit } = req.query;
        const maxLimit = Math.min(parseInt(limit) || 5, 20);

        const data = loadData();
        const allItems = [];

        // Flatten all food items
        for (const category in data.foodData) {
            allItems.push(...data.foodData[category]);
        }

        // Get user preferences
        const userPrefs = data.userPreferences?.[userId] || {};
        const favoriteItems = userPrefs.favoriteItems || [];
        const dislikedItems = userPrefs.dislikedItems || [];

        // Simple recommendation logic: prioritize favorite type items
        let recommendations = allItems
            .filter(item => !dislikedItems.includes(item.id) && item.available > 0)
            .sort((a, b) => {
                // Boost items similar to favorites
                const isFavA = favoriteItems.includes(a.id) ? 1 : 0;
                const isFavB = favoriteItems.includes(b.id) ? 1 : 0;
                return isFavB - isFavA || b.totalOrders - a.totalOrders;
            })
            .slice(0, maxLimit);

        res.json({
            userId,
            recommendations,
            count: recommendations.length
        });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// ============= PAYMENT VERIFICATION =============

/**
 * POST /api/payment/verify
 * Verify M-Pesa payment (placeholder - would integrate with actual M-Pesa API)
 */
app.post('/api/payment/verify', authenticateToken, (req, res) => {
    try {
        const { mpesaRef, amount, orderNumber } = req.body;

        // In production, this would call actual M-Pesa API
        // For now, accept verification with reference number
        if (!mpesaRef || !amount || !orderNumber) {
            return res.status(400).json({
                error: 'Missing required fields: mpesaRef, amount, orderNumber'
            });
        }

        const data = loadData();
        const order = data.orderHistory.find(o => o.orderNumber === orderNumber);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update payment status
        order.paymentStatus = 'Paid';
        order.mpesaRef = mpesaRef;

        if (saveData(data)) {
            res.json({
                success: true,
                message: 'Payment marked as paid',
                order
            });
        } else {
            res.status(500).json({ error: 'Failed to mark payment as paid' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// ============= UTILITY ENDPOINTS =============

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============= INVENTORY MANAGEMENT ENDPOINTS =============

/**
 * GET /api/inventory
 * Get inventory status (ADMIN ONLY)
 */
app.get('/api/inventory', authenticateToken, (req, res) => {
    try {
        const data = loadData();
        const status = InventoryManager.getInventoryStatus(data.foodData);
        res.json({
            success: true,
            ...status,
            report: InventoryManager.getInventoryReport(data.foodData)
        });
    } catch (error) {
        console.error('Error getting inventory:', error);
        res.status(500).json({ error: 'Failed to get inventory' });
    }
});

/**
 * PUT /api/inventory/:itemId
 * Update item quantity (ADMIN ONLY)
 */
app.put('/api/inventory/:itemId', authenticateToken, (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined || quantity === null) {
            return res.status(400).json({ error: 'Quantity is required' });
        }

        const data = loadData();
        const result = InventoryManager.updateItemQuantity(data.foodData, parseInt(itemId), parseInt(quantity));

        if (result.success) {
            saveData(data);
            res.json({ success: true, ...result });
            RoleManager.logActivity(data, req.user.username, 'update_inventory', { itemId, quantity });
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

/**
 * POST /api/inventory/:itemId/adjust
 * Adjust inventory by amount (ADMIN ONLY)
 */
app.post('/api/inventory/:itemId/adjust', authenticateToken, (req, res) => {
    try {
        const { itemId } = req.params;
        const { adjustment } = req.body;

        if (adjustment === undefined || adjustment === null) {
            return res.status(400).json({ error: 'Adjustment is required' });
        }

        const data = loadData();
        const result = InventoryManager.adjustQuantity(data.foodData, parseInt(itemId), parseInt(adjustment));

        if (result.success) {
            saveData(data);
            res.json({ success: true, ...result });
            RoleManager.logActivity(data, req.user.username, 'adjust_inventory', { itemId, adjustment });
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error adjusting inventory:', error);
        res.status(500).json({ error: 'Failed to adjust inventory' });
    }
});

// ============= ANALYTICS ENDPOINTS =============

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics (ADMIN ONLY)
 */
app.get('/api/admin/analytics', authenticateToken, (req, res) => {
    try {
        const data = loadData();
        const analytics = AnalyticsManager.getAnalytics(data);
        res.json({
            success: true,
            ...analytics
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

/**
 * GET /api/admin/analytics/report
 * Generate analytics report (ADMIN ONLY)
 */
app.get('/api/admin/analytics/report', authenticateToken, (req, res) => {
    try {
        const data = loadData();
        const report = AnalyticsManager.generateReport(data);
        res.json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// ============= LOYALTY POINTS ENDPOINTS =============

/**
 * GET /api/loyalty/:phone
 * Get customer loyalty info
 */
app.get('/api/loyalty/:phone', (req, res) => {
    try {
        const { phone } = req.params;
        const data = loadData();
        const summary = LoyaltyManager.getCustomerSummary(data, phone);
        res.json({
            success: true,
            loyalty: summary
        });
    } catch (error) {
        console.error('Error getting loyalty info:', error);
        res.status(500).json({ error: 'Failed to get loyalty info' });
    }
});

/**
 * POST /api/loyalty/:phone/redeem
 * Redeem loyalty points for discount
 */
app.post('/api/loyalty/:phone/redeem', (req, res) => {
    try {
        const { phone } = req.params;
        const { points, orderId } = req.body;

        if (!points || !orderId) {
            return res.status(400).json({ error: 'Points and orderId are required' });
        }

        const data = loadData();
        const result = LoyaltyManager.redeemPoints(data, phone, points, orderId);

        if (result.success) {
            saveData(data);
            res.json({ success: true, ...result });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error redeeming points:', error);
        res.status(500).json({ error: 'Failed to redeem points' });
    }
});

/**
 * GET /api/admin/loyalty/top
 * Get top loyalty customers (ADMIN ONLY)
 */
app.get('/api/admin/loyalty/top', authenticateToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data = loadData();
        const topCustomers = LoyaltyManager.getTopCustomers(data, limit);
        res.json({
            success: true,
            topCustomers
        });
    } catch (error) {
        console.error('Error getting top customers:', error);
        res.status(500).json({ error: 'Failed to get top customers' });
    }
});

/**
 * POST /api/admin/loyalty/:phone/reset
 * Reset customer loyalty points (ADMIN ONLY)
 */
app.post('/api/admin/loyalty/:phone/reset', authenticateToken, (req, res) => {
    try {
        const { phone } = req.params;
        const data = loadData();
        const result = LoyaltyManager.resetPoints(data, phone);

        if (result.success) {
            saveData(data);
            res.json(result);
            RoleManager.logActivity(data, req.user.username, 'reset_loyalty_points', { phone });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error resetting loyalty:', error);
        res.status(500).json({ error: 'Failed to reset loyalty' });
    }
});

// ============= ADMIN ROLE MANAGEMENT ENDPOINTS =============

/**
 * GET /api/admin/roles
 * Get all available roles
 */
app.get('/api/admin/roles', authenticateToken, (req, res) => {
    try {
        const roles = RoleManager.getAllRoles();
        res.json({
            success: true,
            roles
        });
    } catch (error) {
        console.error('Error getting roles:', error);
        res.status(500).json({ error: 'Failed to get roles' });
    }
});

/**
 * GET /api/admin/admins
 * Get all admin accounts (ADMIN ONLY)
 */
app.get('/api/admin/admins', authenticateToken, (req, res) => {
    try {
        const data = loadData();
        const admins = RoleManager.getAdmins(data);
        res.json({
            success: true,
            admins
        });
    } catch (error) {
        console.error('Error getting admins:', error);
        res.status(500).json({ error: 'Failed to get admins' });
    }
});

/**
 * POST /api/admin/admins
 * Create new admin account (SUPER ADMIN ONLY)
 */
app.post('/api/admin/admins', authenticateToken, (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }

        // Check if user is super admin (in real app, check role from token)
        if (true) { // TODO: Add role check
            const data = loadData();
            const result = RoleManager.createAdmin(data, username, password, role);

            if (result.success) {
                saveData(data);
                res.status(201).json(result);
                RoleManager.logActivity(data, req.user.username, 'create_admin', { newAdmin: username, role });
            } else {
                res.status(400).json(result);
            }
        } else {
            res.status(403).json({ error: 'Only Super Admin can create new admins' });
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

/**
 * PUT /api/admin/admins/:username/role
 * Update admin role (SUPER ADMIN ONLY)
 */
app.put('/api/admin/admins/:username/role', authenticateToken, (req, res) => {
    try {
        const { username } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const data = loadData();
        const result = RoleManager.updateAdminRole(data, username, role);

        if (result.success) {
            saveData(data);
            res.json(result);
            RoleManager.logActivity(data, req.user.username, 'update_admin_role', { admin: username, newRole: role });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error updating admin role:', error);
        res.status(500).json({ error: 'Failed to update admin role' });
    }
});

/**
 * POST /api/admin/admins/:username/deactivate
 * Deactivate admin (SUPER ADMIN ONLY)
 */
app.post('/api/admin/admins/:username/deactivate', authenticateToken, (req, res) => {
    try {
        const { username } = req.params;
        const data = loadData();
        const result = RoleManager.deactivateAdmin(data, username);

        if (result.success) {
            saveData(data);
            res.json(result);
            RoleManager.logActivity(data, req.user.username, 'deactivate_admin', { admin: username });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error deactivating admin:', error);
        res.status(500).json({ error: 'Failed to deactivate admin' });
    }
});

/**
 * GET /api/admin/activity-log
 * Get activity log (ADMIN ONLY)
 */
app.get('/api/admin/activity-log', authenticateToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const username = req.query.username;
        const data = loadData();

        let log;
        if (username) {
            log = RoleManager.getUserActivity(data, username, limit);
        } else {
            log = RoleManager.getActivityLog(data, limit);
        }

        res.json({
            success: true,
            activityLog: log
        });
    } catch (error) {
        console.error('Error getting activity log:', error);
        res.status(500).json({ error: 'Failed to get activity log' });
    }
});

/**
 * GET /api/debug/data
 * Debug endpoint to inspect current data (ADMIN ONLY)
 */
app.get('/api/debug/data', authenticateToken, (req, res) => {
    try {
        const data = loadData();
        res.json({
            hasData: !!data,
            dataKeys: Object.keys(data),
            foodCategoriesCount: Object.keys(data.foodData || {}).length,
            orderCount: (data.orderHistory || []).length,
            timestamp: new Date().toLocaleString()
        });
    } catch (error) {
        console.error('Error getting debug info:', error);
        res.status(500).json({ error: 'Failed to get debug info' });
    }
});

// Serve static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    console.log('✅ Server stopped');
    process.exit(0);
});

// Start server
function startServer() {
    try {
        // Ensure data file exists
        if (!fs.existsSync(DATA_FILE)) {
            console.log('📝 Initializing data.json...');
            saveData(getDefaultData());
        }
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Tharaka Cafeteria Server running on port ${PORT}`);
            console.log(`📱 Customer Interface: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
            console.log(`\n🔐 Default admin credentials:`);
            console.log(`   Username: admin`);
            console.log(`   Password: admin123`);
            console.log(`\n💾 Data Storage: data.json`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();