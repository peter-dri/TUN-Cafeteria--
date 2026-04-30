// Payment Module - Handle payments
const PaymentModule = (() => {
    
    function showPaymentModal(cart, total) {
        const modal = document.getElementById('paymentModal');
        if (!modal) {
            console.error('Payment modal element not found!');
            return;
        }
        
        const paymentTotal = document.getElementById('paymentTotal');
        const paymentSummary = document.getElementById('paymentSummary');
        
        if (!paymentTotal || !paymentSummary) {
            console.error('Payment elements not found!', { paymentTotal, paymentSummary });
            return;
        }
        
        paymentTotal.textContent = total;
        
        const summary = cart.map(item => 
            `<div>${item.name} × ${item.quantity} = KSh ${item.price * item.quantity}</div>`
        ).join('');
        
        paymentSummary.innerHTML = summary;
        modal.style.display = 'flex';
        console.log('Payment modal displayed successfully');
    }

    async function processPayment(method, cart, total, mpesaPhone = null, customerName = '') {
        const orderItems = cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        }));

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: orderItems,
                    total,
                    paymentMethod: method,
                    mpesaPhone,
                    customerName
                })
            });

            const result = await response.json();
            
            // Add response status to result
            result.status = response.status;
            
            // If order successful, update user profile and track recommendations
            if (response.ok && result.success) {
                // Update user profile with order
                if (typeof UserProfileManager !== 'undefined') {
                    UserProfileManager.addOrder({
                        items: orderItems,
                        total: total,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Track recommended items that were ordered
                if (typeof RecommendationAnalytics !== 'undefined' && typeof UserProfileManager !== 'undefined') {
                    const userId = UserProfileManager.getUserId();
                    orderItems.forEach(item => {
                        RecommendationAnalytics.trackRecommendationOrdered(userId, item.id);
                    });
                }

                // If M-Pesa, initiate STK push
                if (method === 'mpesa' && mpesaPhone) {
                    try {
                        const stkResponse = await fetch('/api/mpesa/stk-push-public', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: mpesaPhone,
                                amount: total,
                                orderId: result.order.orderNumber,
                                description: `Order #${result.order.orderNumber} - KSh ${total}`
                            })
                        });

                        const stkResult = await stkResponse.json();
                        result.stkPush = stkResult;
                    } catch (stkError) {
                        console.error('STK Push error:', stkError);
                        result.stkPushError = stkError.message;
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('Payment error:', error);
            return {
                success: false,
                error: error.message,
                status: 500
            };
        }    }

    return {
        showPaymentModal,
        processPayment
    };
})();