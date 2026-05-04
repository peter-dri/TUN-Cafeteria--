// Migration script to add cafes and plate tracking to existing database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'tharaka_cafeteria.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

console.log('Starting migration...\n');

db.serialize(() => {
    // Create cafes table
    db.run(`CREATE TABLE IF NOT EXISTS cafes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        description TEXT,
        opening_hours TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating cafes table:', err.message);
        else console.log('✅ Created cafes table');
    });

    // Add cafe_id column to food_items if not exists
    db.run(`ALTER TABLE food_items ADD COLUMN cafe_id INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding cafe_id column:', err.message);
        } else {
            console.log('✅ Added cafe_id column to food_items');
        }
    });

    // Add plates_available column to food_items if not exists
    db.run(`ALTER TABLE food_items ADD COLUMN plates_available INTEGER DEFAULT 50`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding plates_available column:', err.message);
        } else {
            console.log('✅ Added plates_available column to food_items');
        }
    });

    // Add foreign key for cafe_id
    db.run(`PRAGMA foreign_keys = ON`, (err) => {
        if (err) console.error('Error enabling foreign keys:', err.message);
    });

    // Insert sample cafes (only if table is empty)
    db.get('SELECT COUNT(*) as count FROM cafes', (err, row) => {
        if (row && row.count === 0) {
            const cafes = [
                ['Main Cafeteria', 'Building A - Ground Floor', 'Main university cafeteria serving breakfast, lunch, and dinner', '7:00 AM - 9:00 PM'],
                ['Coffee Corner', 'Library Building', 'Quick snacks and beverages', '8:00 AM - 8:00 PM'],
                ['Garden Cafe', 'Science Block', 'Outdoor cafe with fresh salads and light meals', '9:00 AM - 6:00 PM']
            ];
            
            const stmt = db.prepare('INSERT INTO cafes (name, location, description, opening_hours) VALUES (?, ?, ?, ?)');
            cafes.forEach(cafe => stmt.run(cafe));
            stmt.finalize();
            console.log('✅ Inserted sample cafes');
        } else {
            console.log('ℹ️  Cafes already exist, skipping insertion');
        }
    });

    // Update food items with cafe_id and plates_available
    const updateFoodItems = () => {
        // Check if plates_available needs to be set
        db.get('SELECT COUNT(*) as count FROM food_items WHERE plates_available IS NULL OR plates_available = 0', (err, row) => {
            if (row && row.count > 0) {
                const updates = [
                    { id: 1, plates: 50 },
                    { id: 2, plates: 40 },
                    { id: 3, plates: 30 },
                    { id: 4, plates: 60 },
                    { id: 5, plates: 55 },
                    { id: 6, cafe: 2, plates: 100 }, // Tea -> Coffee Corner
                    { id: 7, cafe: 2, plates: 80 },  // Coffee -> Coffee Corner
                    { id: 8, cafe: 3, plates: 40 },  // Juice -> Garden Cafe
                    { id: 9, plates: 25 },
                    { id: 10, cafe: 3, plates: 20 } // Curd -> Garden Cafe
                ];
                
                updates.forEach(update => {
                    if (update.cafe) {
                        db.run('UPDATE food_items SET cafe_id = ?, plates_available = ? WHERE id = ?', 
                            [update.cafe, update.plates, update.id], (err) => {
                            if (err) console.error('Error updating food item:', err.message);
                        });
                    } else {
                        db.run('UPDATE food_items SET plates_available = ? WHERE id = ?', 
                            [update.plates, update.id], (err) => {
                            if (err) console.error('Error updating food item:', err.message);
                        });
                    }
                });
                console.log('✅ Updated food items with cafe and plate information');
            } else {
                console.log('ℹ️  Food items already have plates_available set');
            }
        });
    };

    // Run update after a short delay to ensure tables are created
    setTimeout(updateFoodItems, 500);
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error('Error closing database:', err.message);
        else console.log('\n✅ Migration completed successfully!');
    });
}, 1000);
