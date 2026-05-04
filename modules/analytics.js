/**
 * Analytics Module
 * Provides insights and statistics for admin dashboard
 */
const AnalyticsManager = (() => {
    
    // Get comprehensive analytics
    function getAnalytics(data) {
        const orders = data.orderHistory || [];
        const foodData = data.foodData || {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return {
            revenue: getRevenueAnalytics(orders),
            orders: getOrderAnalytics(orders),
            items: getItemAnalytics(orders, foodData),
            payments: getPaymentAnalytics(orders),
            inventory: getInventoryAnalytics(foodData),
            timing: getTimingAnalytics(orders),
            topItems: getTopItems(orders),
            timestamp: new Date().toLocaleString()
        };
    }

    // Revenue Analytics
    function getRevenueAnalytics(orders) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalRevenue = 0;
        let todayRevenue = 0;
        let paidOrders = 0;
        let pendingAmount = 0;

        orders.forEach(order => {
            if (order.paymentStatus === 'Paid') {
                totalRevenue += order.total;
                paidOrders++;

                const orderDate = new Date(order.timestamp);
                orderDate.setHours(0, 0, 0, 0);
                if (orderDate.getTime() === today.getTime()) {
                    todayRevenue += order.total;
                }
            } else if (order.paymentStatus !== 'Failed' && order.paymentStatus !== 'Refunded') {
                pendingAmount += order.total;
            }
        });

        return {
            total: totalRevenue,
            today: todayRevenue,
            pending: pendingAmount,
            paidOrders,
            average: paidOrders > 0 ? Math.round(totalRevenue / paidOrders) : 0
        };
    }

    // Order Analytics
    function getOrderAnalytics(orders) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalOrders = orders.length;
        let todayOrders = 0;
        let completedOrders = 0;
        let cancelledOrders = 0;

        const statuses = {};
        const paymentStatuses = {};

        orders.forEach(order => {
            // Count by date
            const orderDate = new Date(order.timestamp);
            orderDate.setHours(0, 0, 0, 0);
            if (orderDate.getTime() === today.getTime()) {
                todayOrders++;
            }

            // Count by status
            statuses[order.orderStatus] = (statuses[order.orderStatus] || 0) + 1;
            paymentStatuses[order.paymentStatus] = (paymentStatuses[order.paymentStatus] || 0) + 1;

            if (order.orderStatus === 'Completed') completedOrders++;
            if (order.orderStatus === 'Cancelled') cancelledOrders++;
        });

        return {
            total: totalOrders,
            today: todayOrders,
            completed: completedOrders,
            cancelled: cancelledOrders,
            statuses,
            paymentStatuses
        };
    }

    // Item Analytics
    function getItemAnalytics(orders, foodData) {
        let totalItems = 0;
        let uniqueItems = 0;

        for (const category in foodData) {
            foodData[category].forEach(() => uniqueItems++);
        }

        orders.forEach(order => {
            order.items?.forEach(item => {
                totalItems += item.quantity;
            });
        });

        return {
            totalItemsSold: totalItems,
            uniqueItems,
            averagePerOrder: orders.length > 0 ? Math.round(totalItems / orders.length * 10) / 10 : 0
        };
    }

    // Payment Method Analytics
    function getPaymentAnalytics(orders) {
        const breakdown = {};
        let cashTotal = 0;
        let mpesaTotal = 0;

        orders.forEach(order => {
            if (order.paymentStatus === 'Paid') {
                breakdown[order.paymentMethod] = (breakdown[order.paymentMethod] || 0) + 1;
                
                if (order.paymentMethod === 'cash') {
                    cashTotal += order.total;
                } else if (order.paymentMethod === 'mpesa') {
                    mpesaTotal += order.total;
                }
            }
        });

        return {
            breakdown,
            cashRevenue: cashTotal,
            mpesaRevenue: mpesaTotal,
            cashCount: breakdown['cash'] || 0,
            mpesaCount: breakdown['mpesa'] || 0
        };
    }

    // Inventory Analytics
    function getInventoryAnalytics(foodData) {
        let totalStock = 0;
        let totalValue = 0;
        let itemCount = 0;

        for (const category in foodData) {
            foodData[category].forEach(item => {
                totalStock += item.available;
                totalValue += (item.available * item.price);
                itemCount++;
            });
        }

        return {
            totalItems: itemCount,
            totalQuantity: totalStock,
            totalValue,
            avgPerItem: itemCount > 0 ? Math.round(totalValue / itemCount) : 0
        };
    }

    // Timing Analytics
    function getTimingAnalytics(orders) {
        const hourBreakdown = {};
        const dayBreakdown = {};

        orders.forEach(order => {
            const date = new Date(order.timestamp);
            const hour = date.getHours();
            const day = date.toLocaleDateString();

            hourBreakdown[`${hour}:00`] = (hourBreakdown[`${hour}:00`] || 0) + 1;
            dayBreakdown[day] = (dayBreakdown[day] || 0) + 1;
        });

        // Find peak hour
        let peakHour = 'N/A';
        let peakCount = 0;
        for (const hour in hourBreakdown) {
            if (hourBreakdown[hour] > peakCount) {
                peakCount = hourBreakdown[hour];
                peakHour = hour;
            }
        }

        return {
            peakHour,
            peakOrderCount: peakCount,
            hourBreakdown,
            dayBreakdown
        };
    }

    // Top Items
    function getTopItems(orders) {
        const itemCounts = {};
        const itemRevenue = {};

        orders.forEach(order => {
            if (order.paymentStatus === 'Paid') {
                order.items?.forEach(item => {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
                    itemRevenue[item.name] = (itemRevenue[item.name] || 0) + (item.price * item.quantity);
                });
            }
        });

        // Sort by quantity
        const sorted = Object.entries(itemCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({
                name,
                quantity: count,
                revenue: itemRevenue[name] || 0
            }));

        return sorted;
    }

    // Generate report
    function generateReport(data) {
        const analytics = getAnalytics(data);
        return {
            ...analytics,
            generatedAt: new Date().toLocaleString()
        };
    }

    return {
        getAnalytics,
        getRevenueAnalytics,
        getOrderAnalytics,
        getItemAnalytics,
        getPaymentAnalytics,
        getTimingAnalytics,
        getTopItems,
        generateReport
    };
})();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsManager;
}
