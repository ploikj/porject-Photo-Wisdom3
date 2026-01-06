/**
 * Create/Edit Event Logic
 */

async function initCreateEvent() {
    auth.requireAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const isEdit = !!eventId;

    // Update UI for Edit Mode
    if (isEdit) {
        document.querySelector('h2').innerText = 'Edit Event';
        document.querySelector('button[type="submit"]').innerText = 'Save Changes';
        document.getElementById('file-input').removeAttribute('required'); // Image optional on edit
    }

    const fileInput = document.getElementById('file-input');
    const previewImg = document.getElementById('preview-img');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const previewBadge = document.getElementById('preview-badge');
    const dateInput = document.getElementById('event-date');
    const form = document.getElementById('create-event-form');

    // Pre-fill Data if Edit
    if (isEdit) {
        try {
            const event = await api.getEventById(eventId);
            if (!event) {
                alert('Event not found');
                window.location.href = 'events.html';
                return;
            }

            form.title.value = event.title;
            form.description.value = event.description;
            form.location.value = event.location;
            if (form.link_url) form.link_url.value = event.link_url || ''; // Check if input exists

            // Format Date for datetime-local (YYYY-MM-DDTHH:MM)
            const d = new Date(event.event_date);
            // Adjust for timezone offset to show correct local time in input
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            dateInput.value = d.toISOString().slice(0, 16);

            // Set Preview
            previewImg.src = event.image_url;
            previewImg.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            previewBadge.style.display = 'block';

            updateBadge(d);

        } catch (e) {
            console.error(e);
            alert('Error loading event details');
        }
    } else {
        // Set Default Badge (Today)
        const today = new Date();
        updateBadge(today);
    }

    function updateBadge(date) {
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        document.getElementById('preview-month').innerText = month;
        document.getElementById('preview-day').innerText = day;
    }

    // Preview Image
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                previewPlaceholder.style.display = 'none';
                previewBadge.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            if (!isEdit) {
                previewImg.style.display = 'none';
                previewPlaceholder.style.display = 'block';
                previewBadge.style.display = 'none';
            }
        }
    });

    // Preview Date Badge
    dateInput.addEventListener('input', () => {
        const val = dateInput.value;
        if (val) {
            updateBadge(new Date(val));
        }
    });

    // Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Saving...';

        const user = auth.getCurrentUser();
        const formData = new FormData(e.target);
        formData.append('username', user.username);

        try {
            let res;
            if (isEdit) {
                res = await api.updateEvent(eventId, formData);
            } else {
                res = await api.createEvent(formData);
            }

            if (res.success) {
                window.location.href = 'events.html';
            } else {
                alert('Failed: ' + res.message);
                btn.disabled = false;
                btn.innerText = originalText;
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to server.');
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
}

document.addEventListener('DOMContentLoaded', initCreateEvent);
