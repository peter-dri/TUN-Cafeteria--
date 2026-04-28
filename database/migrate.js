// Data Migration Script - JSON to MySQL
const mysql = require('mysql2/promise');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tharaka_cafeteria',
    multipleStatements: true
};

async function migrateData() {
    let connection;
    
    try {
        console.log('🔄 Starting data migration from JSON to MySQL...');
        
        // Read existing JSON data
        const jsonData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        
        // Connect to MySQL
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');
        
        // Clear existing data (for fresh migration)
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('TRUNCATE TABLE order_items');
        await connection.execute('TRUNCATE TABLE orders');
        await connection.execute('TRUNCATE TABLE food_tags');
        await connection.execute('TRUNCATE TABLE food_items');
        await connection.execute('TRUNCATE TABLE admin_accounts');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🧹 Cleared existing data');
        
        // Migrate Food Items
        console.log('📦 Migrating food items...');
        const foodItemsInserted = [];
        
        for (const category in jsonData.foodData) {
            const items = jsonData.foodData[category];
            
            for (const item of items) {
                const [result] = await connection.execute(`
                    INSERT INTO food_items (
                        id, name, price, available, unit, category, 
                        total_orders, calories, is_vegetarian, is_vegan, spicy_level
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    item.id,
                    item.name,
                    item.price,
                    item.available,
                    item.unit,
                    item.category || category,
                    item.totalOrders || 0,
                    item.calories || null,
                    item.isVegetarian || false,
                    item.isVegan || false,
                    item.spicyLevel || 0
                ]);
                
                foodItemsInserted.push(item.id);
                
                // Migrate tags if they exist
                if (item.tags && Array.isArray(item.tags)) {
                    for (const tag of item.tags) {
                        await connection.execute(`
                            INSERT INTO food_tags (food_item_id, tag) VALUES (?, ?)
                        `, [item.id, tag]);
                    }
                }
            }
        }
        console.log(`✅ Migrated ${foodItemsInserted.length} food items`);
        
        // Migrate Admin Accounts
        console.log('👥 Migrating admin accounts...');
        for (const admin of jsonData.adminAccounts) {
            // Hash the password
            const hashedPassword = await bcrypt.hash(admin.password, 10);
            
            await connection.execute(`
                INSERT INTO admin_accounts (id, username, password_hash, role, active)
                VALUES (?, ?, ?, ?, ?)
            `, [
                admin.id,
                admin.username,
                hashedPassword,
                admin.role,
                admin.active
            ]);
        }
        console.log(`✅ Migrated ${jsonData.adminAccounts.length} admin accounts`);
        
        // Migrate Orders
        console.log('📋 Migrating order history...');
        for (const order of jsonData.orderHistory) {
            // Insert order
            const [orderResult] = await connection.execute(`
                INSERT INTO orders (id, order_number, total, payment_method, mpesa_phone, payment_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                order.id,
                order.orderNumber,
                order.total,
                order.paymentMethod,
                order.mpesaPhone,
                order.paymentStatus,
                new Date(order.timestamp)
            ]);
            
            // Insert order items
            for (const item of order.items) {
                await connection.execute(`
                    INSERT INTO order_items (order_id, food_item_id, food_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    order.id,
                    item.id,
                    item.name,
                    item.quantity,
                    item.price,
                    item.total
                ]);
            }
        }
        console.log(`✅ Migrated ${jsonData.orderHistory.length} orders`);
        
        // Update order counter
        await connection.execute(`
            UPDATE order_counter SET counter = ?
        `, [jsonData.orderCounter]);
        console.log(`✅ Updated order counter to ${jsonData.orderCounter}`);
        
        // Recommendation metrics omitted from migration (analytics data can be rebuilt)
        
        console.log('🎉 Data migration completed successfully!');
        
        // Create backup of original JSON file
        const backupName = `data_backup_${Date.now()}.json`;
        fs.copyFileSync('data.json', backupName);
        console.log(`📁 Created backup: ${backupName}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateData().catch(console.error);
}

module.exports = { migrateData };