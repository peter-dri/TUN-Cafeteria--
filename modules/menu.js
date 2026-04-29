// Menu Module - Display menu items
const MenuModule = (() => {
    let menuData = {};
    
    function render(menu) {
        menuData = menu;
        renderCategory('breakfast', menu.breakfast);
        renderCategory('lunch', menu.lunch);

        if (window.OrderingHoursModule && typeof OrderingHoursModule.refresh === 'function') {
            OrderingHoursModule.refresh();
        }
    }

    function renderCategory(category, items) {
        const container = document.getElementById(category + 'Menu');
        if (!container) {
            console.warn(`Container not found: ${category}Menu`);
            return;
        }

        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = '<p class="no-items">No items available</p>';
            return;
        }

        // Filter only available items
        const availableItems = items.filter(item => item.available > 0);

        if (availableItems.length === 0) {
            container.innerHTML = '<p class="no-items">All items sold out</p>';
            return;
        }

        console.log(`Rendering ${category}: ${availableItems.length} items`);
        availableItems.forEach(item => {
            const card = createItemCard(item);
            container.appendChild(card);
        });
    }

    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'menu-item';
        card.setAttribute('data-item-id', item.id);
        
        card.innerHTML = `
            <h3>${item.name}</h3>
            <p class="price">KSh ${item.price}</p>
            <p class="stock" id="stock-${item.id}">${item.available} ${item.unit || 'available'}</p>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <button id="add-btn-${item.id}" class="btn btn-primary btn-sm">
                    Add to Cart
                </button>
            </div>
        `;

        // Add event listeners instead of inline onclick
        const button = card.querySelector(`#add-btn-${item.id}`);
        button.addEventListener('click', () => {
            console.log('Add button clicked for item:', { id: item.id, name: item.name, price: item.price, available: item.available });
            CartModule.add(item.id, item.name, item.price, item.available);
        });

        // Note: Quick Order button intentionally removed for Student UI.

        return card;
    }

    function updateButtonState(itemId, cartQuantity, available) {
        const button = document.getElementById(`add-btn-${itemId}`);
        const stockDisplay = document.getElementById(`stock-${itemId}`);
        
        if (button) {
            if (cartQuantity >= available) {
                button.disabled = true;
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.textContent = 'Max in Cart';
            } else {
                button.disabled = false;
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                button.textContent = 'Add to Cart';
            }
        }

        if (stockDisplay) {
            const remaining = available - cartQuantity;
            stockDisplay.textContent = `${remaining} ${stockDisplay.textContent.split(' ').slice(1).join(' ')}`;
        }
    }

    return {
        render,
        updateButtonState
    };
})();
