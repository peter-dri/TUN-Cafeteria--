# 📊 TUN-Cafeteria: Complete System Analysis

> Historical document: this file contains legacy snapshots and may reference older route names (for example `POST /api/order`).
>
> Canonical current-state analysis and route mapping is maintained in `SYSTEM_ANALYSIS.md`.

## Executive Summary

**TUN-Cafeteria** is a university cafeteria ordering system built with vanilla JavaScript frontend and Node.js/Express backend. The system currently operates in **hybrid mode** with mixed data storage (file-based JSON + SQLite/MySQL database) that creates significant data inconsistency challenges.

### Key Metrics
- **Technology Stack**: Express.js, Vanilla JS, SQLite/MySQL, JWT Authentication
- **Current Status**: Functional but with architectural concerns
- **Data Storage**: Dual system (data.json + database) - NOT synchronized
- **Users**: Students (customers), Admin staff, Super admins
- **Business Hours**: 7:30 AM - 6:00 PM (with breakfast/lunch separation)
- **Payment**: M-Pesa integration support

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────┐
│     FRONTEND (Browser)                       │
│  ├─ index.html (Customer Interface)         │
│  │  └─ Modules: menu, cart, payment,        │
│  │             confirm, reviews             │
│  └─ admin.html (Admin Dashboard)            │
│     └─ Modules: admin, analytics, auth      │
└────────────────────┬─────────────────────────┘
                     │ HTTP/CORS
┌────────────────────▼─────────────────────────┐
│     EXPRESS.JS API SERVER (server.js)        │
│  ├─ Public Endpoints (NO AUTH):             │
│  │  ├─ GET /api/data (load all data)        │
│  │  ├─ POST /api/order (place order)        │
│  │  ├─ GET /api/menu (query menu)           │
│  │  └─ Mpesa webhooks                       │
│  │                                           │
│  ├─ Protected Endpoints (JWT):              │
│  │  ├─ POST /api/admin/login                │
│  │  ├─ GET /api/admin/menu                  │
│  │  ├─ POST /api/admin/addItem              │
│  │  └─ PUT /api/admin/inventory             │
│  │                                           │
│  └─ Data Modules:                           │
│     ├─ InventoryManager                     │
│     ├─ AnalyticsManager                     │
│     ├─ RoleManager                          │
│     └─ M-Pesa integration                   │
└────────────┬──────────────────────┬──────────┘
             │                      │
             ▼                      ▼
        ┌─────────────┐      ┌─────────────┐
        │ data.json   │      │ Database    │
        │ (File)      │      │ (SQLite/MY) │
        │             │      │             │
        │ • foodData  │      │ • food_items│
        │ • orders    │      │ • orders    │
        │ • userPrefs │      │ • admins    │
        │ • reviews   │      │ • reviews   │
        └─────────────┘      └─────────────┘
```

---

## 📋 System Components

### 1. Frontend Modules

| Module | Location | Purpose | Status |
|--------|----------|---------|--------|
| **menu.js** | modules/ | Display food items by category | ✅ Active |
| **cart.js** | modules/ | Shopping cart management | ✅ Active |
| **payment.js** | modules/ | Payment processing & M-Pesa | ✅ Active |
| **confirm.js** | modules/ | Order confirmation dialog | ✅ Active |
| **reviews.js** | modules/ | Post-order reviews | ✅ Active |
| **admin.js** | modules/ | Admin inventory management | ✅ Active |
| **auth.js** | modules/ | Login/authentication | ✅ Active |
| **analytics.js** | modules/ | Sales/usage analytics | ⚠️ Dual mode |
| **orderingHours.js** | modules/ | Time-based menu visibility | ✅ Active |
| **userProfile.js** | modules/ | User preferences storage | ✅ Active |

### 2. Backend Modules

| Module | Location | Purpose | Status |
|--------|----------|---------|--------|
| **inventory.js** | modules/ | Inventory tracking | ✅ Active |
| **analytics.js** | modules/ | Analytics processing | ✅ Active |
| **roles.js** | modules/ | Role-based access control | ✅ Active |
| **mpesa.js** | modules/ | M-Pesa payment integration | ✅ Active |

### 3. Database Models

| Model | Location | Backend | Purpose |
|-------|----------|---------|---------|
| FoodItem | database/models/ | Shared | Menu items |
| Order | database/models/ | Shared | Order tracking |
| Admin | database/models/ | Shared | Admin accounts |
| (SQLite variants) | database/models/sqlite/ | SQLite-specific | For SQLite DB |

---

## 🔴 Critical Issues

### Issue #1: Dual Data Storage Without Synchronization

**Severity**: 🔴 CRITICAL

**Problem**: System maintains TWO separate data sources:
- **data.json**: File-based storage (inventory, orders, reviews)
- **Database**: SQLite/MySQL with duplicated structure

These are **never synchronized**, creating severe inconsistencies.

**Example Scenario**:
```
User flow:
1. Frontend loads /api/data → gets 200 items from data.json
2. Admin logs in → backend validates against database admins table
3. Admin modifies inventory in UI
4. Changes written to data.json (file)
5. Database remains unchanged
6. Next API call to /api/admin/menu → returns items from database (different!)
```

**Root Cause**:
- `/api/data` endpoints read/write data.json
- `/api/admin/*` endpoints query database
- No mechanism to keep them in sync

**Impact**:
- Inventory mismatches
- Orders may fail silently
- Admin changes lost if system switched to database
- Data loss risk

**Solution Priority**: Fix immediately

---

### Issue #2: Inventory Tracking is File-Based Only

**Severity**: 🔴 CRITICAL

**Problem**: Inventory quantity only tracked in data.json, not in database

**Code Example from server.js (lines 189-275)**:
```javascript
// /api/order endpoint - only checks data.json
if (foodItem.available < reqItem.quantity) {
    return error;
}
foodItem.available -= reqItem.quantity;  // ← Updates file only
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));  // ← File write
```

Database `food_items` table remains untouched.

**Risks**:
- If data.json corrupted, all inventory data lost
- Database queries show wrong availability (always shows hardcoded values)
- No real-time inventory sync for concurrent orders
- Admin panel inventory view incorrect

**Solution Priority**: High

---

### Issue #3: Duplicate Order Processing Endpoints

**Severity**: 🟡 MEDIUM

**Problem**: Two order endpoints exist with different implementations:

```
POST /api/order (line 189)
├─ Uses: data.json
├─ Returns: Full order object
└─ Updates: File-based inventory

POST /api/orders (line 437)
├─ Uses: Database
├─ Returns: Different format
└─ Frontend: Never calls this
```

**Result**: Database orders table never populated; all orders go to file.

**Code**:
```javascript
// server.js - Line 189
app.post('/api/order', async (req, res) => {
    // Frontend calls this - file-based
});

// server.js - Line 437
app.post('/api/orders', async (req, res) => {
    // Dead code - database version
});
```

**Solution Priority**: Medium (consolidate to one)

---

### Issue #4: Admin-Database Disconnect

**Severity**: 🟡 MEDIUM

**Problem**: Admin operations split between file and database:

```
Login:           database table (admin_accounts)
                         ↓
Load Inventory:  data.json file
                         ↓
Save Changes:    data.json file (database not updated)
```

**Impact**: Admin changes to inventory never reach database

**Timeline Example**:
```
T1: Admin logs in → backend validates credentials from database ✓
T2: Admin modifies item prices in UI
T3: Changes written to data.json ✓
T4: System switches to database-only (planned upgrade)
T5: All admin changes from T2 are lost! ✗
```

**Solution Priority**: High

---

### Issue #5: Menu Data Structure Mismatch

**Severity**: 🟡 MEDIUM

**Problem**: Frontend expects different data structure than database provides

**Frontend Expects from data.json**:
```javascript
{
    id: 1,
    name: "Mandazi",
    price: 20,
    available: 40,      // ← Quantity
    unit: "pieces",
    tags: ["sweet"],
    totalOrders: 23,
    calories: 150,
    isVegetarian: true
}
```

**Database Provides** (from schema.sql):
```sql
id, name, price, available (INT), unit, category,
total_orders, calories, is_vegetarian, is_vegan,
spicy_level, created_at, updated_at
```

**Transformation Issue** (server.js lines 117-151):
```javascript
const transformedItem = {
    id: item.id,
    name: item.name,
    price: item.price,
    available: 50,  // ← HARDCODED! Should be from database
    unit: "plates",  // ← HARDCODED!
};
// Missing: totalOrders, isVegan consistency
```

**Impact**:
- Hardcoded availability values ignore real data
- Frontend shows wrong unit (always "plates")
- Missing nutritional information

**Solution Priority**: Medium

---

### Issue #6: Unauthenticated Endpoints

**Severity**: 🟡 MEDIUM

**Problem**: Critical endpoints have NO authentication:

| Endpoint | Auth Required | Should Be |
|----------|---------------|-----------|
| `GET /api/data` | ❌ No | ❌ Exposes all orders/user prefs |
| `POST /api/order` | ❌ No | ❌ Anyone can order |
| `GET /api/menu` | ❌ No | ✅ OK |
| `POST /api/admin/addItem` | ✅ JWT | ✅ Correct |
| `DELETE /api/inventory/*` | ✅ JWT | ✅ Correct |

**Security Risk**: High
- Anyone can read all orders with `/api/data`
- Anyone can place orders (unlimited orders, no rate limiting per user)
- User preferences exposed

**Solution Priority**: High

---

### Issue #7: M-Pesa Integration Complexity

**Severity**: 🟡 MEDIUM

**Problem**: Mpesa module is complex with external API dependencies

**Current Implementation**:
- Requires M-Pesa API credentials (consumer key, secret)
- STK Push implementation for payment initiation
- Webhook handling for payment confirmation
- Token caching mechanism

**Challenges**:
- Requires live M-Pesa account for testing
- Webhook URL must be public (issues in dev environment)
- Error handling unclear in webhook failures

**Solution Priority**: Low (working but could be simplified)

---

## 📊 Data Model Analysis

### Current Data Structures

**data.json Structure**:
```javascript
{
    foodData: {
        breakfast: [ /* items */ ],
        lunch: [ /* items */ ],
        snacks: [ /* items */ ]
    },
    orders: {
        orderID1: { /* order details */ },
        orderID2: { /* order details */ }
    },
    userPreferences: {
        userID1: { /* preferences */ }
    },
    reviews: [ /* reviews array */ ]
}
```

**Database Schema**:
```sql
food_items (id, name, price, available, unit, category, ...)
orders (id, customer_name, items, total_price, status, ...)
admin_accounts (id, username, password_hash, role, ...)
reviews (id, order_id, rating, comment, ...)
food_tags (id, food_item_id, tag)
```

**Issues**:
- JSON uses nested objects; database uses flat tables
- JSON tracks availability as quantity; database as integer
- No foreign key relationships in JSON structure
- No timestamp tracking in JSON

---

## 🔧 Functional Areas Analysis

### 1. Menu Management

**Current Flow**:
```
Frontend: GET /api/data → Load foodData['breakfast/lunch/snacks']
Display: Categories shown with time-based visibility (orderingHours.js)
Updates: Admin modifies, saved to data.json
```

**Issues**:
- ❌ Inventory not updated in database
- ❌ New items from database not visible to frontend
- ✅ Time-based visibility working correctly
- ⚠️ No image upload support despite schema

**Score**: 6/10

---

### 2. Order Processing

**Current Flow**:
```
1. User selects items → added to cart (localStorage)
2. Click confirm → POST /api/order
3. Backend validates inventory in data.json
4. Inventory decremented in data.json
5. Order saved to data.json
6. Order ID returned to frontend
```

**Issues**:
- ❌ Database orders table not populated
- ❌ Race condition: concurrent orders not locked
- ❌ No order status tracking in workflow
- ✅ Basic order validation working
- ⚠️ M-Pesa integration functional but complex

**Score**: 5/10

---

### 3. Admin Functions

**Current Flow**:
```
1. Admin login → validates against database ✓
2. Admin panel loads → data from data.json
3. Modify inventory → saved to data.json
4. View analytics → reads from data.json
```

**Issues**:
- ❌ Changes not reflected in database
- ❌ Analytics incomplete (missing database orders)
- ❌ No role-based access control enforcement
- ⚠️ Password stored in data.json (file-based)
- ✅ Basic admin UI functional

**Score**: 4/10

---

### 4. Authentication & Security

**Current Implementation**:
- Login: username/password → database validation → JWT token issued
- Protected routes: Verify JWT token
- Admin credentials: Stored in database (hashed)

**Issues**:
- ❌ `/api/data` endpoint unauthenticated
- ❌ `/api/order` endpoint has no rate limiting per user
- ❌ CSV export has no auth check
- ✅ JWT implementation correct
- ✅ Password hashing implemented (bcrypt)

**Score**: 5/10

---

### 5. Business Logic

**Ordering Hours** (orderingHours.js):
```
Breakfast: 7:30 AM - 12:00 PM
Lunch: 12:00 PM - 6:00 PM
Closed: 6:00 PM - 7:30 AM (next day)
```
- ✅ Time-based menu visibility working
- ✅ After-hours messaging working
- ❌ No enforcement on backend (frontend-only)

**Score**: 6/10

---

### 6. Payment Integration

**Current Implementation**: 
- M-Pesa STK Push for payment
- Webhook handling for confirmation
- Order status updated on payment confirmation

**Issues**:
- ⚠️ Requires live M-Pesa account (not testable easily)
- ⚠️ Webhook must handle payment confirmation in background
- ✅ Basic flow implemented
- ❌ Not integrated with database orders

**Score**: 5/10

---

## 📈 Key Metrics & Database Size

| Metric | Current |
|--------|---------|
| Food Items | ~200 items in data.json |
| Orders | Variable (stored in data.json) |
| Admin Users | Few (stored in database) |
| Reviews | Some (stored in both places) |
| Database Queries | Low (mostly file-based) |
| API Endpoints | 25+ endpoints |

---

## 🚦 Health Check Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend UI** | ✅ Functional | All pages render correctly |
| **API Server** | ✅ Running | Express server starts successfully |
| **Database Connection** | ✅ Connected | SQLite working; MySQL optional |
| **Authentication** | ⚠️ Partial | JWT works but incomplete |
| **Data Sync** | ❌ Failed | File ↔ Database sync missing |
| **Order Processing** | ⚠️ Partial | File-based only, DB not updated |
| **Admin Panel** | ⚠️ Partial | Works but changes not persisted to DB |
| **M-Pesa** | ✅ Configured | Requires live account |
| **Rate Limiting** | ❌ Missing | Per-user limits not enforced |
| **Error Handling** | ⚠️ Basic | Missing edge cases |

---

## 🎯 Recommended Fixes (Priority Order)

### Priority 1: Critical (Do First)

1. **Implement Data Sync** 
   - Create synchronization layer between data.json and database
   - OR: Migrate fully to database-only (preferred)
   - Estimated effort: 3-4 hours

2. **Inventory Consistency**
   - Move inventory tracking to database
   - Implement atomic transactions for concurrent orders
   - Estimated effort: 2 hours

3. **Secure Unauthenticated Endpoints**
   - Add authentication to `/api/data`
   - Add rate limiting per user
   - Estimated effort: 1 hour

### Priority 2: High (Next)

4. **Consolidate Order Endpoints**
   - Remove `/api/orders` duplicate
   - Use single endpoint for all order operations
   - Estimated effort: 1 hour

5. **Admin Changes Persistence**
   - Ensure admin inventory changes saved to database
   - Add transaction logging
   - Estimated effort: 1.5 hours

6. **Fix Data Transformation**
   - Remove hardcoded values in API transformation
   - Map all fields correctly from database
   - Estimated effort: 1 hour

### Priority 3: Medium (Improve)

7. **Business Logic Validation**
   - Move ordering hours check to backend
   - Validate inventory availability on server
   - Estimated effort: 1 hour

8. **M-Pesa Integration**
   - Separate payment logic into isolated module
   - Add test mode for development
   - Estimated effort: 2 hours

9. **Error Handling & Logging**
   - Add comprehensive error logging
   - Implement error recovery mechanisms
   - Estimated effort: 2 hours

10. **Testing & Monitoring**
    - Add unit tests for critical functions
    - Implement monitoring/alerting
    - Estimated effort: 3 hours

---

## 📊 Long-Term Recommendations

### 1. **Database-First Architecture** (Recommended)
- Move all data to database (primary)
- Keep data.json for backups only
- Implement proper migrations
- Add database indexing for performance

### 2. **API Versioning**
```
/api/v1/menu        (public)
/api/v1/order       (public)
/api/v1/admin/*     (protected)
```

### 3. **Caching Strategy**
- Cache menu items (5-min TTL)
- Cache user profile data
- Invalidate on admin updates

### 4. **Logging & Monitoring**
- Central logging service
- Error tracking
- Performance metrics
- Audit trail for admin actions

### 5. **Security Hardening**
- Rate limiting per user/IP
- CSRF protection
- Input validation/sanitization
- SQL injection prevention (use parameterized queries)

---

## 🔍 Code Quality Assessment

| Aspect | Score | Comments |
|--------|-------|----------|
| **Code Organization** | 6/10 | Modules exist but mixed concerns |
| **Duplicate Code** | 4/10 | Multiple order endpoints, repeated logic |
| **Error Handling** | 5/10 | Basic try-catch, missing edge cases |
| **Security** | 5/10 | JWT good, but unauthenticated endpoints exist |
| **Documentation** | 7/10 | Good README, but API docs missing |
| **Performance** | 6/10 | File-based caching works, DB not optimized |
| **Testing** | 2/10 | No automated tests present |
| **Scalability** | 3/10 | File-based storage won't scale |

**Overall Score**: 5/10 ⚠️

---

## 📝 Conclusion

The **TUN-Cafeteria** system is **functionally operational** but suffers from **architectural inconsistencies** due to dual data storage without synchronization. The system can handle current load but needs refactoring before production deployment.

### Quick Wins (Start Here)
1. Add authentication to `/api/data`
2. Fix inventory tracking coordination
3. Consolidate order endpoints

### Long-Term Health
1. Migrate to database-first architecture
2. Implement proper error handling & logging
3. Add comprehensive testing
4. Plan for scalability

**Recommendation**: Address Priority 1 issues immediately, then incrementally improve Quality over next sprint.

---

## 📞 Questions to Consider

- Should we go database-only and deprecate data.json?
- What's the expected growth (users/orders per day)?
- Is M-Pesa integration critical for MVP?
- Do we need multi-campus support later?
- What's the maintenance team size?

---

*Analysis generated: May 4, 2026*
*System Version: 4.0.0*
