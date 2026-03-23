/**
 * Inventory Management Module
 * Tracks food item stock levels and alerts
 */
const InventoryManager = (() => {
    const lowStockThreshold = 5; // Items below this trigger alerts

    // Get inventory status
    function getInventoryStatus(foodData) {
        const inventory = {};
        const alerts = [];

        for (const category in foodData) {
            inventory[category] = foodData[category].map(item => ({
                id: item.id,
                name: item.name,
                available: item.available,
                price: item.price,
                status: getStatus(item.available),
                lastUpdated: item.lastUpdated || new Date().toLocaleString()
            }));

            // Check for low stock
            foodData[category].forEach(item => {
                if (item.available <= lowStockThreshold && item.available > 0) {
                    alerts.push({
                        type: 'warning',
                        item: item.name,
                        current: item.available,
                        category: category,
                        message: `⚠️ Low stock: ${item.name} (${item.available} left)`
                    });
                } else if (item.available <= 0) {
                    alerts.push({
                        type: 'critical',
                        item: item.name,
                        current: item.available,
                        category: category,
                        message: `❌ Out of stock: ${item.name}`
                    });
                }
            });
        }

        return { inventory, alerts };
    }

    // Get status label
    function getStatus(available) {
        if (available > lowStockThreshold) return 'Available';
        if (available > 0) return 'Low Stock';
        return 'Out of Stock';
    }

    // Update item quantity
    function updateItemQuantity(foodData, itemId, newQuantity) {
        for (const category in foodData) {
            const item = foodData[category].find(i => i.id === itemId);
            if (item) {
                const oldQuantity = item.available;
                item.available = Math.max(0, newQuantity);
                item.lastUpdated = new Date().toLocaleString();
                return {
                    success: true,
                    item: item.name,
                    oldQuantity,
                    newQuantity: item.available
                };
            }
        }
        return { success: false, error: 'Item not found' };
    }

    // Adjust quantity by amount
    function adjustQuantity(foodData, itemId, adjustment) {
        for (const category in foodData) {
            const item = foodData[category].find(i => i.id === itemId);
            if (item) {
                const oldQuantity = item.available;
                item.available = Math.max(0, item.available + adjustment);
                item.lastUpdated = new Date().toLocaleString();
                return {
                    success: true,
                    item: item.name,
                    oldQuantity,
                    newQuantity: item.available,
                    adjustment
                };
            }
        }
        return { success: false, error: 'Item not found' };
    }

    // Get inventory report
    function getInventoryReport(foodData) {
        let totalItems = 0;
        let totalValue = 0;
        let outOfStock = 0;
        let lowStock = 0;

        for (const category in foodData) {
            foodData[category].forEach(item => {
                totalItems += item.available;
                totalValue += (item.available * item.price);
                
                if (item.available <= 0) outOfStock++;
                else if (item.available <= lowStockThreshold) lowStock++;
            });
        }

        return {
            totalItems,
            totalValue,
            outOfStock,
            lowStock,
            categories: Object.keys(foodData).length,
            timestamp: new Date().toLocaleString()
        };
    }

    // Restock item
    function restockItem(foodData, itemId, quantity) {
        return adjustQuantity(foodData, itemId, quantity);
    }

    return {
        getInventoryStatus,
        getStatus,
        updateItemQuantity,
        adjustQuantity,
        getInventoryReport,
        restockItem,
        lowStockThreshold
    };
})();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryManager;
}
