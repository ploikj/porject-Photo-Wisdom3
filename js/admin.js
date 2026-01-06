/**
 * Admin Logic
 */

async function renderAdmin() {
    auth.requireAuth();
    const currentUser = auth.getCurrentUser();
    if (currentUser.role !== 'admin') {
        alert('Access Denied. Admins only.');
        window.location.href = 'index.html';
        return;
    }

    try {
        const [stats, users] = await Promise.all([
            api.getAdminStats(),
            api.getUsers()
        ]);

        document.getElementById('stat-users').textContent = stats.userCount;
        document.getElementById('stat-photos').textContent = stats.photoCount;
        document.getElementById('stat-topics').textContent = stats.topicCount;

        const SUPERB_ADMIN = 'narathip.kh.66@ubu.ac.th';

        let allUsers = users;

        // Helper to render table
        const renderUserTable = (usersToRender) => {
            const table = document.getElementById('admin-user-list');
            if (usersToRender.length === 0) {
                table.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #888;">No users found</td></tr>';
                return;
            }

            table.innerHTML = usersToRender.map(u => {
                const isBanned = u.is_banned === 1;
                return `
                <tr style="border-bottom: 1px solid #2d2f3920;">
                    <td style="padding: 10px; font-family: monospace;">${u.id}</td>
                    <td style="padding: 10px;">
                        <span style="${isBanned ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${u.name} (@${u.username})</span>
                        ${isBanned ? '<span style="color: #ef4444; font-weight: bold; font-size: 0.75rem; margin-left: 5px;">[BANNED]</span>' : ''}
                    </td>
                    <td style="padding: 10px;">
                        <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; background: ${u.role === 'admin' ? '#f43f5e20' : '#6366f120'}; color: ${u.role === 'admin' ? '#f43f5e' : '#6366f1'};">
                            ${u.role.toUpperCase()}
                        </span>
                    </td>
                    <td style="padding: 10px;">
                        ${currentUser.username === SUPERB_ADMIN && u.username !== currentUser.username ?
                        `<button class="btn btn-sm ${u.role === 'admin' ? 'btn-danger' : 'btn-outline'}" 
                                onclick="toggleRole('${u.username}', '${u.role}')">
                                ${u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                            </button>` :
                        (u.username === currentUser.username ? '<span class="text-muted">Self</span>' : '<span class="text-muted">–</span>')
                    }
                    </td>
                    <td style="padding: 10px;">
                        <div class="flex gap-2">
                             ${(currentUser.role === 'admin' && u.username !== SUPERB_ADMIN && u.username !== currentUser.username) ?
                        `<button class="btn btn-sm ${isBanned ? 'btn-primary' : 'btn-warning'}" onclick="toggleBan('${u.username}', ${isBanned})">
                                    ${isBanned ? 'Unban' : 'Ban'}
                                 </button>` : ''}
                            
                            ${currentUser.username === SUPERB_ADMIN && u.username !== currentUser.username ?
                        `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">Delete</button>` : ''
                    }
                        </div>
                    </td>
                </tr>
            `;
            }).join('');
        };

        // Initial Render
        renderUserTable(allUsers);

        // Search Listener
        const searchInput = document.getElementById('admin-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allUsers.filter(u =>
                    u.name.toLowerCase().includes(term) ||
                    u.username.toLowerCase().includes(term)
                );
                renderUserTable(filtered);
            };
        }

    } catch (e) {
        console.error(e);
        alert('Failed to load admin data.');
    }
}

async function toggleRole(username, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin'
        ? `Promote @${username} to Admin?\nThey will have full system access.`
        : `Revoke Admin rights from @${username}?`;

    if (confirm(confirmMsg)) {
        const currentUser = auth.getCurrentUser();
        try {
            const res = await api.updateUserRole(username, newRole, currentUser.username);
            if (res.success) {
                renderAdmin();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating role: ' + e.message);
        }
    }
}

async function toggleBan(username, isBanned) {
    const action = isBanned ? 'Unban' : 'Ban';
    if (confirm(`${action} user @${username}?`)) {
        const currentUser = auth.getCurrentUser();
        try {
            const res = await api.banUser(username, currentUser.username);
            if (res.success) {
                renderAdmin();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating ban status');
        }
    }
}

async function deleteUser(username) {
    if (confirm(`Are you sure you want to PERMANENTLY DELETE user @${username}?\nThis cannot be undone.`)) {
        const currentUser = auth.getCurrentUser();
        try {
            const res = await api.deleteUser(username, currentUser.username);
            if (res.success) {
                alert('User deleted successfully.');
                renderAdmin();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting user');
        }
    }
}

document.addEventListener('DOMContentLoaded', renderAdmin);
