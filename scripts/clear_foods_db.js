// One-off script to remove food records from MySQL and SQLite
// Usage: node scripts/clear_foods_db.js

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function clearMySQL() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tharaka_cafeteria',
        multipleStatements: true
    };

    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log('[MySQL] Connected to', dbConfig.database);

        // Temporarily disable FK checks to allow cleaning of referenced rows
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = ['food_tags', 'reviews', 'food_items'];
        for (const t of tables) {
            const [res] = await conn.query(`DELETE FROM ${t}`);
            console.log(`[MySQL] Deleted rows from ${t}`);
        }

        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('[MySQL] Food-related tables cleared');
    } catch (err) {
        console.error('[MySQL] Error:', err.message);
    } finally {
        if (conn) await conn.end();
    }
}

async function clearSQLite() {
    const dbPath = path.join(__dirname, '..', 'database', 'tharaka_cafeteria.db');
    console.log('[SQLite] DB path:', dbPath);

    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error('[SQLite] Failed to open DB:', err.message);
        }
    });

    await new Promise((resolve) => {
        db.serialize(() => {
            // Turn off foreign keys to avoid constraint errors during delete
            db.run('PRAGMA foreign_keys = OFF');

            const stmts = [
                'DELETE FROM reviews',
                'DELETE FROM food_items'
            ];

            stmts.forEach((s) => {
                db.run(s, function (err) {
                    if (err) console.error('[SQLite] Error running:', s, err.message);
                    else console.log('[SQLite] Executed:', s);
                });
            });

            db.run('PRAGMA foreign_keys = ON', (err) => {
                if (err) console.error('[SQLite] Failed to re-enable foreign_keys:', err.message);
                resolve();
            });
        });
    });

    db.close();
    console.log('[SQLite] Food records cleared');
}

(async () => {
    console.log('Starting food records cleanup (MySQL + SQLite)');
    await clearMySQL();
    await clearSQLite();
    console.log('Cleanup finished');
})();
