/**
 * Register Logic
 */

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get values
    const username = document.getElementById('username').value.trim();
    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    if (password.length < 4) {
        alert("Password must be at least 4 characters.");
        return;
    }

    // UI Feedback
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Creating Account...';

    try {
        const res = await api.register(username, password, name);
        if (res.success) {
            alert('Registration successful! Please login.');
            window.location.href = 'login.html';
        } else {
            alert(res.message);
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred during registration.');
        btn.disabled = false;
        btn.innerText = originalText;
    }
});
