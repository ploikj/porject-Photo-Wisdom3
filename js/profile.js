/**
 * Profile Logic (Premium Redesign)
 */

let currentProfile = null;

async function renderProfile() {
    auth.requireAuth();
    const currentUser = auth.getCurrentUser();

    // Determine profile to show (currently only current user supported fully for edit, but view could be generic)
    // For now, let's assume we view "my profile" or query param? 
    // The previous implementation assumed "My Profile" mostly, let's stick to that for now unless we add ?username=...
    // Let's support ?username=... if present
    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get('username');
    const targetUsername = usernameParam || currentUser.username;

    // Fetch Target User Profile?
    // Current API `getPhotos` can filter by username.
    // But we need user DETAILS (Bio, Gear, etc.).
    // `GET /api/users` returns all. Effective but inefficient. Refactor later?
    // Let's just find the user from the list for now.

    try {
        const users = await api.getUsers();
        const profile = users.find(u => u.username === targetUsername);

        if (!profile) {
            alert('User not found');
            return;
        }

        currentProfile = profile; // Store for edit

        // 1. Render Header Info
        document.getElementById('profile-avatar').src = profile.avatar || 'https://ui-avatars.com/api/?background=random';
        document.getElementById('profile-name').innerText = profile.name;
        document.getElementById('username-display').innerText = `@${profile.username}`;

        if (profile.role === 'admin') {
            document.getElementById('role-badge').style.display = 'inline-block';
        }

        // 2. Render Bio
        const bioEl = document.getElementById('profile-bio');
        bioEl.innerHTML = profile.bio ? `<p>${profile.bio}</p>` : '<p class="text-muted">No bio yet.</p>';

        // 3. Render Gear
        const gearContainer = document.getElementById('profile-gear-container');
        gearContainer.innerHTML = '';
        if (profile.camera_gear || profile.lens_gear) {
            if (profile.camera_gear) gearContainer.innerHTML += `<span class="gear-tag">📷 ${profile.camera_gear}</span>`;
            if (profile.lens_gear) gearContainer.innerHTML += `<span class="gear-tag">⭕ ${profile.lens_gear}</span>`;
        } else {
            gearContainer.innerHTML = '<span class="text-muted" style="font-size:0.9rem;">No gear listed.</span>';
        }

        // 4. Status Badge
        const isOpen = (profile.is_open_for_work == 1 || profile.is_open_for_work === 'true');
        const badge = document.getElementById('work-status-badge');
        if (isOpen) badge.classList.remove('hidden');
        else badge.classList.add('hidden');

        // 5. Socials
        const socialContainer = document.getElementById('social-links-container');
        socialContainer.innerHTML = '';
        if (profile.facebook) {
            socialContainer.innerHTML += `<a href="${profile.facebook}" target="_blank" class="social-btn facebook"><span>📘</span> Facebook</a>`;
        }
        if (profile.instagram) {
            let igUrl = profile.instagram.startsWith('http') ? profile.instagram : `https://instagram.com/${profile.instagram.replace('@', '')}`;
            socialContainer.innerHTML += `<a href="${igUrl}" target="_blank" class="social-btn instagram"><span>📸</span> Instagram</a>`;
        }
        if (!profile.facebook && !profile.instagram) {
            socialContainer.innerHTML = '<span class="text-muted" style="font-size:0.9rem;">No social links.</span>';
        }

        // 6. Actions (Edit Button)
        const actionContainer = document.getElementById('profile-actions-container');
        actionContainer.innerHTML = '';
        if (currentUser && (currentUser.username === profile.username || currentUser.role === 'admin')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary';
            editBtn.innerText = 'Edit Profile';
            editBtn.onclick = openEditModal;
            actionContainer.appendChild(editBtn);
        }

        // 7. Render Photos
        renderUserPhotos(profile.username);

    } catch (e) {
        console.error(e);
        alert('Failed to load profile');
    }
}

async function renderUserPhotos(username) {
    const grid = document.getElementById('profile-photos');
    try {
        const photos = await api.getPhotos(username);
        if (photos.length === 0) {
            grid.innerHTML = '<p class="text-muted" style="width:100%;">No photos uploaded yet.</p>';
            return;
        }

        grid.innerHTML = photos.map(photo => `
            <div class="photo-item" onclick="window.location.href='photo.html?id=${photo.id}'">
                <img src="${photo.url}" loading="lazy">
                <div class="photo-overlay">
                    <p style="color: white; font-weight: 600; margin: 0;">${photo.caption || 'Untitled'}</p>
                    <small style="color: rgba(255,255,255,0.8);">❤️ ${photo.likes}</small>
                </div>
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<p class="text-danger">Error loading photos.</p>';
    }
}

// Preview Avatar
function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('edit-avatar-preview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Modal Logic
function openEditModal() {
    if (!currentProfile) return;

    document.getElementById('edit-bio').value = currentProfile.bio || '';
    document.getElementById('edit-camera').value = currentProfile.camera_gear || '';
    document.getElementById('edit-lens').value = currentProfile.lens_gear || '';
    document.getElementById('edit-facebook').value = currentProfile.facebook || '';
    document.getElementById('edit-instagram').value = currentProfile.instagram || '';
    document.getElementById('edit-open-work').checked = (currentProfile.is_open_for_work == 1 || currentProfile.is_open_for_work === 'true');

    // Set Preview to current avatar
    document.getElementById('edit-avatar-preview').src = currentProfile.avatar || 'https://ui-avatars.com/api/?background=random';
    document.getElementById('edit-avatar-input').value = ''; // Reset file input

    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

document.getElementById('save-btn').onclick = async () => {
    if (!currentProfile) return;

    const user = auth.getCurrentUser();

    // Use FormData for File Upload
    const formData = new FormData();
    formData.append('username', user.username);
    formData.append('bio', document.getElementById('edit-bio').value);
    formData.append('facebook', document.getElementById('edit-facebook').value);
    formData.append('instagram', document.getElementById('edit-instagram').value);
    formData.append('camera_gear', document.getElementById('edit-camera').value);
    formData.append('lens_gear', document.getElementById('edit-lens').value);
    formData.append('is_open_for_work', document.getElementById('edit-open-work').checked ? '1' : '0');

    const fileInput = document.getElementById('edit-avatar-input');
    if (fileInput.files[0]) {
        formData.append('avatar', fileInput.files[0]);
    }

    const btn = document.getElementById('save-btn');
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const res = await api.updateUserProfile(currentProfile.username, formData);
        if (res.success) {
            closeEditModal();
            renderProfile(); // Reload UI
        } else {
            alert('Failed: ' + res.message);
        }
    } catch (e) {
        console.error(e);
        alert('Error saving profile');
    } finally {
        btn.innerText = 'Save Changes';
        btn.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', renderProfile);
