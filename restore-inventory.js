const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data.json');

// Read current data
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Restock amounts for each item
const restockAmounts = {
    1: 50,    // Mandazi
    2: 40,    // Chapati
    3: 100,   // Tea
    4: 45,    // Eggs & Bread
    5: 30,    // Ugali & Beef
    6: 35,    // Rice & Chicken
    7: 25,    // Sukuma & Ugali
    8: 20,    // Beans & Maize
    9: 60,    // Coffee
    10: 70,   // Juice
    11: 50,   // Samosa
    12: 40,   // Mandazi (Jaggery)
    13: 45,   // Beef Stew
    14: 30,   // Fish Curry
    15: 25    // Biryani
};

// Update inventory
for (const category in data.foodData) {
    data.foodData[category].forEach(item => {
        if (restockAmounts[item.id]) {
            item.available = restockAmounts[item.id];
            console.log(`✓ Restocked: ${item.name} - ${item.available} units`);
        }
    });
}

// Save back
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ Inventory restored successfully!');
