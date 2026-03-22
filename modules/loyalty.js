/**
 * Loyalty Points System Module
 * Track customer points and rewards
 */
const LoyaltyManager = (() => {
    // Configuration
    const config = {
        pointsPerKsh: 1,        // 1 point per KSh spent
        redeemRate: 0.5,        // 1 point = 0.5 KSh discount
        tiers: {
            bronze: { name: 'Bronze', minPoints: 0, bonus: 0 },
            silver: { name: 'Silver', minPoints: 100, bonus: 0.05 },
            gold: { name: 'Gold', minPoints: 500, bonus: 0.1 },
            platinum: { name: 'Platinum', minPoints: 1000, bonus: 0.15 }
        }
    };

    // Get or create customer record
    function getCustomerLoyalty(data, phone) {
        if (!data.loyaltyAccounts) data.loyaltyAccounts = {};
        
        if (!data.loyaltyAccounts[phone]) {
            data.loyaltyAccounts[phone] = {
                phone,
                points: 0,
                totalSpent: 0,
                totalOrders: 0,
                tier: 'bronze',
                joinedDate: new Date().toLocaleString(),
                lastOrder: null,
                history: []
            };
        }

        return data.loyaltyAccounts[phone];
    }

    // Award points for order
    function awardPoints(data, phone, amount, orderId) {
        const customer = getCustomerLoyalty(data, phone);
        const points = Math.round(amount * config.pointsPerKsh);

        customer.points += points;
        customer.totalSpent += amount;
        customer.totalOrders += 1;
        customer.lastOrder = new Date().toLocaleString();
        customer.tier = getTier(customer.points);

        customer.history.push({
            type: 'earn',
            points,
            amount,
            orderId,
            date: new Date().toLocaleString()
        });

        return {
            success: true,
            pointsAwarded: points,
            totalPoints: customer.points,
            tier: customer.tier,
            message: `🎉 Earned ${points} points! Total: ${customer.points} points`
        };
    }

    // Redeem points
    function redeemPoints(data, phone, points, orderId) {
        const customer = getCustomerLoyalty(data, phone);

        if (customer.points < points) {
            return {
                success: false,
                error: `Insufficient points. You have ${customer.points} points`
            };
        }

        const discount = Math.round(points * config.redeemRate);
        customer.points -= points;
        customer.tier = getTier(customer.points);

        customer.history.push({
            type: 'redeem',
            points,
            discount,
            orderId,
            date: new Date().toLocaleString()
        });

        return {
            success: true,
            pointsRedeemed: points,
            discountAmount: discount,
            remainingPoints: customer.points,
            tier: customer.tier,
            message: `✅ Redeemed ${points} points for KSh ${discount} discount!`
        };
    }

    // Get tier
    function getTier(points) {
        if (points >= config.tiers.platinum.minPoints) return 'platinum';
        if (points >= config.tiers.gold.minPoints) return 'gold';
        if (points >= config.tiers.silver.minPoints) return 'silver';
        return 'bronze';
    }

    // Get tier benefits
    function getTierBenefits(tier) {
        const tierInfo = config.tiers[tier];
        const bonus = tierInfo.bonus * 100;
        return {
            tier: tierInfo.name,
            bonus: bonus > 0 ? `${bonus}% bonus points` : 'Standard rate',
            bonusMultiplier: 1 + tierInfo.bonus,
            minPoints: tierInfo.minPoints
        };
    }

    // Get customer summary
    function getCustomerSummary(data, phone) {
        const customer = getCustomerLoyalty(data, phone);
        const tierInfo = config.tiers[customer.tier];
        const pointsToNextTier = tierInfo.minPoints > customer.points 
            ? tierInfo.minPoints - customer.points 
            : 'Max tier';

        return {
            phone,
            points: customer.points,
            tier: getTierBenefits(customer.tier),
            pointsToNextTier,
            totalSpent: customer.totalSpent,
            totalOrders: customer.totalOrders,
            lastOrder: customer.lastOrder,
            joinedDate: customer.joinedDate,
            estimatedDiscount: Math.round(customer.points * config.redeemRate)
        };
    }

    // Reset points (admin)
    function resetPoints(data, phone) {
        const customer = getCustomerLoyalty(data, phone);
        const oldPoints = customer.points;
        
        customer.points = 0;
        customer.tier = 'bronze';
        customer.history.push({
            type: 'reset',
            oldPoints,
            date: new Date().toLocaleString(),
            reason: 'Admin reset'
        });

        return {
            success: true,
            message: `Reset ${oldPoints} points for ${phone}`
        };
    }

    // Get top customers
    function getTopCustomers(data, limit = 10) {
        if (!data.loyaltyAccounts) return [];

        return Object.values(data.loyaltyAccounts)
            .sort((a, b) => b.points - a.points)
            .slice(0, limit)
            .map(customer => ({
                phone: customer.phone,
                points: customer.points,
                tier: config.tiers[customer.tier].name,
                totalSpent: customer.totalSpent,
                orders: customer.totalOrders,
                lastOrder: customer.lastOrder
            }));
    }

    // Calculate points for order with tier bonus
    function calculatePointsWithBonus(amount, tier) {
        const basePoints = Math.round(amount * config.pointsPerKsh);
        const tierInfo = config.tiers[tier] || config.tiers.bronze;
        const bonusPoints = Math.round(basePoints * tierInfo.bonus);
        return basePoints + bonusPoints;
    }

    return {
        awardPoints,
        redeemPoints,
        getTier,
        getTierBenefits,
        getCustomerSummary,
        resetPoints,
        getTopCustomers,
        calculatePointsWithBonus,
        config
    };
})();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoyaltyManager;
}
