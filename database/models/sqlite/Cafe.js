const dbConnection = require('../../sqlite-connection');

class Cafe {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
        this.location = data.location;
        this.description = data.description;
        this.opening_hours = data.opening_hours;
        this.is_active = Boolean(data.is_active);
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const row = await dbConnection.get(
                'SELECT * FROM cafes WHERE id = ?',
                [id]
            );
            return row ? new Cafe(row) : null;
        } catch (error) {
            console.error('Error finding cafe by ID:', error);
            throw error;
        }
    }

    static async getAll(options = {}) {
        try {
            let query = 'SELECT * FROM cafes';
            const params = [];
            const conditions = [];

            if (options.active !== undefined) {
                conditions.push('is_active = ?');
                params.push(options.active ? 1 : 0);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY name';

            const rows = await dbConnection.all(query, params);
            return rows.map(row => new Cafe(row));
        } catch (error) {
            console.error('Error getting all cafes:', error);
            throw error;
        }
    }

    static async getActive() {
        return await Cafe.getAll({ active: true });
    }

    static async create(cafeData) {
        try {
            const result = await dbConnection.run(
                `INSERT INTO cafes (name, location, description, opening_hours, is_active) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    cafeData.name,
                    cafeData.location,
                    cafeData.description,
                    cafeData.opening_hours,
                    cafeData.is_active !== undefined ? cafeData.is_active : 1
                ]
            );
            return await Cafe.findById(result.id);
        } catch (error) {
            console.error('Error creating cafe:', error);
            throw error;
        }
    }

    static async update(id, cafeData) {
        try {
            await dbConnection.run(
                `UPDATE cafes SET 
                    name = ?, 
                    location = ?, 
                    description = ?, 
                    opening_hours = ?, 
                    is_active = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    cafeData.name,
                    cafeData.location,
                    cafeData.description,
                    cafeData.opening_hours,
                    cafeData.is_active !== undefined ? cafeData.is_active : 1,
                    id
                ]
            );
            return await Cafe.findById(id);
        } catch (error) {
            console.error('Error updating cafe:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            await dbConnection.run('DELETE FROM cafes WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error deleting cafe:', error);
            throw error;
        }
    }

    // Get all food items available in this cafe
    async getFoodItems() {
        try {
            const rows = await dbConnection.all(
                'SELECT * FROM food_items WHERE cafe_id = ? AND is_available = 1 ORDER BY category, name',
                [this.id]
            );
            return rows;
        } catch (error) {
            console.error('Error getting cafe food items:', error);
            throw error;
        }
    }
}

module.exports = Cafe;
