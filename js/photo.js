/**
 * Photo Details Logic
 */

const params = new URLSearchParams(window.location.search);
const photoId = params.get('id');
let replyingToId = null;

function buildCommentTree(comments) {
    const map = {};
    const roots = [];
    comments.forEach(c => {
        c.children = [];
        map[c.id] = c;
    });
    comments.forEach(c => {
        if (c.parentId && map[c.parentId]) {
            map[c.parentId].children.push(c);
        } else {
            roots.push(c);
        }
    });
    return roots;
}

function renderCommentTree(comments, currentUser, depth = 0) {
    if (!comments || comments.length === 0) return '';

    return comments.map(c => {
        const isOwner = currentUser && (currentUser.username === c.user || currentUser.role === 'admin');
        const paddingLeft = depth * 20 + 'px'; // Indentation
        const borderLeft = depth > 0 ? 'border-left: 2px solid #2d2f3950;' : ''; // Visual guide

        return `
            <div style="margin-bottom: 15px; margin-left: ${paddingLeft}; ${borderLeft} padding-left: ${depth > 0 ? '10px' : '0'};">
                <div class="flex items-center gap-2 mb-1">
                    <img src="https://ui-avatars.com/api/?name=${c.user}&background=random" style="width: 24px; height: 24px; border-radius: 50%;">
                    <span style="font-weight: 600; color: var(--primary); font-size: 0.9rem;">${c.user}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${depth > 0 ? 'replied' : ''}</span>
                </div>
                <div style="background: var(--bg-hover); padding: 8px 12px; border-radius: 8px; display: inline-block; min-width: 200px;">
                    <p style="margin: 0; font-size: 0.95rem;">${c.text}</p>
                </div>
                <div class="flex gap-3 mt-1" style="font-size: 0.8rem; align-items: center; opacity: 1;">
                     ${currentUser ? `<button onclick="replyToProxy('${c.id}', '${c.user}')" class="" style="background:none; border:none; padding:0; cursor:pointer; font-weight: 500; color: #3b82f6;">Reply</button>` : ''}
                    ${isOwner ?
                `<span style="color: var(--border);">•</span>
                         <button onclick="editCommentProxy('${c.id}', '${(c.text || '').replace(/'/g, "\\'")}')" class="" style="background:none; border:none; padding:0; cursor:pointer; color: #f97316;">Edit</button>
                         <span style="color: var(--border);">•</span>
                         <button onclick="deleteCommentProxy('${c.id}')" class="" style="background:none; border:none; padding:0; cursor:pointer; color: #ef4444;">Delete</button>`
                : ''}
                </div>
                ${renderCommentTree(c.children, currentUser, depth + 1)}
            </div>
        `;
    }).join('');
}

async function renderPhotoDetails() {
    const container = document.getElementById('photo-detail-container');

    if (!photoId) {
        container.innerHTML = '<p class="text-danger">No photo specified.</p>';
        return;
    }

    try {
        const photo = await api.getPhotoById(photoId);

        if (!photo) {
            container.innerHTML = '<p class="text-danger">Photo not found.</p>';
            return;
        }

        const currentUser = auth.getCurrentUser();
        const commentTree = buildCommentTree(photo.comments);
        let commentsHTML = renderCommentTree(commentTree, currentUser);

        if (photo.comments.length === 0) {
            commentsHTML = '<p class="text-muted">No comments yet. Be the first!</p>';
        }

        const commentFormHTML = currentUser ? `
            <form id="comment-form" style="margin-top: 20px;">
                <div id="reply-indicator" class="mb-2 hidden" style="background: rgba(99, 102, 241, 0.1); padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between;">
                    <span>Replying to <b id="reply-username">@user</b></span>
                    <button type="button" onclick="cancelReply()" class="btn btn-sm text-muted" style="border:none; background:none;">✕</button>
                </div>
                <div class="form-group">
                    <input type="text" id="comment-input" class="form-control" placeholder="Write a comment..." required autocomplete="off">
                </div>
                <button type="submit" class="btn btn-primary btn-sm">Post Comment</button>
            </form>
        ` : `
            <p style="margin-top: 20px; padding: 15px; background: rgba(99, 102, 241, 0.1); border-radius: 8px;">
                <a href="login.html" style="color: var(--primary); font-weight: 600;">Login</a> to post a comment.
            </p>
        `;

        container.innerHTML = `
            <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 30px;">
                <div class="photo-header flex items-center gap-4" style="padding: 15px;">
                    <img src="${photo.authorAvatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="margin: 0;">${photo.authorName}</h4>
                        <span class="text-muted" style="font-size: 0.85rem;">@${photo.authorUsername} • ${new Date(photo.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
                
                <img src="${photo.url}" style="width: 100%; height: auto; max-height: 70vh; object-fit: contain; background: #000; display: block;">

                <div style="padding: 20px;">
                    <p style="font-size: 1.2rem; margin-bottom: 15px;">${photo.caption}</p>
                    <div class="flex gap-4 items-center">
                        <button class="btn btn-outline btn-sm" onclick="toggleLike('${photo.id}')">
                           ❤️ <span id="like-count">${photo.likes}</span> Likes
                        </button>
                        ${(photo.camera || photo.lens) ? `
                            <div style="font-size: 0.9rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                <span>${[photo.camera, photo.lens].filter(Boolean).join(' + ')}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>Comments (${photo.comments.length})</h3>
                <div id="comments-list" style="margin-top: 20px;">
                    ${commentsHTML}
                </div>
                ${commentFormHTML}
            </div>
        `;

        if (currentUser) {
            document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger">Error loading content.</p>';
    }
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;

    const user = auth.getCurrentUser();

    // Optimistic UI update or reload? Let's generic reload for simplicity or fetch again
    try {
        await api.addComment(photoId, text, user.username, replyingToId);
        // Refresh view
        cancelReply(); // Reset reply state
        renderPhotoDetails();
    } catch (e) {
        alert('Failed to post comment');
    }
}

async function toggleLike(id) {
    if (!auth.isAuthenticated()) {
        alert('Please login');
        return;
    }
    const res = await api.likePhoto(id);
    if (res.success) {
        document.getElementById('like-count').innerText = res.likes;
    }
}

function enableEditMode(photo, editBtn) {
    const captionEl = document.getElementById('photo-caption');
    const originalText = captionEl.innerText;

    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control';
    textarea.rows = 3;
    textarea.value = originalText;

    // Create Save/Cancel buttons
    const actions = document.createElement('div');
    actions.className = 'flex gap-2 mt-2';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.innerText = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-outline btn-sm';
    cancelBtn.innerText = 'Cancel';

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    // Replace caption with edit UI
    captionEl.innerHTML = '';
    captionEl.appendChild(textarea);
    captionEl.appendChild(actions);

    // Hide Edit button while editing
    editBtn.style.display = 'none';

    cancelBtn.onclick = () => {
        captionEl.innerHTML = '';
        captionEl.innerText = originalText;
        editBtn.style.display = 'inline-block';
    };

    saveBtn.onclick = async () => {
        const newCaption = textarea.value;
        const user = auth.getCurrentUser();

        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        try {
            const res = await api.updatePhoto(photo.id, newCaption, user.username);
            if (res.success) {
                captionEl.innerHTML = '';
                captionEl.innerText = newCaption;
                editBtn.style.display = 'inline-block';
                // Update photo object in memory if needed, or just relying on UI
            } else {
                alert('Failed to update: ' + res.message);
                saveBtn.disabled = false;
                saveBtn.innerText = 'Save';
            }
        } catch (e) {
            console.error(e);
            alert('Error saving caption');
            saveBtn.disabled = false;
        }
    };
}

document.addEventListener('DOMContentLoaded', renderPhotoDetails);

window.editCommentProxy = async (id, currentText) => {
    const newText = prompt('Edit your comment:', currentText);
    if (newText !== null && newText.trim() !== '' && newText !== currentText) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updateComment(id, newText, user.username);
            if (res.success) {
                renderPhotoDetails();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating comment');
        }
    }
};



window.deleteCommentProxy = async (id) => {
    if (confirm('Delete this comment?')) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.deleteComment(id, user.username);
            if (res.success) {
                renderPhotoDetails();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting comment');
        }
    }
};

window.replyToProxy = (id, username) => {
    replyingToId = id;
    const indicator = document.getElementById('reply-indicator');
    const usernameSpan = document.getElementById('reply-username');
    const input = document.getElementById('comment-input');

    if (indicator && usernameSpan && input) {
        indicator.classList.remove('hidden');
        indicator.style.display = 'flex'; // Ensure flex override
        usernameSpan.innerText = '@' + username;
        input.placeholder = `Replying to @${username}...`;
        input.focus();
    }
};

window.cancelReply = () => {
    replyingToId = null;
    const indicator = document.getElementById('reply-indicator');
    const input = document.getElementById('comment-input');

    if (indicator && input) {
        indicator.classList.add('hidden');
        indicator.style.display = 'none';
        input.placeholder = 'Write a comment...';
    }
};
