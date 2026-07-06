/**
 * Topic Details Logic
 */

const urlParams = new URLSearchParams(window.location.search);
const topicId = urlParams.get('id');

if (!topicId) {
    alert('No topic specified');
    window.location.href = 'board.html';
}

async function renderTopic() {
    const container = document.getElementById('topic-container');
    const commentsList = document.getElementById('comments-list');

    try {
        const topic = await api.getTopicById(topicId);
        if (!topic) {
            container.innerHTML = '<p class="text-danger">Topic not found</p>';
            return;
        }

        container.innerHTML = `
            <div class="flex items-center gap-3" style="margin-bottom: 15px;">
                <span style="background: rgba(99, 102, 241, 0.1); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-size: 0.9rem;">
                    ${topic.category}
                </span>
                <span style="color: var(--text-muted); font-size: 0.9rem;">${new Date(topic.created_at).toLocaleDateString()}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                <h1 style="font-size: 2rem; margin-bottom: 20px; flex: 1;">${topic.title}</h1>
                ${(auth.getCurrentUser() && (auth.getCurrentUser().username === topic.author_username || auth.getCurrentUser().role === 'admin')) ?
                `<button class="btn btn-sm btn-outline" onclick="editTopic('${(topic.title || '').replace(/'/g, "\\'")}')">Edit</button>` : ''
            }
            </div>
            
            <div class="flex items-center gap-3" style="padding-top: 20px; border-top: 1px solid var(--border);">
                 ${topic.authorAvatar ? `<img src="${topic.authorAvatar}" style="width: 40px; height: 40px; border-radius: 50%;">` : ''}
                <div>
                    <div style="font-weight: 600;">${topic.authorName || topic.author_username}</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">Author</div>
                </div>
            </div>
        `;

        // Render Comments
        const comments = await api.getTopicComments(topicId);
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">No comments yet. Be the first!</p>';
        } else {
            const currentUser = auth.getCurrentUser();
            commentsList.innerHTML = comments.map(c => {
                const isOwner = currentUser && (currentUser.username === (c.userName || c.username) || currentUser.role === 'admin');
                return `
                <div style="display: flex; gap: 15px;">
                    <img src="${c.userAvatar || 'https://ui-avatars.com/api/?name=' + c.username}" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div style="background: var(--bg-hover); padding: 10px 15px; border-radius: 12px; flex: 1;">
                        <div class="flex items-center justify-between" style="margin-bottom: 5px;">
                            <strong>${c.userName || c.username}</strong>
                            <div class="flex items-center gap-2">
                                <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.created_at).toLocaleDateString()}</span>
                                ${isOwner ?
                        `<button onclick="editTopicComment('${c.id}', '${(c.text || '').replace(/'/g, "\\'")}')" class="btn btn-sm text-muted" style="border: none; padding: 0 5px; font-size: 0.75rem; text-decoration: underline;">Edit</button>
                         <button onclick="deleteTopicComment('${c.id}')" class="btn btn-sm text-danger" style="border: none; padding: 0 5px; font-size: 0.75rem;">Delete</button>`
                        : ''}
                            </div>
                        </div>
                        <p style="color: var(--text-light);">${c.text}</p>
                    </div>
                </div>
            `;
            }).join('');
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="card p-4 text-center">
            <h3 class="text-danger">Error loading topic</h3>
            <p class="text-muted">${e.message}</p>
            <button onclick="location.reload()" class="btn btn-outline mt-3">Try Again</button>
        </div>`;
    }
}

// Handle New Comment
document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.getCurrentUser();
    if (!user) {
        alert('Please login to comment.');
        window.location.href = 'login.html';
        return;
    }

    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await api.addTopicComment(topicId, text, user.username);
        if (res.success) {
            input.value = '';
            renderTopic(); // Reload
        } else {
            alert('Failed: ' + res.message);
        }
    } catch (e) {
        console.error(e);
        alert('Error posting comment');
    }
});

document.addEventListener('DOMContentLoaded', renderTopic);

async function editTopic(currentTitle) {
    const newTitle = prompt('Edit Topic Title:', currentTitle);

    if (newTitle !== null && newTitle.trim() !== '' && newTitle !== currentTitle) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updateTopic(topicId, newTitle, user.username);
            if (res.success) {
                renderTopic();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating topic');
        }
    }
}

async function editTopicComment(id, currentText) {
    const newText = prompt('Edit your comment:', currentText);

    if (newText !== null && newText.trim() !== '' && newText !== currentText) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updateTopicComment(id, newText, user.username);
            if (res.success) {
                renderTopic();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating comment');
        }
    }
}

async function deleteTopicComment(id) {
    if (confirm('Are you sure you want to delete this comment?')) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.deleteTopicComment(id, user.username);
            if (res.success) {
                renderTopic();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting comment');
        }
    }
}
