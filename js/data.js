/**
 * API Handler (Replaces direct mock data)
 */
const API_BASE = '/api';

class ApiClient {
    async login(username, password) {
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Server error' };
        }
    }

    async register(username, password, name) {
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name })
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Server error' };
        }
    }

    async getPhotos(username) {
        let url = `${API_BASE}/photos`;
        if (username) url += `?username=${username}`;
        const res = await fetch(url);
        return await res.json();
    }

    async likePhoto(id, username) {
        const res = await fetch(`${API_BASE}/photos/${id}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await res.json();
    }

    async getTopics(username) {
        let url = `${API_BASE}/topics`;
        if (username) {
            url += `?username=${username}`;
        }
        const res = await fetch(url);
        return await res.json();
    }

    async getAdminStats() {
        const res = await fetch(`${API_BASE}/admin/stats`);
        return await res.json();
    }

    async getUsers() {
        const res = await fetch(`${API_BASE}/users`);
        return await res.json();
    }

    async getPhotoById(id) {
        const res = await fetch(`${API_BASE}/photos/${id}`);
        if (!res.ok) return null;
        return await res.json();
    }

    async addComment(photoId, text, username, parentId = null) {
        const res = await fetch(`${API_BASE}/photos/${photoId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, user: username, parentId })
        });
        return await res.json();
    }

    // Upload with File (FormData)
    async uploadPhotoFile(formData) {
        const res = await fetch(`${API_BASE}/photos`, {
            method: 'POST',
            // No Content-Type header needed; fetch adds it with boundary for FormData
            body: formData
        });
        return await res.json();
    }

    async deletePhoto(id, username) {
        const res = await fetch(`${API_BASE}/photos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await res.json();
    }

    async deleteTopic(id, username) {
        const res = await fetch(`${API_BASE}/topics/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await res.json();
    }

    async updatePhoto(id, caption, username) {
        const res = await fetch(`${API_BASE}/photos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caption, username })
        });
        return await res.json();
    }

    async updateTopic(id, title, username) {
        const res = await fetch(`${API_BASE}/topics/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, username })
        });
        return await res.json();
    }

    async createTopic(title, category, username) {
        const res = await fetch(`${API_BASE}/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, username })
        });
        return await res.json();
    }

    async getTopicById(id) {
        const res = await fetch(`${API_BASE}/topics/${id}`);
        return await res.json();
    }

    async getTopicComments(id) {
        const res = await fetch(`${API_BASE}/topics/${id}/comments`);
        return await res.json();
    }

    async addTopicComment(id, text, username) {
        const res = await fetch(`${API_BASE}/topics/${id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, username })
        });
        return await res.json();
    }
    async updateComment(id, text, username) {
        const res = await fetch(`${API_BASE}/comments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, username })
        });
        return await res.json();
    }

    async updateTopicComment(id, text, username) {
        const res = await fetch(`${API_BASE}/topic-comments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, username })
        });
        return await res.json();
    }
    async updateUserRole(username, role, requesterUsername) {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, requesterUsername })
        });
        return await res.json();
    }

    async deleteUser(username, requesterUsername) {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterUsername })
        });
        return await res.json();
    }

    async banUser(username, requesterUsername) {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/ban`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterUsername })
        });
        return await res.json();
    }

    async deleteComment(id, username) {
        const res = await fetch(`${API_BASE}/comments/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await res.json();
    }

    async deleteTopicComment(id, username) {
        const res = await fetch(`${API_BASE}/topic-comments/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await res.json();
    }

    // Events
    async getEvents() {
        const res = await fetch(`${API_BASE}/events`);
        return await res.json();
    }

    async createEvent(formData) {
        const res = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            body: formData
        });
        return await res.json();
    }

    async deleteEvent(id, username) {
        const res = await fetch(`${API_BASE}/events/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await res.json();
    }

    async getEventById(id) {
        const res = await fetch(`${API_BASE}/events/${id}`);
        if (!res.ok) return null;
        return await res.json();
    }

    async updateEvent(id, formData) {
        // Fetch API PUT with FormData doesn't need content-type header
        const res = await fetch(`${API_BASE}/events/${id}`, {
            method: 'PUT',
            body: formData
        });
        return await res.json();
    }
}

const api = new ApiClient();
