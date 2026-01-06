/**
 * Public Board Logic
 */

async function renderPublicBoard() {
    const list = document.getElementById('public-board-list');
    list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Loading community topics...</td></tr>';

    try {
        // Fetch ALL topics (no username filter)
        const topics = await api.getTopics();
        let allTopics = topics;

        const renderTopics = (topicsToRender) => {
            if (topicsToRender.length === 0) {
                list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No topics found.</td></tr>';
                return;
            }

            list.innerHTML = topicsToRender.map(topic => {
                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 15px;">
                            <a href="topic.html?id=${topic.id}" style="font-weight: 600; font-size: 1.1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; color: var(--text-light); text-decoration: none;">${topic.title || 'No Caption'}</a>
                        </td>
                        <td style="padding: 15px;">
                            <div class="flex items-center gap-2">
                                 ${topic.authorAvatar ? `<img src="${topic.authorAvatar}" style="width: 24px; height: 24px; border-radius: 50%;">` : ''}
                                <span>${topic.authorName || topic.author_username}</span>
                            </div>
                        </td>

                        <td style="padding: 15px; color: var(--text-muted); font-size: 0.9rem;">
                            ${topic.replies || 0} comments • ${topic.views || 0} likes
                        </td>
                        <td style="padding: 15px; text-align: right;">
                            ${renderDeleteTopicBtn(topic)}
                        </td>
                    </tr>
                `;
            }).join('');
        };

        // Initial Render
        renderTopics(allTopics);

        // Search Listener
        const searchInput = document.getElementById('board-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allTopics.filter(t => {
                    const titleMatch = (t.title || '').toLowerCase().includes(term);
                    const authorMatch = (t.authorName || t.author_username || '').toLowerCase().includes(term);
                    return titleMatch || authorMatch;
                });
                renderTopics(filtered);
            });
        }

    } catch (e) {
        console.error(e);
        list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--accent);">Failed to load topics.</td></tr>';
    }
}





function renderDeleteTopicBtn(topic) {
    const user = auth.getCurrentUser();
    if (user && (user.username === topic.author_username || user.role === 'admin')) {
        return `
            <button onclick="editTopicProxy('${topic.id}', '${(topic.title || '').replace(/'/g, "\\'")}', event)" class="btn btn-sm btn-outline" style="margin-left: 10px; padding: 2px 8px; font-size: 0.75rem;">Edit</button>
            <button onclick="deleteTopicProxy('${topic.id}', event)" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #ef4444; margin-left: 5px; padding: 2px 8px; font-size: 0.75rem;">Delete</button>
        `;
    }
    return '';
}

window.editTopicProxy = async (id, currentTitle, event) => {
    event.preventDefault();
    const newTitle = prompt('Edit Topic Title:', currentTitle);

    if (newTitle !== null && newTitle.trim() !== '' && newTitle !== currentTitle) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.updateTopic(id, newTitle, user.username);
            if (res.success) {
                renderPublicBoard();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error updating topic');
        }
    }
};

window.deleteTopicProxy = async (id, event) => {
    event.preventDefault();
    if (confirm('Delete this topic?')) {
        const user = auth.getCurrentUser();
        try {
            const res = await api.deleteTopic(id, user.username);
            if (res.success) {
                renderPublicBoard();
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting topic');
        }
    }
};

async function createTopicUI() {
    const user = auth.getCurrentUser();
    if (!user) {
        alert('Please login to create a topic.');
        window.location.href = 'login.html';
        return;
    }

    const title = prompt('Enter Topic Title:');
    if (!title) return;

    const category = 'General';

    try {
        const res = await api.createTopic(title, category, user.username);
        if (res.success) {
            renderPublicBoard();
        } else {
            alert('Failed to create topic: ' + res.message);
        }
    } catch (e) {
        console.error(e);
        alert('Error creating topic');
    }
}

document.addEventListener('DOMContentLoaded', renderPublicBoard);
