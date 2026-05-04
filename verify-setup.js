// Quick verification script to check if everything is set up correctly
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Tharaka Cafeteria Setup...\n');

let hasErrors = false;

// Check 1: Required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
    'server.js',
    'data.json',
    'admin.html',
    'modules/admin.js',
    'modules/auth.js',
    'modules/confirm.js',
    'package.json'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✓ ${file}`);
    } else {
        console.log(`  ✗ ${file} - MISSING!`);
        hasErrors = true;
    }
});

// Check 2: data.json is valid JSON
console.log('\n📊 Checking data.json...');
try {
    const dataContent = fs.readFileSync('data.json', 'utf8');
    const data = JSON.parse(dataContent);
    
    if (data.foodData) {
        const categories = Object.keys(data.foodData);
        let totalItems = 0;
        categories.forEach(cat => {
            totalItems += data.foodData[cat].length;
        });
        console.log(`  ✓ Valid JSON`);
        console.log(`  ✓ ${categories.length} categories: ${categories.join(', ')}`);
        console.log(`  ✓ ${totalItems} total food items`);
        console.log(`  ✓ ${data.orderHistory ? data.orderHistory.length : 0} orders in history`);
    } else {
        console.log(`  ✗ Missing foodData property`);
        hasErrors = true;
    }
} catch (error) {
    console.log(`  ✗ Invalid JSON: ${error.message}`);
    hasErrors = true;
}

// Check 3: node_modules exists
console.log('\n📦 Checking dependencies...');
if (fs.existsSync('node_modules')) {
    console.log('  ✓ node_modules folder exists');
    
    // Check for key dependencies
    const keyDeps = ['express', 'jsonwebtoken', 'cors'];
    keyDeps.forEach(dep => {
        if (fs.existsSync(path.join('node_modules', dep))) {
            console.log(`  ✓ ${dep} installed`);
        } else {
            console.log(`  ✗ ${dep} not installed`);
            hasErrors = true;
        }
    });
} else {
    console.log('  ✗ node_modules not found - Run: npm install');
    hasErrors = true;
}

// Check 4: Admin module syntax
console.log('\n🔧 Checking admin.js module...');
try {
    const adminContent = fs.readFileSync('modules/admin.js', 'utf8');
    
    // Check for key functions
    const requiredFunctions = [
        'loadData',
        'renderInventory',
        'renderPOSMenu',
        'addToPOSCart',
        'placePOSOrder',
        'updateQuantity'
    ];
    
    requiredFunctions.forEach(func => {
        if (adminContent.includes(`function ${func}`) || adminContent.includes(`${func}:`)) {
            console.log(`  ✓ ${func} function found`);
        } else {
            console.log(`  ✗ ${func} function missing`);
            hasErrors = true;
        }
    });
    
    // Check module is properly closed
    if (adminContent.includes('})();')) {
        console.log('  ✓ Module properly closed');
    } else {
        console.log('  ✗ Module not properly closed');
        hasErrors = true;
    }
} catch (error) {
    console.log(`  ✗ Error reading admin.js: ${error.message}`);
    hasErrors = true;
}

// Check 5: Port availability (basic check)
console.log('\n🌐 Server configuration...');
try {
    const serverContent = fs.readFileSync('server.js', 'utf8');
    const portMatch = serverContent.match(/PORT\s*=\s*(\d+)/);
    if (portMatch) {
        console.log(`  ✓ Server configured for port ${portMatch[1]}`);
    } else {
        console.log('  ℹ Port configuration not found (may use default)');
    }
} catch (error) {
    console.log(`  ✗ Error reading server.js: ${error.message}`);
    hasErrors = true;
}

// Final summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ SETUP HAS ISSUES - Please fix the errors above');
    console.log('\nCommon fixes:');
    console.log('  • Run: npm install');
    console.log('  • Verify data.json is valid JSON');
    console.log('  • Check all required files exist');
    process.exit(1);
} else {
    console.log('✅ SETUP LOOKS GOOD!');
    console.log('\nNext steps:');
    console.log('  1. Run: npm start');
    console.log('  2. Open: http://localhost:3000/admin.html');
    console.log('  3. Test: http://localhost:3000/admin.html');
    console.log('\n🎉 Your cafeteria system is ready to use!');
    process.exit(0);
}
