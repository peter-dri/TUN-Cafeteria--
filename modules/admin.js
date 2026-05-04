// Admin Module - All admin operations
const AdminModule = (() => {
    let appData = null;
    let posCart = [];

    async function loadData() {
        try {
            const token = AuthModule.getToken();
            const headers = token
                ? { 'Authorization': `Bearer ${token}` }
                : {};

            const response = await fetch('/api/data', { headers });
            if (!response.ok) {
                throw new Error(`Failed to load data (HTTP ${response.status})`);
            }

            const data = await response.json();

            if (!data || typeof data !== 'object') {
                throw new Error('Invalid server response');
            }

            if (!data.foodData || typeof data.foodData !== 'object') {
                data.foodData = { breakfast: [], lunch: [], snacks: [] };
            }

            if (!Array.isArray(data.orderHistory)) {
                data.orderHistory = [];
            }

            if (!Array.isArray(data.adminAccounts)) {
                data.adminAccounts = [];
            }

            if (!Array.isArray(data.activityLog)) {
                data.activityLog = [];
            }

            if (!data.reviews || typeof data.reviews !== 'object') {
                data.reviews = {};
            }

            if (!data.mpesaSessions || typeof data.mpesaSessions !== 'object') {
                data.mpesaSessions = {};
            }

            appData = data;
            return appData;
        } catch (error) {
            console.error('Error loading admin data:', error);
            throw error;
        }
    }

    async function saveData() {
        const token = AuthModule.getToken();
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(appData)
        });
        return response.ok;
    }

    // POS Functions
    function renderPOSMenu(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        let totalAvailableItems = 0;

        for (let category in appData.foodData) {
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryTitle.style.cssText = 'color: #2E3192; margin-top: 1rem; margin-bottom: 0.5rem;';
            
            // Filter available items in this category
            const availableItems = appData.foodData[category].filter(item => item.available > 0);
            
            if (availableItems.length > 0) {
                container.appendChild(categoryTitle);
                totalAvailableItems += availableItems.length;

                availableItems.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = 'background: white; padding: 1rem; border-radius: 0.375rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;';
                    
                    // Add hover effects using event listeners instead of inline handlers
                    itemDiv.addEventListener('mouseover', () => {
                        itemDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    });
                    itemDiv.addEventListener('mouseout', () => {
                        itemDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    });
                    
                    itemDiv.setAttribute('data-item-id', item.id);
                    
                    itemDiv.innerHTML = `
                        <div>
                            <strong style="display: block; margin-bottom: 0.25rem;">${item.name}</strong>
                            <span style="color: #718096; font-size: 0.875rem;">${item.available} ${item.unit} available</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #2E3192; font-weight: 700; font-size: 1.125rem;">KSh ${item.price}</div>
                            <button class="btn btn-primary btn-sm add-pos-btn" style="margin-top: 0.5rem;">Add</button>
                        </div>
                    `;
                    
                    // Add event listener for Add button
                    const addBtn = itemDiv.querySelector('.add-pos-btn');
                    addBtn.addEventListener('click', () => {
                        console.log('POS Add button clicked for item:', { id: item.id, name: item.name, price: item.price });
                        AdminModule.addToPOSCart(item.id, item.name, item.price);
                    });
                    
                    container.appendChild(itemDiv);
                });
            }
        }

        // Show message if no items available
        if (totalAvailableItems === 0) {
            container.innerHTML = '<p class="no-items" style="text-align: center; color: #718096; padding: 2rem;">All items are currently sold out. Please restock inventory.</p>';
        }
    }

    function addToPOSCart(id, name, price) {
        const existing = posCart.find(item => item.id === id);
        
        if (existing) {
            existing.quantity++;
        } else {
            posCart.push({ id, name, price, quantity: 1 });
        }
        
        renderPOSCart();
    }

    function removePOSItem(id) {
        posCart = posCart.filter(item => item.id !== id);
        renderPOSCart();
    }

    function updatePOSQuantity(id, change) {
        const item = posCart.find(item => item.id === id);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removePOSItem(id);
            } else {
                renderPOSCart();
            }
        }
    }

    function renderPOSCart() {
        const container = document.getElementById('posCart');
        const totalEl = document.getElementById('posTotal');

        if (posCart.length === 0) {
            container.innerHTML = '<p style="color: #718096; text-align: center; padding: 2rem 0;">No items added</p>';
            totalEl.textContent = '0';
            return;
        }

        container.innerHTML = '';
        let total = 0;

        posCart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'padding: 0.75rem; background: #F7FAFC; border-radius: 0.375rem; margin-bottom: 0.5rem;';

            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;';
            const nameEl = document.createElement('strong');
            nameEl.style.fontSize = '0.875rem';
            nameEl.textContent = item.name;
            const removeBtn = document.createElement('button');
            removeBtn.style.cssText = 'background: none; border: none; color: #E53E3E; cursor: pointer; font-size: 1.25rem;';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => AdminModule.removePOSItem(item.id));
            header.appendChild(nameEl);
            header.appendChild(removeBtn);

            const body = document.createElement('div');
            body.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

            const qtyWrap = document.createElement('div');
            qtyWrap.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn-icon';
            btnMinus.textContent = '-';
            btnMinus.addEventListener('click', () => AdminModule.updatePOSQuantity(item.id, -1));

            const qtySpan = document.createElement('span');
            qtySpan.style.minWidth = '30px';
            qtySpan.style.textAlign = 'center';
            qtySpan.textContent = item.quantity;

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn-icon';
            btnPlus.textContent = '+';
            btnPlus.addEventListener('click', () => AdminModule.updatePOSQuantity(item.id, 1));

            qtyWrap.appendChild(btnMinus);
            qtyWrap.appendChild(qtySpan);
            qtyWrap.appendChild(btnPlus);

            const priceEl = document.createElement('span');
            priceEl.style.fontWeight = '600';
            priceEl.textContent = `KSh ${itemTotal}`;

            body.appendChild(qtyWrap);
            body.appendChild(priceEl);

            itemDiv.appendChild(header);
            itemDiv.appendChild(body);
            container.appendChild(itemDiv);
        });

        totalEl.textContent = total;
    }

    async function placePOSOrder() {
        if (posCart.length === 0) {
            alert('Please add items to the order');
            return;
        }

        const method = 'mpesa';
        const customerNameInput = document.getElementById('posCustomerName');
        const mpesaPhoneInput = document.getElementById('posMpesaPhone');
        const customerName = customerNameInput ? customerNameInput.value.trim() : '';
        const mpesaPhone = mpesaPhoneInput ? mpesaPhoneInput.value.trim() : '';

        if (!customerName) {
            alert('Please enter the student name');
            return;
        }

        if (!mpesaPhone) {
            alert('Please enter the M-Pesa number');
            return;
        }

        const orderItems = posCart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        }));

        const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        try {
            // First, create the order
            const orderResponse = await fetch('/api/orders', {
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

            const orderResult = await orderResponse.json();

            if (orderResult.success) {
                // If M-Pesa, initiate STK push
                if (method === 'mpesa') {
                    try {
                        // Use centralized auth state to avoid token key mismatches.
                        const token = AuthModule.getToken();
                        if (!token) {
                            alert('Session expired. Please login again.');
                            return;
                        }

                        // Initiate STK push
                        const stkResponse = await fetch('/api/mpesa/stk-push', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                phone: mpesaPhone,
                                amount: total,
                                orderId: orderResult.order.orderNumber,
                                description: `Order #${orderResult.order.orderNumber} - KSh ${total}`
                            })
                        });

                        const stkResult = await stkResponse.json();

                        if (stkResult.success) {
                            const paymentInstructions = `📱 M-PESA STK PUSH SENT\n\n✓ Customer will receive M-Pesa prompt on ${mpesaPhone}\n✓ They will enter their PIN to complete payment\n✓ Order will be automatically marked as PAID once payment is confirmed\n\nCheckout ID: ${stkResult.checkoutRequestId}`;
                            
                            alert(`✓ Order placed successfully!\n\nOrder Number: ${orderResult.order.orderNumber}\nTotal: KSh ${orderResult.order.total}\nPayment: ${orderResult.order.paymentMethod}\n\n${paymentInstructions}`);
                        } else {
                            // STK push failed, but order was created
                            alert(`✓ Order placed successfully!\n\nOrder Number: ${orderResult.order.orderNumber}\nTotal: KSh ${orderResult.order.total}\n\n⚠️ STK Push failed: ${stkResult.error}\n\nPlease contact support or retry payment from the Orders tab.`);
                        }
                    } catch (stkError) {
                        // STK push error, but order was created
                        alert(`✓ Order placed successfully!\n\nOrder Number: ${orderResult.order.orderNumber}\nTotal: KSh ${orderResult.order.total}\n\n⚠️ M-Pesa payment error: ${stkError.message}\n\nPlease retry from the Orders tab.`);
                    }
                } else {
                    // Cash payment
                    const paymentInstructions = `💵 COLLECT CASH: KSh ${orderResult.order.total}\n\n⚠️ IMPORTANT: After receiving cash, go to the Orders tab and click "Mark as Paid" button for order #${orderResult.order.orderNumber}`;
                    alert(`✓ Order placed successfully!\n\nOrder Number: ${orderResult.order.orderNumber}\nTotal: KSh ${orderResult.order.total}\nPayment: ${orderResult.order.paymentMethod}\n\n${paymentInstructions}`);
                }

                posCart = [];
                renderPOSCart();
                if (customerNameInput) customerNameInput.value = '';
                if (mpesaPhoneInput) mpesaPhoneInput.value = '';
                await loadData();
                renderPOSMenu('posMenu');
            } else {
                alert('Error: ' + (orderResult.error || 'Failed to place order'));
            }
        } catch (error) {
            alert('Error placing order: ' + error.message);
        }
    }

    async function clearPOSOrder() {
        if (posCart.length > 0 && !(await Confirm.confirm('Clear current order?'))) return;
        posCart = [];
        renderPOSCart();
    }

    function renderInventory(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const displayedIds = new Set();

        for (let cat in appData.foodData) {
            appData.foodData[cat].forEach(item => {
                if (displayedIds.has(item.id)) return;
                displayedIds.add(item.id);

                const isSoldOut = item.available === 0;
                const soldOutBadge = isSoldOut ? '<span style="background: #E53E3E; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">SOLD OUT</span>' : '';
                const itemStyle = isSoldOut ? 'opacity: 0.6; border-left: 3px solid #E53E3E;' : '';

                const div = document.createElement('div');
                div.className = 'admin-item';
                div.style.cssText = itemStyle;

                const info = document.createElement('div');
                const strong = document.createElement('strong');
                strong.innerHTML = `${item.name}${soldOutBadge}`;
                const p = document.createElement('p');
                p.textContent = `Current: ${item.available} ${item.unit || 'plates'}`;
                info.appendChild(strong);
                info.appendChild(p);

                const actions = document.createElement('div');
                actions.className = 'admin-actions';

                const inputQty = document.createElement('input');
                inputQty.type = 'number';
                inputQty.id = `qty-${item.id}`;
                inputQty.value = item.available;
                inputQty.min = 0;
                inputQty.style.width = '80px';

                const updateBtn = document.createElement('button');
                updateBtn.className = 'btn btn-primary btn-sm';
                updateBtn.textContent = 'Update';
                updateBtn.addEventListener('click', () => AdminModule.updateQuantity(item.id));

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-secondary btn-sm';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => AdminModule.deleteItem(item.id));

                actions.appendChild(inputQty);
                actions.appendChild(updateBtn);
                actions.appendChild(deleteBtn);

                div.appendChild(info);
                div.appendChild(actions);
                container.appendChild(div);
            });
        }
    }

    async function updateQuantity(itemId) {
        const newQty = parseInt(document.getElementById(`qty-${itemId}`).value);
        
        for (let cat in appData.foodData) {
            const item = appData.foodData[cat].find(i => i.id === itemId);
            if (item) {
                item.available = newQty;
            }
        }

        await saveData();
        alert('Quantity updated!');
    }

    async function deleteItem(itemId) {
        if (!await Confirm.confirm('Delete this item?')) return;

        for (let cat in appData.foodData) {
            appData.foodData[cat] = appData.foodData[cat].filter(i => i.id !== itemId);
        }

        await saveData();
        await loadData();
        renderInventory('inventoryList');
        alert('Item deleted!');
    }

    async function addFood(name, price, quantity, unit, categories) {
        let maxId = 0;
        for (let cat in appData.foodData) {
            appData.foodData[cat].forEach(i => {
                if (i.id > maxId) maxId = i.id;
            });
        }

        const newId = maxId + 1;
        categories.forEach(cat => {
            appData.foodData[cat].push({ 
                id: newId, 
                name, 
                price, 
                available: quantity, 
                unit 
            });
        });

        await saveData();
        return true;
    }

    function renderOrders(containerId, orders = null) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const ordersToRender = orders || appData.orderHistory;

        if (ordersToRender.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No orders yet</h3>
                    <p>Orders will appear here once customers start placing them</p>
                </div>
            `;
            return;
        }

        ordersToRender.forEach(order => {
            const div = document.createElement('div');
            div.className = 'order-card';

            // Header
            const header = document.createElement('div');
            header.className = 'order-header';
            const orderStrong = document.createElement('strong');
            orderStrong.textContent = `Order #${order.orderNumber}`;
            const headerRight = document.createElement('div');
            headerRight.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
            const totalSpan = document.createElement('span');
            totalSpan.textContent = `KSh ${order.total}`;
            const printBtn = document.createElement('button');
            printBtn.className = 'print-btn';
            printBtn.textContent = '🖨️ Print';
            printBtn.addEventListener('click', () => AdminModule.printReceipt(order.orderNumber));
            headerRight.appendChild(totalSpan);
            headerRight.appendChild(printBtn);
            header.appendChild(orderStrong);
            header.appendChild(headerRight);

            // Time
            const timeP = document.createElement('p');
            timeP.className = 'order-time';
            timeP.textContent = order.timestamp;

            // Items list
            const ul = document.createElement('ul');
            order.items.forEach(i => {
                const li = document.createElement('li');
                li.textContent = `${i.name} × ${i.quantity} = KSh ${i.total || (i.price * i.quantity)}`;
                ul.appendChild(li);
            });

            // Payment row
            const paymentRow = document.createElement('p');
            paymentRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;';
            const paymentLabel = document.createElement('strong');
            paymentLabel.textContent = 'Payment:';
            const badgeSpan = document.createElement('span');
            badgeSpan.className = `status-badge ${order.paymentStatus === 'Paid' ? 'paid' : 'pending'}`;
            badgeSpan.textContent = order.paymentStatus;
            const methodText = document.createTextNode(` ${order.paymentMethod} `);
            paymentRow.appendChild(paymentLabel);
            paymentRow.appendChild(document.createTextNode(' '));
            paymentRow.appendChild(methodText);
            paymentRow.appendChild(badgeSpan);

            if (order.mpesaPhone) {
                const phoneSpan = document.createElement('span');
                phoneSpan.style.cssText = 'color: #718096; font-size: 0.875rem;';
                phoneSpan.textContent = `(${order.mpesaPhone})`;
                paymentRow.appendChild(phoneSpan);
            }

            // Verify button for pending cash
            if ((order.paymentStatus === 'Pending Confirmation' || order.paymentStatus === 'Pending Verification') && order.paymentMethod === 'cash') {
                const verifyBtn = document.createElement('button');
                verifyBtn.className = 'btn btn-primary btn-sm verify-payment-btn';
                verifyBtn.style.marginLeft = '0.5rem';
                verifyBtn.textContent = '✓ Confirm Payment';
                verifyBtn.addEventListener('click', () => AdminModule.verifyPayment(order.orderNumber));
                paymentRow.appendChild(verifyBtn);
            } else if (order.paymentStatus === 'Pending Verification' && order.paymentMethod === 'mpesa') {
                const verifyBtn = document.createElement('button');
                verifyBtn.className = 'btn btn-primary btn-sm verify-payment-btn';
                verifyBtn.style.marginLeft = '0.5rem';
                verifyBtn.textContent = '✓ Verify M-Pesa';
                verifyBtn.addEventListener('click', () => AdminModule.verifyPayment(order.orderNumber));
                paymentRow.appendChild(verifyBtn);
            }

            div.appendChild(header);
            div.appendChild(timeP);
            div.appendChild(ul);
            div.appendChild(paymentRow);
            container.appendChild(div);
        });
    }

    function searchOrder(orderNumber) {
        const resultContainer = document.getElementById('orderSearchResult');
        
        if (!orderNumber || orderNumber.trim() === '') {
            resultContainer.innerHTML = '<p style="color: #E53E3E; padding: 1rem; background: #FED7D7; border-radius: 0.375rem;">Please enter an order number</p>';
            return;
        }

        const order = appData.orderHistory.find(o => 
            o.orderNumber.toLowerCase() === orderNumber.toLowerCase().trim()
        );

        if (!order) {
            resultContainer.innerHTML = `
                <div style="padding: 1.5rem; background: #FED7D7; border-radius: 0.375rem; border-left: 4px solid #E53E3E;">
                    <h4 style="color: #E53E3E; margin-bottom: 0.5rem;">❌ Order Not Found</h4>
                    <p style="color: #742A2A;">No order found with number: <strong>${orderNumber}</strong></p>
                </div>
            `;
            return;
        }

        // Order found - display verification card
        const itemsList = order.items.map(i => 
            `<li style="padding: 0.5rem 0; border-bottom: 1px solid #E2E8F0;">${i.name} × ${i.quantity} = KSh ${i.total || (i.price * i.quantity)}</li>`
        ).join('');

        const isPaid = order.paymentStatus === 'Paid';
        const statusColor = isPaid ? '#2E3192' : '#F59E0B';
        const statusBg = isPaid ? '#EDE7F6' : '#FEF3C7';
        const statusIcon = isPaid ? '✅' : '⏳';

        resultContainer.innerHTML = `
            <div style="padding: 1.5rem; background: ${statusBg}; border-radius: 0.375rem; border-left: 4px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="color: ${statusColor}; margin-bottom: 0.5rem;">${statusIcon} Order Found</h4>
                        <p style="font-size: 1.25rem; font-weight: 700; color: #2D3748;">Order #${order.orderNumber}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${statusColor};">KSh ${order.total}</div>
                        <div style="background: ${statusColor}; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; margin-top: 0.5rem; font-weight: 600;">
                            ${order.paymentStatus}
                        </div>
                    </div>
                </div>
                
                <div style="background: white; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <p style="color: #718096; font-size: 0.875rem; margin-bottom: 0.5rem;">Order Time: ${order.timestamp}</p>
                    <p style="color: #718096; font-size: 0.875rem; margin-bottom: 1rem;">
                        Payment Method: <strong>${order.paymentMethod}</strong>
                        ${order.mpesaPhone ? ` | Phone: <strong>${order.mpesaPhone}</strong>` : ''}
                    </p>
                    <h5 style="margin-bottom: 0.5rem; color: #2D3748;">Order Items:</h5>
                    <ul style="list-style: none; padding: 0;">${itemsList}</ul>
                </div>

                ${isPaid ? 
                    '<p style="color: #2E3192; font-weight: 600; text-align: center;">✓ Payment Paid - Order can be fulfilled</p>' : 
                    `<div style="text-align: center;">
                        <p style="color: #F59E0B; font-weight: 600; margin-bottom: 1rem;">⚠ Payment Pending - Verify payment before fulfilling order</p>
                        ${order.paymentMethod === 'cash' ? 
                            `<button class="btn btn-primary verify-payment-btn order-search-verify" data-order-number="${order.orderNumber}" style="padding: 0.75rem 2rem; font-size: 1rem;">
                                ✓ Mark as Paid (Cash Received)
                            </button>` : 
                            '<p style="color: #718096; font-size: 0.875rem;">Waiting for M-Pesa confirmation...</p>'
                        }
                    </div>`
                }
            </div>
        `;

        // Attach event listener to search result verify button (CSP-safe)
        const searchVerifyBtn = resultContainer.querySelector('.order-search-verify');
        if (searchVerifyBtn) {
            searchVerifyBtn.addEventListener('click', () => verifyPayment(searchVerifyBtn.getAttribute('data-order-number')));
        }
    }

    function clearOrderSearch() {
        document.getElementById('orderSearchInput').value = '';
        document.getElementById('orderSearchResult').innerHTML = '';
    }

    function renderAnalytics(containerId) {
        const container = document.getElementById(containerId);
        
        if (appData.orderHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <h3>No analytics data yet</h3>
                    <p>Statistics will appear once orders are placed</p>
                </div>
            `;
            return;
        }

        const totalOrders = appData.orderHistory.length;
        const totalRevenue = appData.orderHistory.reduce((sum, o) => sum + o.total, 0);
        const avgOrder = Math.round(totalRevenue / totalOrders);
        const paidOrders = appData.orderHistory.filter(o => o.paymentStatus === 'Paid').length;
        const pendingOrders = totalOrders - paidOrders;
        const paidPercentage = Math.round((paidOrders / totalOrders) * 100);
        const paidDegrees = (paidPercentage / 100) * 360;

        // Calculate category sales
        const categorySales = { breakfast: 0, lunch: 0, snacks: 0 };
        appData.orderHistory.forEach(order => {
            order.items.forEach(item => {
                for (let cat in appData.foodData) {
                    if (appData.foodData[cat].find(f => f.id === item.id)) {
                        categorySales[cat] = (categorySales[cat] || 0) + (item.total || item.price * item.quantity);
                    }
                }
            });
        });

        const maxSales = Math.max(...Object.values(categorySales));

        // Calculate best-selling items
        const itemSales = {};
        appData.orderHistory.forEach(order => {
            order.items.forEach(item => {
                if (!itemSales[item.name]) {
                    itemSales[item.name] = { quantity: 0, revenue: 0 };
                }
                itemSales[item.name].quantity += item.quantity;
                itemSales[item.name].revenue += (item.total || item.price * item.quantity);
            });
        });
        const bestSellers = Object.entries(itemSales)
            .sort((a, b) => b[1].quantity - a[1].quantity)
            .slice(0, 5);

        // Calculate peak hours
        const hourCounts = {};
        appData.orderHistory.forEach(order => {
            const hour = new Date(order.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        const peakHourDisplay = peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0]) + 1}:00` : 'N/A';

        // Low stock alerts
        const lowStockItems = [];
        for (let cat in appData.foodData) {
            appData.foodData[cat].forEach(item => {
                if (item.available <= 10 && item.available > 0) {
                    lowStockItems.push({ ...item, category: cat });
                } else if (item.available === 0) {
                    lowStockItems.unshift({ ...item, category: cat, outOfStock: true });
                }
            });
        }

        container.innerHTML = `
            <!-- Low Stock Alerts (Priority) -->
            ${lowStockItems.length > 0 ? `
                <div class="chart-container" style="border-left: 4px solid #E53E3E; background: linear-gradient(90deg, #FED7D7 0%, white 100%);">
                    <h3 class="chart-title" style="color: #E53E3E;">⚠️ Inventory Alerts (${lowStockItems.length})</h3>
                    <div style="display: grid; gap: 0.75rem;">
                        ${lowStockItems.slice(0, 5).map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border-radius: 0.5rem; border-left: 3px solid ${item.outOfStock ? '#E53E3E' : '#F59E0B'};">
                                <div>
                                    <strong style="color: #2D3748;">${item.name}</strong>
                                    <span style="color: #718096; font-size: 0.875rem; margin-left: 0.5rem;">(${item.category})</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; color: ${item.outOfStock ? '#E53E3E' : '#F59E0B'};">
                                        ${item.outOfStock ? '❌ OUT OF STOCK' : `⚠️ ${item.available} ${item.unit} left`}
                                    </div>
                                    <div style="font-size: 0.75rem; color: #718096;">
                                        ${item.outOfStock ? 'Restock immediately' : 'Low stock warning'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Stats Cards -->
            <div class="analytics-grid">
                <div class="stat-card">
                    <h3>${totalOrders}</h3>
                    <p>Total Orders</p>
                </div>
                <div class="stat-card">
                    <h3>KSh ${totalRevenue.toLocaleString()}</h3>
                    <p>Total Revenue</p>
                </div>
                <div class="stat-card">
                    <h3>KSh ${avgOrder.toLocaleString()}</h3>
                    <p>Average Order</p>
                </div>
                <div class="stat-card">
                    <h3>${paidPercentage}%</h3>
                    <p>Payment Rate</p>
                </div>
                <div class="stat-card">
                    <h3>${peakHourDisplay}</h3>
                    <p>Peak Order Time</p>
                </div>
                <div class="stat-card">
                    <h3>${lowStockItems.length}</h3>
                    <p>Low Stock Items</p>
                </div>
            </div>

            <!-- Best Selling Items -->
            <div class="chart-container">
                <h3 class="chart-title">🏆 Top 5 Best-Selling Items</h3>
                <div style="display: grid; gap: 1rem;">
                    ${bestSellers.map(([name, data], index) => {
                        const maxRevenue = bestSellers[0][1].revenue;
                        const percentage = (data.revenue / maxRevenue) * 100;
                        return `
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="font-size: 1.5rem; font-weight: 800; color: #2E3192; min-width: 30px;">
                                    ${index + 1}
                                </div>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                        <strong style="color: #2D3748;">${name}</strong>
                                        <span style="color: #2E3192; font-weight: 700;">KSh ${data.revenue.toLocaleString()}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="flex: 1; height: 12px; background: #E2E8F0; border-radius: 1rem; overflow: hidden;">
                                            <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #2E3192, #00BCD4); border-radius: 1rem; transition: width 1s ease;"></div>
                                        </div>
                                        <span style="color: #718096; font-size: 0.875rem; min-width: 80px;">${data.quantity} sold</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Payment Status Donut Chart -->
            <div class="chart-container">
                <h3 class="chart-title">Payment Status Distribution</h3>
                <div class="donut-chart">
                    <div class="donut" style="--paid-deg: ${paidDegrees}deg;">
                        <div class="donut-center">
                            <div class="donut-value">${paidPercentage}%</div>
                            <div class="donut-label">Paid</div>
                        </div>
                    </div>
                    <div class="donut-legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #2E3192;"></div>
                            <div class="legend-text">
                                <div class="legend-name">Paid Orders</div>
                                <div class="legend-value">${paidOrders} orders (${paidPercentage}%)</div>
                            </div>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #F59E0B;"></div>
                            <div class="legend-text">
                                <div class="legend-name">Pending Orders</div>
                                <div class="legend-value">${pendingOrders} orders (${100 - paidPercentage}%)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Category Sales Bar Chart -->
            <div class="chart-container">
                <h3 class="chart-title">Sales by Category</h3>
                <div class="bar-chart">
                    <div class="bar-item">
                        <div class="bar" style="height: ${(categorySales.breakfast / maxSales) * 200}px;">
                            <div class="bar-value">KSh ${categorySales.breakfast.toLocaleString()}</div>
                        </div>
                        <div class="bar-label">🌅 Breakfast</div>
                    </div>
                    <div class="bar-item">
                        <div class="bar" style="height: ${(categorySales.lunch / maxSales) * 200}px;">
                            <div class="bar-value">KSh ${categorySales.lunch.toLocaleString()}</div>
                        </div>
                        <div class="bar-label">🍛 Lunch</div>
                    </div>
                    <div class="bar-item">
                        <div class="bar" style="height: ${(categorySales.snacks / maxSales) * 200}px;">
                            <div class="bar-value">KSh ${categorySales.snacks.toLocaleString()}</div>
                        </div>
                        <div class="bar-label">🍪 Snacks</div>
                    </div>
                </div>
            </div>

            <!-- Payment Method Progress Chart -->
            <div class="chart-container">
                <h3 class="chart-title">💳 Payment Methods</h3>
                <div class="progress-chart">
                    ${generatePaymentMethodChart()}
                </div>
            </div>

            <!-- Inventory Prediction -->
            <div class="chart-container">
                <h3 class="chart-title">📦 Inventory Insights & Predictions</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${generateInventoryPredictions()}
                </div>
            </div>

            <!-- Business Insights -->
            <div class="chart-container">
                <h3 class="chart-title">💡 Business Insights</h3>
                <div style="display: grid; gap: 1rem;">
                    ${generateBusinessInsights()}
                </div>
            </div>
        `;

        function generatePaymentMethodChart() {
            const methods = {};
            appData.orderHistory.forEach(order => {
                methods[order.paymentMethod] = (methods[order.paymentMethod] || 0) + 1;
            });

            return Object.entries(methods).map(([method, count]) => {
                const percentage = Math.round((count / totalOrders) * 100);
                return `
                    <div class="progress-item">
                        <div class="progress-label">
                            <span>${method === 'mpesa' ? '📱 M-Pesa' : '💵 Cash'}</span>
                            <span>${count} orders (${percentage}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${percentage}%;">
                                ${percentage}%
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function generateInventoryPredictions() {
            const predictions = [];
            
            // Calculate average daily sales per item
            const itemDailySales = {};
            appData.orderHistory.forEach(order => {
                order.items.forEach(item => {
                    itemDailySales[item.name] = (itemDailySales[item.name] || 0) + item.quantity;
                });
            });

            // Predict days until stockout
            for (let cat in appData.foodData) {
                appData.foodData[cat].forEach(item => {
                    const dailySales = itemDailySales[item.name] || 0;
                    if (dailySales > 0 && item.available > 0) {
                        const daysLeft = Math.floor(item.available / dailySales);
                        if (daysLeft <= 7) {
                            predictions.push({
                                name: item.name,
                                daysLeft,
                                available: item.available,
                                dailySales,
                                unit: item.unit
                            });
                        }
                    }
                });
            }

            predictions.sort((a, b) => a.daysLeft - b.daysLeft);

            if (predictions.length === 0) {
                return '<p style="color: #718096; text-align: center; padding: 2rem;">All items have sufficient stock for the week ahead! ✅</p>';
            }

            return predictions.slice(0, 6).map(pred => `
                <div style="padding: 1.25rem; background: ${pred.daysLeft <= 2 ? '#FED7D7' : '#FEF3C7'}; border-radius: 0.75rem; border-left: 4px solid ${pred.daysLeft <= 2 ? '#E53E3E' : '#F59E0B'};">
                    <div style="font-weight: 700; color: #2D3748; margin-bottom: 0.5rem;">${pred.name}</div>
                    <div style="font-size: 0.875rem; color: #718096; margin-bottom: 0.75rem;">
                        Current: ${pred.available} ${pred.unit} | Avg: ${pred.dailySales}/day
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="font-size: 1.5rem;">${pred.daysLeft <= 2 ? '🔴' : '🟡'}</div>
                        <div>
                            <div style="font-weight: 700; color: ${pred.daysLeft <= 2 ? '#E53E3E' : '#F59E0B'};">
                                ~${pred.daysLeft} day${pred.daysLeft !== 1 ? 's' : ''} left
                            </div>
                            <div style="font-size: 0.75rem; color: #718096;">
                                ${pred.daysLeft <= 2 ? 'Restock urgently!' : 'Plan restock soon'}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function generateBusinessInsights() {
            const insights = [];

            // Revenue trend
            const revenuePerOrder = totalRevenue / totalOrders;
            if (revenuePerOrder > 100) {
                insights.push({
                    icon: '📈',
                    title: 'High Average Order Value',
                    message: `Your average order is KSh ${avgOrder.toLocaleString()}, which is excellent! Customers are buying multiple items.`,
                    type: 'success'
                });
            }

            // Payment preference
            const mpesaOrders = appData.orderHistory.filter(o => o.paymentMethod === 'mpesa').length;
            const mpesaPercentage = Math.round((mpesaOrders / totalOrders) * 100);
            if (mpesaPercentage > 60) {
                insights.push({
                    icon: '📱',
                    title: 'Digital Payment Preference',
                    message: `${mpesaPercentage}% of customers prefer M-Pesa. Consider promoting digital payments further.`,
                    type: 'info'
                });
            }

            // Best category
            const categorySales = { breakfast: 0, lunch: 0, snacks: 0 };
            appData.orderHistory.forEach(order => {
                order.items.forEach(item => {
                    for (let cat in appData.foodData) {
                        if (appData.foodData[cat].find(f => f.id === item.id)) {
                            categorySales[cat] = (categorySales[cat] || 0) + (item.total || item.price * item.quantity);
                        }
                    }
                });
            });
            const bestCategory = Object.entries(categorySales).sort((a, b) => b[1] - a[1])[0];
            insights.push({
                icon: '🏆',
                title: 'Top Performing Category',
                message: `${bestCategory[0].charAt(0).toUpperCase() + bestCategory[0].slice(1)} generates the most revenue (KSh ${bestCategory[1].toLocaleString()}). Focus on expanding this category.`,
                type: 'success'
            });

            // Low stock warning count
            if (lowStockItems.length > 5) {
                insights.push({
                    icon: '⚠️',
                    title: 'Inventory Management Alert',
                    message: `${lowStockItems.length} items need restocking. Review inventory tab to prevent stockouts.`,
                    type: 'warning'
                });
            }

            return insights.map(insight => `
                <div style="display: flex; gap: 1rem; padding: 1.25rem; background: ${
                    insight.type === 'success' ? '#F0FFF4' : 
                    insight.type === 'warning' ? '#FEF3C7' : '#EBF8FF'
                }; border-radius: 0.75rem; border-left: 4px solid ${
                    insight.type === 'success' ? '#48BB78' : 
                    insight.type === 'warning' ? '#F59E0B' : '#00BCD4'
                };">
                    <div style="font-size: 2rem;">${insight.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #2D3748; margin-bottom: 0.25rem;">${insight.title}</div>
                        <div style="color: #4A5568; font-size: 0.875rem;">${insight.message}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    function printReceipt(orderNumber) {
        const order = appData.orderHistory.find(o => o.orderNumber === orderNumber);
        if (!order) return;

        const itemsList = order.items.map(i => 
            `${i.name} × ${i.quantity} = KSh ${i.total || (i.price * i.quantity)}`
        ).join('\n');

        const receiptContent = `
            <div class="print-area" style="padding: 2rem; font-family: monospace;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2>🍽️ THARAKA UNIVERSITY CAFETERIA</h2>
                    <p>Official Receipt</p>
                </div>
                <hr style="margin: 1rem 0;">
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Date:</strong> ${order.timestamp}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Status:</strong> ${order.paymentStatus}</p>
                ${order.mpesaPhone ? `<p><strong>Phone:</strong> ${order.mpesaPhone}</p>` : ''}
                <hr style="margin: 1rem 0;">
                <h3>Items:</h3>
                <pre style="white-space: pre-wrap;">${itemsList}</pre>
                <hr style="margin: 1rem 0;">
                <h3 style="text-align: right;">TOTAL: KSh ${order.total}</h3>
                <hr style="margin: 1rem 0;">
                <p style="text-align: center; margin-top: 2rem;">Thank you for your order!</p>
                <p style="text-align: center;">Education for Freedom</p>
            </div>
        `;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Receipt - ' + orderNumber + '</title>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(receiptContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }

    function renderAdmins(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (!appData.adminAccounts || appData.adminAccounts.length === 0) {
            container.innerHTML = '<p class="no-items">No admins found</p>';
            return;
        }

        const currentAdmin = AuthModule.getCurrentAdmin();
        const currentAdminUsername = currentAdmin ? currentAdmin.username : null;

        appData.adminAccounts.forEach(admin => {
            const div = document.createElement('div');
            div.className = 'admin-item';

            const statusBadge = admin.active
                ? '● Active'
                : '● Inactive';

            const info = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = admin.username;
            const p = document.createElement('p');
            p.style.margin = '0';
            const roleLabel = admin.roleName || admin.role || 'Unknown';
            p.innerHTML = `${roleLabel} <span style="color: ${admin.active ? '#2E3192' : '#718096'}; font-weight: ${admin.active ? 600 : 400};">${statusBadge}</span> ${admin.username === currentAdminUsername ? '(You)' : ''}`;
            info.appendChild(strong);
            info.appendChild(p);

            const actions = document.createElement('div');
            actions.className = 'admin-actions';

            if (admin.username !== currentAdminUsername) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-secondary btn-sm';
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', () => AdminModule.removeAdmin(admin.username));
                actions.appendChild(removeBtn);
            }

            div.appendChild(info);
            div.appendChild(actions);
            container.appendChild(div);
        });
    }

    async function addAdmin(username, password, role) {
        if (!AuthModule.isSuperAdmin()) {
            throw new Error('Only Super Admin can add staff accounts');
        }

        if (!appData.adminAccounts) {
            appData.adminAccounts = [];
        }

        // Check if username already exists
        const exists = appData.adminAccounts.find(a => a.username === username);
        if (exists) {
            throw new Error('Username already exists');
        }

        const allowedRoles = new Set(['Staff', 'Manager']);
        if (!allowedRoles.has(role)) {
            throw new Error('Only Staff and Manager roles can be assigned here');
        }

        const newAdmin = {
            username,
            password,
            role,
            active: true,
            createdAt: new Date().toLocaleString(),
            lastLogin: null
        };

        appData.adminAccounts.push(newAdmin);
        await saveData();
        await loadData();
        return true;
    }

    async function removeAdmin(adminUsername) {
        if (!await Confirm.confirm('Are you sure you want to remove this admin?')) return;

        const currentAdmin = AuthModule.getCurrentAdmin();
        if (currentAdmin && adminUsername === currentAdmin.username) {
            alert('You cannot remove yourself!');
            return;
        }

        appData.adminAccounts = appData.adminAccounts.filter(a => a.username !== adminUsername);
        await saveData();
        await loadData();
        renderAdmins('adminsList');
        alert('Admin removed successfully!');
    }

    // Verify payment for cash orders
    async function verifyPayment(orderNumber) {
        const order = appData.orderHistory.find(o => o.orderNumber === orderNumber);
        
        if (!order) {
            alert('Order not found!');
            return;
        }
        
        if (order.paymentStatus === 'Paid') {
            alert('This order is already marked as paid.');
            return;
        }
        
        const message = order.paymentMethod === 'cash' 
            ? `Confirm that you have received KSh ${order.total} in CASH from the customer?`
            : `Verify M-Pesa payment of KSh ${order.total} from ${order.mpesaPhone}?`;
        
        if (!await Confirm.confirm(message)) {
            return;
        }
        
        try {
            // Require auth token
            const token = AuthModule.getToken();
            if (!token) {
                alert('Authentication required. Please log in again.');
                return;
            }

            // Use API to verify payment
            const response = await fetch(`/api/orders/${orderNumber}/payment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paymentStatus: 'Paid' })
            });

            if (!response.ok) {
                // Try to show server-provided error details when available
                try {
                    const err = await response.json();
                    throw new Error(err.error || err.message || `HTTP ${response.status}`);
                } catch (parseErr) {
                    throw new Error(`Failed to verify payment (status ${response.status})`);
                }
            }

            const result = await response.json();

            if (result && result.order) {
                order.paymentStatus = result.order.paymentStatus || 'Paid';
            } else {
                order.paymentStatus = 'Paid';
            }

            await loadData();
            // Refresh the orders display from current appData
            renderOrders('ordersList');

            alert(`✓ Payment confirmed!\\n\\nOrder #${orderNumber} is now PAID.\\nTotal: KSh ${order.total}`);
        } catch (error) {
            console.error('Error verifying payment:', error);
            alert('Failed to verify payment. ' + (error && error.message ? error.message : 'Please try again.'));
        }
    }

    // Loyalty management removed from admin UI

    // ===== ROLE & ACCESS MANAGEMENT =====

    async function renderRoles() {
        const container = document.getElementById('rolesList');
        if (!container) return;

        container.innerHTML = '<div class="admin-spinner"></div>';
        try {
            const token = AuthModule.getToken();
            const response = await fetch('/api/admin/roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const roles = data.roles || [];

            let html = '<div style="display: grid; gap: 1rem;">';
            roles.forEach(role => {
                html += `
                    <div class="admin-card" style="margin-bottom: 0;">
                        <h4 style="color: #2D3748; margin: 0 0 0.5rem 0;">${role.name}</h4>
                        <p style="color: #718096; margin: 0 0 0.75rem 0; font-size: 0.875rem;">${role.description}</p>
                        <details style="font-size: 0.875rem; color: #4A5568;">
                            <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem;">View Permissions (${role.permissions.length})</summary>
                            <ul style="margin: 0.5rem 0 0 1.5rem;">
                                ${role.permissions.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </details>
                    </div>
                `;
            });
            html += '</div>';

            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        }
    }

    async function renderActivityLog(limit = 50) {
        const container = document.getElementById('activityLog');
        if (!container) return;

        container.innerHTML = '<div class="admin-spinner"></div>';
        try {
            const token = AuthModule.getToken();
            const response = await fetch(`/api/admin/activity-log?limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const logs = data.activityLog || [];

            if (logs.length === 0) {
                container.innerHTML = '<p>No activity logged yet</p>';
                return;
            }

            let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">';
            html += '<tr><th>Time</th><th>Admin</th><th>Action</th><th>Details</th></tr>';
            logs.forEach(log => {
                const details = log.details ? Object.keys(log.details).map(k => `${k}: ${log.details[k]}`).join(', ') : '-';
                html += `<tr style="border-bottom: 1px solid #E2E8F0;">
                    <td>${log.timestamp}</td>
                    <td><strong>${log.username}</strong></td>
                    <td>${log.action}</td>
                    <td style="color: #718096; font-size: 0.75rem;">${details}</td>
                </tr>`;
            });
            html += '</table>';

            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        }
    }

    return {
        loadData,
        saveData,
        renderInventory,
        updateQuantity,
        deleteItem,
        addFood,
        renderOrders,
        renderAnalytics,
        renderAdmins,
        addAdmin,
        removeAdmin,
        renderPOSMenu,
        addToPOSCart,
        removePOSItem,
        updatePOSQuantity,
        renderPOSCart,
        placePOSOrder,
        clearPOSOrder,
        searchOrder,
        clearOrderSearch,
        printReceipt,
        verifyPayment,
        
        renderRoles,
        renderActivityLog
    };
})();
