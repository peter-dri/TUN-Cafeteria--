// Simple Auth Module - Plain text password (no JWT, no hashing)
const AuthModule = (() => {
    let currentAdmin = null;

    function init() {
        // Restore session from localStorage
        const saved = localStorage.getItem('currentAdmin');
        if (saved) {
            try {
                currentAdmin = JSON.parse(saved);
            } catch (e) {
                localStorage.removeItem('currentAdmin');
            }
        }
    }

    async function login(username, password) {
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            // Check if response has content
            const text = await response.text();
            if (!text) {
                throw new Error('Server returned empty response');
            }

            const result = JSON.parse(text);

            if (!response.ok) {
                throw new Error(result.error || 'Login failed');
            }

            // Store admin info and token
            currentAdmin = result.admin || {};
            if (result.token) currentAdmin.token = result.token;
            localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
            return currentAdmin;
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(error.message || 'Network error - please check if server is running');
        }
    }

    function logout() {
        currentAdmin = null;
        localStorage.removeItem('currentAdmin');
    }

    function isAuthenticated() {
        return currentAdmin !== null;
    }

    function getCurrentAdmin() {
        return currentAdmin;
    }

    function getToken() {
        return currentAdmin && currentAdmin.token ? currentAdmin.token : null;
    }

    function isSuperAdmin() {
        return currentAdmin && (
            currentAdmin.role === 'Super Admin' ||
            currentAdmin.role === 'superAdmin' ||
            currentAdmin.role === 'admin'
        );
    }

    return {
        init,
        login,
        logout,
        isAuthenticated,
        getCurrentAdmin,
        getToken,
        isSuperAdmin
    };
})();
