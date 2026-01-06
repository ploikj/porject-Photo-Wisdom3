/**
 * Board Logic
 */

async function renderHistory() {
    const list = document.getElementById('history-list');
    const user = auth.getCurrentUser();

    if (!user) {
        list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Please <a href="login.html">login</a> to view your history.</td></tr>';
        return;
    }

    list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Loading your history...</td></tr>';

    try {
        const [topics, photos] = await Promise.all([
            api.getTopics(user.username),
            api.getPhotos(user.username)
        ]);

        // Normalize Data
        const normalizedTopics = topics.map(t => ({
            type: 'Topic',
            id: t.id,
            title: t.title,
            authorName: t.authorName, // This might be undefined if not joined properly, but let's assume API returns it
            authorUsername: t.author_username,
            authorAvatar: t.authorAvatar,
            stats: `${t.replies} comments • ${t.views} views`,
            createdAt: new Date(t.created_at),
            original: t
        }));

        const normalizedPhotos = photos.map(p => ({
            type: 'Photo',
            id: p.id,
            title: p.caption || 'Photo Upload',
            authorName: p.authorName,
            authorUsername: p.authorUsername,
            authorAvatar: p.authorAvatar,
            stats: `${p.likes} likes • ${p.comments.length} comments`,
            createdAt: new Date(p.timestamp),
            original: p
        }));

        let allItems = [...normalizedTopics, ...normalizedPhotos].sort((a, b) => b.createdAt - a.createdAt);

        const renderItems = (items) => {
            if (items.length === 0) {
                list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No items found.</td></tr>';
                return;
            }

            list.innerHTML = items.map(item => {
                const link = item.type === 'Topic' ? `topic.html?id=${item.id}` : `photo.html?id=${item.id}`;
                const badgeColor = item.type === 'Topic' ? 'var(--primary)' : 'var(--accent, #10b981)';
                const badgeBg = item.type === 'Topic' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)';

                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 15px;">
                            <span style="font-size: 0.75rem; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${item.type}</span>
                            <a href="${link}" style="font-weight: 600; font-size: 1.1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; color: var(--text-light); text-decoration: none; vertical-align: middle;">${item.title}</a>
                        </td>
                        <td style="padding: 15px;">
                            <div class="flex items-center gap-2">
                                 ${item.authorAvatar ? `<img src="${item.authorAvatar}" style="width: 24px; height: 24px; border-radius: 50%;">` : ''}
                                <span>${item.authorName || user.name}</span>
                            </div>
                        </td>
                        <td style="padding: 15px; color: var(--text-muted); font-size: 0.9rem;">
                            ${item.stats}
                        </td>
                        <td style="padding: 15px; text-align: right;">
                            ${renderHistoryActions(item)}
                        </td>
                    </tr>
                `;
            }).join('');
        };

        // Initial Render
        renderItems(allItems);

        // Search Listener
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allItems.filter(item => {
                    const titleMatch = (item.title || '').toLowerCase().includes(term);
                    const authorMatch = (item.authorName || user.name || '').toLowerCase().includes(term);
                    return titleMatch || authorMatch;
                });
                renderItems(filtered);
            });
        }

    } catch (e) {
        console.error(e);
        list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--accent);">Failed to load history.</td></tr>';
    }
}

function renderHistoryActions(item) {
    // Both are owned by user if we are in history, but double check authorUsername?
    // Actually history is filtered by user.username, so it's always ours.

    if (item.type === 'Topic') {
        return `
            <button onclick="editTopicProxy('${item.id}', '${(item.title || '').replace(/'/g, "\\'")}', event)" class="btn btn-sm btn-outline" style="margin-left: 10px; padding: 2px 8px; font-size: 0.75rem;">Edit</button>
            <button onclick="deleteTopicProxy('${item.id}', event)" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #ef4444; margin-left: 5px; padding: 2px 8px; font-size: 0.75rem;">Delete</button>
        `;
    } else {
        return `
            <button onclick="editPhotoProxy('${item.id}', '${(item.title || '').replace(/'/g, "\\'")}', event)" class="btn btn-sm btn-outline" style="margin-left: 10px; padding: 2px 8px; font-size: 0.75rem;">Edit</button>
            <button onclick="deletePhotoProxy('${item.id}', event)" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #ef4444; margin-left: 5px; padding: 2px 8px; font-size: 0.75rem;">Delete</button>
        `;
    }
}

window.editTopicProxy = async (id, currentTitle, event) => {
    event.preventDefault();
    const newTitle = prompt('Edit Topic Title:', currentTitle);

    if (newTitle !== null && newTitle.trim() !== '' && newTitle !== currentTitle) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updateTopic(id, newTitle, user.username);
            if (res.success) {
                renderHistory();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating topic');
        }
    }
};

// Global handler for inline onClick
window.deleteTopicProxy = async (id, event) => {
    event.preventDefault(); // Stop link navigation if row is clickable
    if (confirm('Delete this topic?')) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.deleteTopic(id, user.username);
            if (res.success) {
                // Reload board
                renderHistory();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting topic');
        }
    }
}


window.editPhotoProxy = async (id, currentCaption, event) => {
    event.preventDefault();
    const newCaption = prompt('Edit Caption:', currentCaption);

    if (newCaption !== null && newCaption.trim() !== '' && newCaption !== currentCaption) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updatePhoto(id, newCaption, user.username);
            if (res.success) {
                renderHistory();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating photo');
        }
    }
};

window.deletePhotoProxy = async (id, event) => {
    event.preventDefault();
    if (confirm('Delete this photo? This cannot be undone.')) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.deletePhoto(id, user.username);
            if (res.success) {
                renderHistory();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting photo');
        }
    }
};

document.addEventListener('DOMContentLoaded', renderHistory);
