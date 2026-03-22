// Cart Module - Shopping cart functionality
const CartModule = (() => {
    let items = [];

    function init() {
        console.log('CartModule initialized');
        updateCount();
    }

    function add(id, name, price, available) {
        console.log('CartModule.add() called:', { id, name, price, available });
        
        // Validate inputs
        if (!id || !name || !price) {
            console.error('Invalid item data:', { id, name, price, available });
            showNotification('Error adding item to cart');
            return;
        }
        
        const existing = items.find(item => item.id === id);
        
        if (existing) {
            // Check if we can add more
            if (existing.quantity >= available) {
                showNotification(`Cannot add more ${name} - only ${available} available!`);
                return;
            }
            existing.quantity++;
        } else {
            items.push({ id, name, price, quantity: 1, available });
        }

        updateCount();
        showNotification(`✅ ${name} added to cart!`);
        console.log('Cart items:', items);
        
        // Update button state
        const cartItem = items.find(item => item.id === id);
        if (cartItem && typeof MenuModule !== 'undefined') {
            MenuModule.updateButtonState(id, cartItem.quantity, available);
        }
    }

    function remove(id) {
        const item = items.find(item => item.id === id);
        items = items.filter(item => item.id !== id);
        updateCount();
        show(); // Refresh cart display
        
        // Update button state when item removed
        if (item && typeof MenuModule !== 'undefined') {
            MenuModule.updateButtonState(id, 0, item.available);
        }
    }

    function updateQuantity(id, change) {
        const item = items.find(item => item.id === id);
        if (item) {
            const newQuantity = item.quantity + change;
            
            // Check if exceeding available
            if (newQuantity > item.available) {
                showNotification(`Cannot add more - only ${item.available} available!`);
                return;
            }
            
            item.quantity = newQuantity;
            if (item.quantity <= 0) {
                remove(id);
            } else {
                show(); // Refresh cart display
                // Update button state
                if (typeof MenuModule !== 'undefined') {
                    MenuModule.updateButtonState(id, item.quantity, item.available);
                }
            }
        }
        updateCount();
    }

    function updateCount() {
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cartCount').textContent = count;
    }

    function getTotal() {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function getItems() {
        return items;
    }

    function clear() {
        // Update all button states before clearing
        if (typeof MenuModule !== 'undefined') {
            items.forEach(item => {
                MenuModule.updateButtonState(item.id, 0, item.available);
            });
        }
        items = [];
        updateCount();
    }

    function show() {
        const modal = document.getElementById('cartModal');
        const container = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>Add some delicious items from our menu!</p>
                </div>
            `;
            totalEl.textContent = '0';
        } else {
            container.innerHTML = '';
            items.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'cart-item';

                    const info = document.createElement('div');
                    info.className = 'cart-item-info';
                    info.innerHTML = `
                        <strong>${item.name}</strong>
                        <p>KSh ${item.price} × ${item.quantity} = KSh ${item.price * item.quantity}</p>
                    `;

                    const actions = document.createElement('div');
                    actions.className = 'cart-item-actions';

                    const btnMinus = document.createElement('button');
                    btnMinus.className = 'btn-icon';
                    btnMinus.textContent = '-';
                    btnMinus.addEventListener('click', () => updateQuantity(item.id, -1));

                    const qtySpan = document.createElement('span');
                    qtySpan.textContent = item.quantity;

                    const btnPlus = document.createElement('button');
                    btnPlus.className = 'btn-icon';
                    btnPlus.textContent = '+';
                    btnPlus.addEventListener('click', () => updateQuantity(item.id, 1));

                    const btnRemove = document.createElement('button');
                    btnRemove.className = 'btn btn-sm';
                    btnRemove.textContent = 'Remove';
                    btnRemove.addEventListener('click', () => remove(item.id));

                    actions.appendChild(btnMinus);
                    actions.appendChild(qtySpan);
                    actions.appendChild(btnPlus);
                    actions.appendChild(btnRemove);

                    itemEl.appendChild(info);
                    itemEl.appendChild(actions);
                    container.appendChild(itemEl);
            });
            totalEl.textContent = getTotal();
        }

        modal.style.display = 'flex';
    }

    function showNotification(message) {
        console.log('Showing notification:', message);
        
        // Check if toast container exists
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.warn('Toast container not found, creating one');
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(toastContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            font-weight: 500;
            min-width: 250px;
        `;
        
        toastContainer.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    return {
        init,
        add,
        remove,
        updateQuantity,
        show,
        clear,
        getItems,
        getTotal
    };
})();
