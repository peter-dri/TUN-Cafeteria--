-- SQLite Database Schema for Tharaka Cafeteria
-- This is a SQLite version of the MySQL schema for easier setup

-- Create cafes table
CREATE TABLE IF NOT EXISTS cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    opening_hours TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create food_items table
CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT 1,
    preparation_time INTEGER DEFAULT 15,
    ingredients TEXT, -- JSON string
    nutritional_info TEXT, -- JSON string
    cafe_id INTEGER DEFAULT 1, -- Which cafe serves this item
    plates_available INTEGER DEFAULT 50, -- Number of plates available
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cafe_id) REFERENCES cafes(id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    items TEXT NOT NULL, -- JSON string of ordered items
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    special_instructions TEXT,
    estimated_completion DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table for better normalization
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    food_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_item_id INTEGER NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO admins (username, password, email) 
VALUES ('admin', '$2b$10$Jp47f1RelDKY6e3CuCdfDehM1YUOqQ2J9t.Cl4vpZ0Jw4F02BKoSW', 'admin@tharakacafeteria.com');

-- Insert sample cafes
INSERT OR IGNORE INTO cafes (id, name, location, description, opening_hours) VALUES
(1, 'Main Cafeteria', 'Building A - Ground Floor', 'Main university cafeteria serving breakfast, lunch, and dinner', '7:00 AM - 9:00 PM'),
(2, 'Coffee Corner', 'Library Building', 'Quick snacks and beverages', '8:00 AM - 8:00 PM'),
(3, 'Garden Cafe', 'Science Block', 'Outdoor cafe with fresh salads and light meals', '9:00 AM - 6:00 PM');

-- Insert sample food items
INSERT OR IGNORE INTO food_items (name, description, price, category, image_url, ingredients, nutritional_info, cafe_id, plates_available) VALUES
('Rice and Curry', 'Traditional Sri Lankan rice and curry with vegetables', 450.00, 'Main Course', '/images/rice-curry.jpg', 
 '["Rice", "Dhal", "Vegetables", "Spices"]', 
 '{"calories": 520, "protein": "15g", "carbs": "85g", "fat": "12g"}', 1, 50),

('Kottu Roti', 'Chopped roti stir-fried with vegetables and spices', 380.00, 'Main Course', '/images/kottu.jpg',
 '["Roti", "Vegetables", "Spices", "Egg"]',
 '{"calories": 450, "protein": "12g", "carbs": "65g", "fat": "15g"}', 1, 40),

('Fish Curry', 'Spicy fish curry with coconut milk', 520.00, 'Main Course', '/images/fish-curry.jpg',
 '["Fish", "Coconut Milk", "Spices", "Curry Leaves"]',
 '{"calories": 380, "protein": "25g", "carbs": "8g", "fat": "28g"}', 1, 30),

('Hoppers', 'Traditional Sri Lankan pancakes', 180.00, 'Breakfast', '/images/hoppers.jpg',
 '["Rice Flour", "Coconut Milk", "Yeast"]',
 '{"calories": 220, "protein": "6g", "carbs": "35g", "fat": "8g"}', 1, 60),

('String Hoppers', 'Steamed rice noodle pancakes', 200.00, 'Breakfast', '/images/string-hoppers.jpg',
 '["Rice Flour", "Water", "Salt"]',
 '{"calories": 180, "protein": "4g", "carbs": "38g", "fat": "2g"}', 1, 55),

('Tea', 'Ceylon black tea', 80.00, 'Beverages', '/images/tea.jpg',
 '["Tea Leaves", "Water", "Sugar", "Milk"]',
 '{"calories": 45, "protein": "1g", "carbs": "8g", "fat": "2g"}', 2, 100),

('Coffee', 'Fresh brewed coffee', 120.00, 'Beverages', '/images/coffee.jpg',
 '["Coffee Beans", "Water", "Sugar", "Milk"]',
 '{"calories": 60, "protein": "2g", "carbs": "8g", "fat": "3g"}', 2, 80),

('Fresh Juice', 'Seasonal fruit juice', 150.00, 'Beverages', '/images/juice.jpg',
 '["Fresh Fruits", "Water", "Sugar"]',
 '{"calories": 95, "protein": "1g", "carbs": "24g", "fat": "0g"}', 3, 40),

('Watalappan', 'Traditional coconut custard dessert', 180.00, 'Desserts', '/images/watalappan.jpg',
 '["Coconut Milk", "Jaggery", "Eggs", "Spices"]',
 '{"calories": 280, "protein": "6g", "carbs": "35g", "fat": "14g"}', 1, 25),

('Curd and Honey', 'Fresh curd with wild honey', 220.00, 'Desserts', '/images/curd-honey.jpg',
 '["Buffalo Curd", "Wild Honey"]',
 '{"calories": 195, "protein": "8g", "carbs": "28g", "fat": "6g"}', 3, 20),

('Pasta', 'Italian pasta with tomato sauce', 320.00, 'Main Course', '/images/pasta.jpg',
 '["Pasta", "Tomato Sauce", "Cheese", "Herbs"]',
 '{"calories": 420, "protein": "12g", "carbs": "65g", "fat": "12g"}', 3, 35),

('Sandwich', 'Fresh vegetable sandwich', 250.00, 'Snacks', '/images/sandwich.jpg',
 '["Bread", "Lettuce", "Tomato", "Cheese"]',
 '{"calories": 280, "protein": "8g", "carbs": "35g", "fat": "10g"}', 2, 45),

('Smoothie Bowl', 'Healthy acai smoothie bowl', 350.00, 'Breakfast', '/images/smoothie.jpg',
 '["Acai", "Banana", "Granola", "Honey"]',
 '{"calories": 320, "protein": "6g", "carbs": "55g", "fat": "8g"}', 3, 20);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category);
CREATE INDEX IF NOT EXISTS idx_food_items_available ON food_items(is_available);
CREATE INDEX IF NOT EXISTS idx_food_items_cafe ON food_items(cafe_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_food_item ON reviews(food_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_food_item_id ON order_items(food_item_id);