/**
 * Event Details Logic
 */

async function initEventDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        window.location.href = 'events.html';
        return;
    }

    const container = document.getElementById('event-content');

    try {
        const event = await api.getEventById(eventId);
        if (!event) {
            container.innerHTML = '<p class="text-danger text-center">Event not found.</p>';
            return;
        }

        const date = new Date(event.event_date);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const user = auth.getCurrentUser();
        const isOwner = user && user.username === event.authorUsername;
        const isAdmin = user && user.role === 'admin';
        const canManage = isOwner || isAdmin;



        container.innerHTML = `
            <div class="event-grid">
                <!-- Left Column: Poster -->
                <div class="event-poster-col">
                    <div class="poster-wrapper">
                        <img src="${event.image_url}" alt="${event.title}" class="event-poster-img">
                    </div>
                </div>
                
                <!-- Right Column: Details -->
                <div class="event-info-col">
                    <div class="flex justify-between items-start mb-2">
                        <h1 class="event-title">${event.title}</h1>
                    </div>

                     ${canManage ? `
                        <div class="margin-bottom-sm">
                            <a href="create-event.html?id=${event.id}" class="btn btn-outline btn-sm flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit Event
                            </a>
                        </div>
                    ` : ''}

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-icon">📅</span> 
                            <div>
                                <strong style="display:block; color:white;">Date & Time</strong>
                                <span>${dateStr} <br> ${timeStr}</span>
                            </div>
                        </div>
                         <div class="meta-item">
                            <span class="meta-icon">📍</span>
                            <div>
                                <strong style="display:block; color:white;">Location</strong>
                                <span>${event.location}</span>
                            </div>
                        </div>
                    </div>

                    <div class="event-description-box">
                        <h3 class="section-label">About This Event</h3>
                        <p class="event-description">${event.description || 'No description provided.'}</p>
                    </div>

                    ${event.link_url ? `
                        <div style="margin-top: 20px; margin-bottom: 30px;">
                            <a href="${event.link_url}" target="_blank" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;">
                                🌐 Visit Official Link
                            </a>
                        </div>
                    ` : ''}

                    <div class="host-info">
                        <img src="${event.authorAvatar || 'https://ui-avatars.com/api/?name=User&background=random'}" class="host-avatar" onerror="this.src='https://ui-avatars.com/api/?name=User&background=random'">
                        <div>
                            <p class="text-muted" style="font-size: 0.8rem; margin:0;">HOSTED BY</p>
                            <p class="host-name">${event.authorName || event.authorUsername || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .event-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    align-items: start;
                }
                .poster-wrapper {
                    position: sticky;
                    top: 80px; /* Sticks when scrolling */
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    background: #1a1a1a;
                }
                .event-poster-img {
                    width: 100%;
                    height: auto;
                    display: block;
                    object-fit: cover;
                }
                .event-title {
                    font-size: 2.5rem;
                    line-height: 1.1;
                    margin-bottom: 20px;
                    background: linear-gradient(to right, #fff, #aaa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .meta-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .meta-item {
                    display: flex;
                    gap: 12px;
                    background: rgba(255,255,255,0.03);
                    padding: 15px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .meta-icon {
                    font-size: 1.5rem;
                }
                .event-description-box {
                    background: rgba(255,255,255,0.03);
                    padding: 25px;
                    border-radius: 16px;
                    margin-bottom: 30px;
                    line-height: 1.7;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .section-label {
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    margin-bottom: 15px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 10px;
                }
                .event-description {
                    white-space: pre-line; 
                    color: #ddd;
                }
                .host-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                .host-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: 2px solid var(--primary);
                }
                .host-name {
                    font-weight: 600;
                    font-size: 1.1rem;
                    color: white;
                    margin: 0;
                }
                
                @media (max-width: 900px) {
                    .event-grid {
                        grid-template-columns: 1fr;
                        gap: 30px;
                    }
                    .poster-wrapper {
                        position: static;
                    }
                    .event-title {
                        font-size: 2rem;
                    }
                }
            </style>
        `;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger text-center">Error loading event.</p>';
    }
}

document.addEventListener('DOMContentLoaded', initEventDetails);
