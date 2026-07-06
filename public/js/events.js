/**
 * Events Logic
 */

async function renderEvents() {
    const grid = document.getElementById('events-grid');

    try {
        const events = await api.getEvents();
        const user = auth.getCurrentUser();

        if (events.length === 0) {
            grid.innerHTML = `
                <div class="card" style="padding: 40px; text-align: center; grid-column: 1/-1;">
                     <p class="text-muted">No upcoming events found. Be the first to post one!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = events.map(event => {
            const date = new Date(event.event_date);
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const isOwner = user && user.username === event.authorUsername;
            const isAdmin = user && user.role === 'admin';
            const canManage = isOwner || isAdmin;

            return `
                <article class="card event-card" style="padding: 0; overflow: hidden; position: relative; cursor: pointer;" onclick="location.href='event?id=${event.id}'">
                    <div class="poster-container">
                        <img src="${event.image_url}" class="poster-img" alt="${event.title}">
                        <div class="event-date-badge">
                            <span class="event-month">${month}</span>
                            <span class="event-day">${day}</span>
                        </div>
                    </div>
                    
                    <div style="padding: 20px;">
                        <h3 style="margin-bottom: 5px; font-size: 1.2rem; line-height: 1.3;">${event.title}</h3>
                        <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 15px;">
                            📍 ${event.location} • ⏰ ${time}
                        </p>
                        
                        <p style="font-size: 0.95rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 20px; min-height: 4.5em;">
                            ${event.description || 'No description provided.'}
                        </p>

                        ${event.link_url ? `
                            <a href="${event.link_url}" target="_blank" onclick="event.stopPropagation()" class="btn btn-outline" style="width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                🌐 More Info
                            </a>
                        ` : ''}

                        <div class="flex items-center gap-2" style="border-top: 1px solid var(--border); padding-top: 15px;">
                            <img src="${event.authorAvatar}" style="width: 24px; height: 24px; border-radius: 50%;">
                            <span style="font-size: 0.85rem; color: var(--text-light);">Posted by ${event.authorName}</span>
                            
                            ${canManage ? `
                            <div style="margin-left: auto; display: flex; gap: 10px;" onclick="event.stopPropagation()">
                                <button onclick="editEvent(${event.id})" class="icon-btn edit-btn" title="Edit">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onclick="deleteEvent(${event.id})" class="icon-btn delete-btn" title="Delete">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p class="text-danger">Failed to load events.</p>';
    }
}

window.deleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const user = auth.getCurrentUser();
    try {
        const res = await api.deleteEvent(id, user.username);
        if (res.success) {
            renderEvents();
        } else {
            alert('Failed: ' + res.message);
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting event');
    }
};

window.editEvent = (id) => {
    window.location.href = `create-event.html?id=${id}`;
};

document.addEventListener('DOMContentLoaded', () => {
    // Need to wait for auth to check permissions? Auth is usually sync from localstorage
    renderEvents();
});
