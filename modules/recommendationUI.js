// Recommendation UI Module - Handles rendering recommendations
const RecommendationUI = (() => {
    
    // Render personalized recommendations section
    function renderPersonalizedSection(recommendations) {
        const container = document.getElementById('recommendationsSection');
        if (!container) return;
        
        if (!recommendations || recommendations.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        container.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'recommendations-header';
        header.innerHTML = '<h2>✨ Recommended for You</h2><p>Based on your preferences and popular choices</p>';

        const scroll = document.createElement('div');
        scroll.className = 'recommendations-scroll';
        scroll.id = 'recommendationsScroll';

        recommendations.forEach(rec => {
            const card = createRecommendationElement(rec);
            scroll.appendChild(card);
        });

        container.appendChild(header);
        container.appendChild(scroll);
    }
    
    // Create recommendation card element
    function createRecommendationElement(recommendation) {
        const item = recommendation.item;
        const matchingTags = getMatchingPreferenceTags(item);

        const card = document.createElement('div');
        card.className = 'recommendation-card';
        card.setAttribute('data-item-id', item.id);

        const badge = document.createElement('div');
        badge.className = 'rec-badge';
        badge.textContent = getRecommendationIcon(recommendation.strategy);
        card.appendChild(badge);

        if (matchingTags.length > 0) {
            const tagsWrap = document.createElement('div');
            tagsWrap.className = 'rec-tags';
            matchingTags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag-badge';
                span.textContent = tag;
                tagsWrap.appendChild(span);
            });
            card.appendChild(tagsWrap);
        }

        const h3 = document.createElement('h3');
        h3.textContent = item.name;
        card.appendChild(h3);

        const priceP = document.createElement('p');
        priceP.className = 'price';
        priceP.textContent = `KSh ${item.price}`;
        card.appendChild(priceP);

        const reasonP = document.createElement('p');
        reasonP.className = 'rec-reason';
        reasonP.textContent = recommendation.reason;
        card.appendChild(reasonP);

        const stockP = document.createElement('p');
        stockP.className = 'stock';
        stockP.textContent = `${item.available} ${item.unit} available`;
        card.appendChild(stockP);

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary btn-sm';
        addBtn.textContent = 'Add to Cart';
        addBtn.addEventListener('click', () => addRecommendedItem(item.id, item.name, item.price, item.available, recommendation.strategy));
        card.appendChild(addBtn);

        return card;
    }
    
    // Get icon based on recommendation strategy
    function getRecommendationIcon(strategy) {
        const icons = {
            'collaborative': '👥',
            'contentBased': '🎯',
            'popularity': '🔥',
            'category': '📂'
        };
        return icons[strategy] || '⭐';
    }
    
    // Get matching preference tags for an item
    function getMatchingPreferenceTags(item) {
        const userPrefs = UserProfileManager.getPreferences();
        const matchingTags = [];
        
        if (item.tags) {
            if (userPrefs.dietary) {
                item.tags.forEach(tag => {
                    if (userPrefs.dietary.includes(tag)) {
                        matchingTags.push(tag);
                    }
                });
            }
            if (userPrefs.taste) {
                item.tags.forEach(tag => {
                    if (userPrefs.taste.includes(tag)) {
                        matchingTags.push(tag);
                    }
                });
            }
        }
        
        return matchingTags;
    }
    
    // Add recommended item to cart (with tracking)
    function addRecommendedItem(id, name, price, available, strategy) {
        // Track the interaction
        UserProfileManager.recordInteraction(id, 'click_recommendation');
        
        // Track in analytics
        if (typeof RecommendationAnalytics !== 'undefined') {
            RecommendationAnalytics.trackRecommendationClicked(UserProfileManager.getUserId(), id);
        }
        
        // Add to cart
        CartModule.add(id, name, price, available);
    }
    
    // Render preference settings modal
    function renderPreferenceSettings() {
        const currentPrefs = UserProfileManager.getPreferences();
        
        const modal = document.getElementById('preferencesModal');
        if (!modal) return;
        
        const content = document.getElementById('preferencesContent');
        content.innerHTML = `
            <h3>Your Food Preferences</h3>
            <p>Help us recommend items you'll love!</p>
            
            <div class="pref-section">
                <h4>Dietary Preferences</h4>
                <div class="pref-options">
                    <label class="pref-checkbox">
                        <input type="checkbox" value="vegetarian" ${currentPrefs.dietary?.includes('vegetarian') ? 'checked' : ''}>
                        <span>🥗 Vegetarian</span>
                    </label>
                    <label class="pref-checkbox">
                        <input type="checkbox" value="vegan" ${currentPrefs.dietary?.includes('vegan') ? 'checked' : ''}>
                        <span>🌱 Vegan</span>
                    </label>
                    <label class="pref-checkbox">
                        <input type="checkbox" value="halal" ${currentPrefs.dietary?.includes('halal') ? 'checked' : ''}>
                        <span>☪️ Halal</span>
                    </label>
                </div>
            </div>
            
            <div class="pref-section">
                <h4>Taste Preferences</h4>
                <div class="pref-options">
                    <label class="pref-checkbox">
                        <input type="checkbox" value="spicy" ${currentPrefs.taste?.includes('spicy') ? 'checked' : ''}>
                        <span>🌶️ Spicy</span>
                    </label>
                    <label class="pref-checkbox">
                        <input type="checkbox" value="sweet" ${currentPrefs.taste?.includes('sweet') ? 'checked' : ''}>
                        <span>🍯 Sweet</span>
                    </label>
                    <label class="pref-checkbox">
                        <input type="checkbox" value="savory" ${currentPrefs.taste?.includes('savory') ? 'checked' : ''}>
                        <span>🧂 Savory</span>
                    </label>
                </div>
            </div>
            
            <div class="pref-section">
                <h4>Price Range</h4>
                <div class="price-range">
                    <label>
                        Min: KSh <input type="number" id="minPrice" value="${currentPrefs.priceRange?.min || 0}" min="0" step="10">
                    </label>
                    <label>
                        Max: KSh <input type="number" id="maxPrice" value="${currentPrefs.priceRange?.max || 200}" min="0" step="10">
                    </label>
                </div>
            </div>
            
            <div class="pref-actions">
                <button class="btn btn-secondary pref-cancel">Cancel</button>
                <button class="btn btn-primary pref-save">Save Preferences</button>
            </div>
        `;
        
        modal.style.display = 'flex';

        // Attach listeners to preference action buttons (CSP-safe)
        const cancelBtn = content.querySelector('.pref-cancel');
        const saveBtn = content.querySelector('.pref-save');
        if (cancelBtn) cancelBtn.addEventListener('click', closePreferences);
        if (saveBtn) saveBtn.addEventListener('click', savePreferences);
    }
    
    // Save preferences
    function savePreferences() {
        const dietary = Array.from(document.querySelectorAll('.pref-section:nth-child(1) input:checked'))
            .map(input => input.value);
        
        const taste = Array.from(document.querySelectorAll('.pref-section:nth-child(2) input:checked'))
            .map(input => input.value);
        
        const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
        const maxPrice = parseInt(document.getElementById('maxPrice').value) || 200;
        
        UserProfileManager.setPreferences({
            dietary: dietary,
            taste: taste,
            priceRange: {
                min: minPrice,
                max: maxPrice
            }
        });
        
        closePreferences();
        
        // Refresh recommendations
        loadRecommendations();
        
        // Show success message
        showNotification('Preferences saved! Recommendations updated.');
    }
    
    // Close preferences modal
    function closePreferences() {
        const modal = document.getElementById('preferencesModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Show preferences modal
    function showPreferences() {
        renderPreferenceSettings();
    }
    
    // Load and display recommendations
    async function loadRecommendations() {
        try {
            const userId = UserProfileManager.getUserId();
            const recommendations = RecommendationEngine.getPersonalizedRecommendations(userId, 6);
            
            // Track recommendations shown
            if (typeof RecommendationAnalytics !== 'undefined') {
                recommendations.forEach(rec => {
                    RecommendationAnalytics.trackRecommendationShown(userId, rec.itemId, rec.strategy);
                });
            }
            
            renderPersonalizedSection(recommendations);
        } catch (error) {
            console.error('Error loading recommendations:', error);
            // Hide recommendations section on error
            const container = document.getElementById('recommendationsSection');
            if (container) {
                container.style.display = 'none';
            }
        }
    }
    
    // Show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    return {
        renderPersonalizedSection,
        addRecommendedItem,
        renderPreferenceSettings,
        savePreferences,
        closePreferences,
        showPreferences,
        loadRecommendations
    };
})();
