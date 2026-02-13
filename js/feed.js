/**
 * Feed Logic
 */

async function renderFeed() {
    const container = document.getElementById('feed-container');
    container.innerHTML = '<p class="text-muted" style="text-align: center;">Loading photos...</p>';

    try {
        const photos = await api.getPhotos();

        container.innerHTML = photos.map(photo => {
            const gearInfo = (photo.camera || photo.lens)
                ? `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                     <span>${[photo.camera, photo.lens].filter(Boolean).join(' + ')}</span>
                   </div>`
                : '';

            return `
                <article class="card photo-card">
                    <div class="photo-header flex items-center gap-4" style="margin-bottom: 15px;">
                        <img src="${photo.authorAvatar}" alt="${photo.authorUsername}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <h4 style="margin: 0;">${photo.authorName}</h4>
                            <span class="text-muted" style="font-size: 0.85rem;">@${photo.authorUsername} • ${new Date(photo.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="photo-content">
                        <img src="${photo.url}" alt="${photo.caption}">
                    </div>

                    <div class="photo-footer">
                        <div style="margin-bottom: 15px;">
                            <p style="font-size: 1.1rem; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${photo.caption}</p>
                            ${gearInfo}
                        </div>
                        
                        <div class="actions flex gap-4">
                            <button class="btn btn-outline btn-sm" onclick="toggleLike('${photo.id}')" id="like-btn-${photo.id}">
                                ❤️ <span id="like-count-${photo.id}">${photo.likes}</span> Likes
                            </button>
                            <a href="photo.html?id=${photo.id}" class="btn btn-outline btn-sm" style="text-decoration: none;">
                                💬 ${photo.comments.length} Comments
                            </a>
                            ${(auth.getCurrentUser() && (auth.getCurrentUser().username === photo.authorUsername || auth.getCurrentUser().role === 'admin')) ?
                    `<button class="btn btn-sm btn-outline" onclick="editPhotoFromFeed('${photo.id}', '${(photo.caption || '').replace(/'/g, "\\'")}')">Edit</button>` : ''
                }
                            ${(auth.getCurrentUser() && auth.getCurrentUser().role === 'admin') ?
                    `<button class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #ef4444;" onclick="deletePhotoFromFeed('${photo.id}')">Delete (Admin)</button>` : ''
                }
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = '<p class="text-danger" style="text-align: center;">Failed to load feed. Is the server running?</p>';
    }
}

async function toggleLike(photoId) {
    const user = auth.getCurrentUser();
    if (!user) {
        alert('Please login to like photos!');
        return;
    }

    try {
        const result = await api.likePhoto(photoId, user.username);
        if (result.success) {
            // Update UI locally
            const countEl = document.getElementById(`like-count-${photoId}`);
            if (countEl) countEl.innerText = result.likes;

            // Optional: Toggle heart style
            const btn = document.getElementById(`like-btn-${photoId}`);
            if (btn) {
                if (result.liked) {
                    btn.classList.remove('btn-outline');
                    btn.classList.add('btn-primary');
                } else {
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-outline');
                }
            }
        }
    } catch (e) {

        console.error('Like failed', e);
    }
}

async function deletePhotoFromFeed(id) {
    if (!confirm('Admin: Delete this photo?')) return;

    const user = auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('Unauthorized');
        return;
    }

    try {
        const res = await api.deletePhoto(id, user.username);
        if (res.success) {
            alert('Photo deleted by admin.');
            renderFeed(); // Reload feed
        } else {
            alert('Failed: ' + res.message);
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting photo');

    }

}

async function editPhotoFromFeed(id, currentCaption) {
    const newCaption = prompt('Edit Caption:', currentCaption);

    if (newCaption !== null && newCaption.trim() !== '' && newCaption !== currentCaption) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updatePhoto(id, newCaption, user.username);
            if (res.success) {
                renderFeed();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating photo');
        }
    }
}

// Init
document.addEventListener('DOMContentLoaded', renderFeed);
