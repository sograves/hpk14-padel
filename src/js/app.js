// HPK 14 Padel Team - Frontend JavaScript

// Team code management
const teamCode = {
    STORAGE_KEY: 'hpk14_team_code',

    get() {
        return localStorage.getItem(this.STORAGE_KEY);
    },

    set(code) {
        localStorage.setItem(this.STORAGE_KEY, code);
    },

    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    async prompt() {
        const code = prompt('Indtast holdkode for at fortsætte:');
        if (code) {
            this.set(code);
            return code;
        }
        return null;
    },

    async ensure() {
        let code = this.get();
        if (!code) {
            code = await this.prompt();
        }
        return code;
    }
};

// API Client
const api = {
    async getActivities() {
        const response = await fetch('/api/activities');
        if (!response.ok) throw new Error('Failed to fetch activities');
        return response.json();
    },

    async getActivity(id) {
        const response = await fetch(`/api/activity?id=${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error('Failed to fetch activity');
        return response.json();
    },

    async createActivity(data) {
        const code = await teamCode.ensure();
        if (!code) throw new Error('Team code required');

        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Team-Code': code
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            teamCode.clear();
            throw new Error('Invalid team code');
        }
        if (!response.ok) throw new Error('Failed to create activity');
        return response.json();
    },

    async signup(activityId, name) {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId, name })
        });
        if (!response.ok) throw new Error('Failed to sign up');
        return response.json();
    },

    async removeSignup(activityId, signupId) {
        const response = await fetch('/api/signup', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId, signupId })
        });
        if (!response.ok) throw new Error('Failed to remove signup');
        return response.json();
    },

    async updateActivity(id, data) {
        const code = await teamCode.ensure();
        if (!code) throw new Error('Team code required');

        const response = await fetch(`/api/activity?id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Team-Code': code
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            teamCode.clear();
            throw new Error('Invalid team code');
        }
        if (!response.ok) throw new Error('Failed to update activity');
        return response.json();
    },

    async deleteActivity(id) {
        const code = await teamCode.ensure();
        if (!code) throw new Error('Team code required');

        const response = await fetch(`/api/activity?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                'X-Team-Code': code
            }
        });

        if (response.status === 401) {
            teamCode.clear();
            throw new Error('Invalid team code');
        }
        if (!response.ok) throw new Error('Failed to delete activity');
        return response.json();
    }
};

// Helper functions
function getTypeLabel(type) {
    const labels = {
        training: 'Træning',
        match: 'Kamp',
        social: 'Social',
        other: 'Andet'
    };
    return labels[type] || type;
}

function getTypeColor(type) {
    const colors = {
        training: 'bg-green-100 text-green-800',
        match: 'bg-red-100 text-red-800',
        social: 'bg-purple-100 text-purple-800',
        other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('da-DK', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
