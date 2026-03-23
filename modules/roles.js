/**
 * Role-Based Access Control Module
 * Manages admin roles and permissions
 */
const RoleManager = (() => {
    // Define roles and permissions
    const roles = {
        superAdmin: {
            name: 'Super Admin',
            description: 'Full system access',
            permissions: [
                'view_dashboard',
                'manage_orders',
                'manage_inventory',
                'manage_menu',
                'view_analytics',
                'manage_admins',
                'manage_roles',
                'view_users',
                'manage_payments',
                'export_data',
                'system_settings'
            ]
        },
        manager: {
            name: 'Manager',
            description: 'Manage operations and staff',
            permissions: [
                'view_dashboard',
                'manage_orders',
                'manage_inventory',
                'manage_menu',
                'view_analytics',
                'manage_staff',
                'view_users',
                'manage_payments'
            ]
        },
        staff: {
            name: 'Staff',
            description: 'Process orders and inventory',
            permissions: [
                'view_orders',
                'update_order_status',
                'view_inventory',
                'update_inventory'
            ]
        }
    };

    // Check if user has permission
    function hasPermission(userRole, permission) {
        const role = roles[userRole];
        return role && role.permissions.includes(permission);
    }

    // Check multiple permissions (all must be true)
    function hasAllPermissions(userRole, permissions) {
        return permissions.every(p => hasPermission(userRole, p));
    }

    // Check multiple permissions (any can be true)
    function hasAnyPermission(userRole, permissions) {
        return permissions.some(p => hasPermission(userRole, p));
    }

    // Get role info
    function getRoleInfo(roleName) {
        return roles[roleName] || null;
    }

    // Get all roles
    function getAllRoles() {
        return Object.entries(roles).map(([key, value]) => ({
            id: key,
            ...value
        }));
    }

    // Log admin activity
    function logActivity(data, username, action, details = {}) {
        if (!data.activityLog) data.activityLog = [];

        data.activityLog.unshift({
            timestamp: new Date().toLocaleString(),
            username,
            action,
            details,
            ip: details.ip || 'N/A'
        });

        // Keep only last 1000 entries
        if (data.activityLog.length > 1000) {
            data.activityLog = data.activityLog.slice(0, 1000);
        }

        return true;
    }

    // Get activity log
    function getActivityLog(data, limit = 50) {
        if (!data.activityLog) return [];
        return data.activityLog.slice(0, limit);
    }

    // Get user activity
    function getUserActivity(data, username, limit = 50) {
        if (!data.activityLog) return [];
        return data.activityLog
            .filter(log => log.username === username)
            .slice(0, limit);
    }

    // Create admin user
    function createAdmin(data, username, password, role) {
        if (!data.adminAccounts) data.adminAccounts = [];

        // Check if admin exists
        if (data.adminAccounts.some(a => a.username === username)) {
            return { success: false, error: 'Username already exists' };
        }

        // Validate role
        if (!roles[role]) {
            return { success: false, error: 'Invalid role' };
        }

        // Add admin (in production, hash the password!)
        data.adminAccounts.push({
            username,
            password, // ⚠️ TODO: Hash this in production
            role,
            createdAt: new Date().toLocaleString(),
            lastLogin: null,
            active: true
        });

        return {
            success: true,
            message: `Admin ${username} created with role: ${roles[role].name}`
        };
    }

    // Update admin role
    function updateAdminRole(data, username, newRole) {
        if (!roles[newRole]) {
            return { success: false, error: 'Invalid role' };
        }

        const admin = data.adminAccounts?.find(a => a.username === username);
        if (!admin) {
            return { success: false, error: 'Admin not found' };
        }

        const oldRole = admin.role;
        admin.role = newRole;

        return {
            success: true,
            message: `${username} role changed from ${oldRole} to ${newRole}`
        };
    }

    // Deactivate admin
    function deactivateAdmin(data, username) {
        const admin = data.adminAccounts?.find(a => a.username === username);
        if (!admin) {
            return { success: false, error: 'Admin not found' };
        }

        admin.active = false;
        return { success: true, message: `${username} deactivated` };
    }

    // Get admins
    function getAdmins(data) {
        if (!data.adminAccounts) return [];
        return data.adminAccounts.map(a => ({
            username: a.username,
            role: a.role,
            createdAt: a.createdAt,
            lastLogin: a.lastLogin,
            active: a.active
        }));
    }

    return {
        hasPermission,
        hasAllPermissions,
        hasAnyPermission,
        getRoleInfo,
        getAllRoles,
        logActivity,
        getActivityLog,
        getUserActivity,
        createAdmin,
        updateAdminRole,
        deactivateAdmin,
        getAdmins,
        roles
    };
})();

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoleManager;
}
