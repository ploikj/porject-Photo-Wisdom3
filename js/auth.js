/**
 * Authentication Handler
 */

class AuthManager {
    constructor() {
        this.currentUserKey = 'pc_current_user';
    }

    async login(username, password) {
        const result = await api.login(username, password);
        if (result.success) {
            this.setSession(result.user);
            return { success: true, user: result.user };
        }
        return result;
    }

    logout() {
        localStorage.removeItem(this.currentUserKey);
        window.location.href = 'index.html';
    }

    setSession(user) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem(this.currentUserKey));
    }

    isAuthenticated() {
        return !!this.getCurrentUser();
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    }

    // Dev Helper: Force Login (Mocking the API for Quick Switch in prototype)
    // Note: In real backend, we'd need a token. For this "Prototype V2", we fake it by setting session manually 
    // strictly for the UI to update, assuming the user exists on server.
    async devLoginAs(role) {
        // Simple mock for the dev toolbar
        const devUsers = {
            'admin': { id: 'admin_001', username: 'admin', role: 'admin', name: 'System Admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff' },
            'user': { id: 'user_001', username: 'alice', role: 'user', name: 'Alice Photographer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' }
        };
        this.setSession(devUsers[role]);
        window.location.reload();
    }
}

const auth = new AuthManager();
