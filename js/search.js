/**
 * Search Page Logic
 */

async function initSearch() {
    const container = document.getElementById('search-results-container');
    const input = document.getElementById('search-input');
    const filterSelect = document.getElementById('search-filter');

    let allPhotos = [];

    // Fetch Data
    try {
        container.innerHTML = '<p class="text-muted" style="text-align: center;">Loading...</p>';
        allPhotos = await api.getPhotos();
        renderResults(allPhotos);
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger" style="text-align: center;">Failed to load data.</p>';
        return;
    }

    // Render Function
    function renderResults(photos) {
        if (photos.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; margin-top: 50px;">No results found.</p>';
            return;
        }

        container.innerHTML = '<div class="grid-layout">' + photos.map(photo => {
            const gearInfo = (photo.camera || photo.lens)
                ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                     <span style="opacity: 0.7;">📷</span>
                     <span>${[photo.camera, photo.lens].filter(Boolean).join(' + ')}</span>
                   </div>`
                : '';

            return `
                <div class="card" style="padding: 0; overflow: hidden; break-inside: avoid; margin-bottom: 20px;">
                     <a href="photo.html?id=${photo.id}" style="display: block;">
                        <img src="${photo.url}" alt="${photo.caption}" style="width: 100%; display: block;">
                    </a>
                    <div style="padding: 15px;">
                        <a href="photo.html?id=${photo.id}" style="text-decoration: none; color: inherit;">
                            <p style="font-weight: 500; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${photo.caption}</p>
                        </a>
                        ${gearInfo}
                        <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
                            <img src="${photo.authorAvatar}" style="width: 20px; height: 20px; border-radius: 50%;">
                            <span style="font-size: 0.85rem; color: var(--text-muted);">${photo.authorName}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('') + '</div>';

        // Add basic masonry-like grid style dynamically if not in css
        const style = document.createElement('style');
        style.innerHTML = `
            .grid-layout {
                column-count: 3;
                column-gap: 20px;
            }
            @media (max-width: 900px) { .grid-layout { column-count: 2; } }
            @media (max-width: 600px) { .grid-layout { column-count: 1; } }
        `;
        document.head.appendChild(style);
    }

    // Search Handler
    const handleSearch = () => {
        const term = input.value.toLowerCase();
        const filter = filterSelect.value;

        const filtered = allPhotos.filter(p => {
            const content = {
                camera: (p.camera || '').toLowerCase(),
                lens: (p.lens || '').toLowerCase(),
                author: (p.authorName || '' + p.authorUsername || '').toLowerCase(),
                all: ((p.camera || '') + (p.lens || '') + (p.authorName || '') + (p.caption || '')).toLowerCase()
            };

            if (filter === 'all') {
                return content.all.includes(term);
            } else {
                return content[filter].includes(term);
            }
        });

        renderResults(filtered);
    };

    input.addEventListener('input', handleSearch);
    filterSelect.addEventListener('change', handleSearch);
}

document.addEventListener('DOMContentLoaded', initSearch);
