/**
 * Upload Logic (File)
 */

function initUpload() {
    auth.requireAuth();

    const fileInput = document.getElementById('file-input');
    const previewImg = document.getElementById('preview-img');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const form = document.getElementById('upload-form');

    // Preview
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                previewPlaceholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.style.display = 'none';
            previewPlaceholder.style.display = 'block';
        }
    });

    // Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        const caption = document.getElementById('caption').value;
        const user = auth.getCurrentUser();

        if (!file) {
            alert('Please select a file!');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Uploading...';

        try {
            // Use FormData for File Upload
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('caption', caption);
            formData.append('username', user.username);
            formData.append('camera', document.getElementById('camera').value);
            formData.append('lens', document.getElementById('lens').value);

            // Directly call API here or update api.uploadPhoto to accept FormData
            // We'll call api.uploadPhotoFile if implemented, or just fetch here for now 
            // to keeping with the "Update js/data.js" plan? 
            // Let's call the updated API method.
            const res = await api.uploadPhotoFile(formData);

            if (res.success) {
                window.location.href = 'index.html';
            } else {
                alert('Failed: ' + res.message);
                btn.disabled = false;
                btn.innerText = 'Post Photo';
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to server.');
            btn.disabled = false;
            btn.innerText = 'Post Photo';
        }
    });
}


document.addEventListener('DOMContentLoaded', initUpload);
