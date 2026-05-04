// Database Connection Module
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tharaka_cafeteria',
    connectionLimit: 10,
    waitForConnections: true,
    connectTimeout: 60000
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Execute transaction
async function executeTransaction(queries) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const { query, params } of queries) {
            const [result] = await connection.execute(query, params);
            results.push(result);
        }
        
        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Get next order number
async function getNextOrderNumber() {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        // Lock row and get current counter
        const [rows] = await connection.execute('SELECT counter FROM order_counter WHERE id = 1 FOR UPDATE');
        const currentCounter = rows[0]?.counter || 1000;
        const nextCounter = currentCounter + 1;

        // Update counter to the next value
        await connection.execute('UPDATE order_counter SET counter = ? WHERE id = 1', [nextCounter]);

        await connection.commit();
        // Return the newly assigned order number
        return `TUC-${nextCounter}`;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Close pool
async function closePool() {
    await pool.end();
    console.log('Database connection pool closed');
}

module.exports = {
    pool,
    executeQuery,
    executeTransaction,
    getNextOrderNumber,
    testConnection,
    closePool
};