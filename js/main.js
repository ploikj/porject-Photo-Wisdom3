/**
 * Main Application Logic
 * Shared across all pages
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
});

function initNavbar() {
    const user = auth.getCurrentUser();
    const navHTML = `
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">Photo<span>Wisdom</span></a>
            <ul class="nav-links">
                <li><a href="index.html" class="nav-link">Feed</a></li>
                <li><a href="board.html" class="nav-link">Board</a></li>
                <li><a href="events.html" class="nav-link">Events</a></li>
                <li><a href="history.html" class="nav-link">History</a></li>
                <li><a href="search.html" class="nav-link">Search</a></li>
                ${user ?
            `<li><a href="profile.html" class="nav-link">Profile</a></li>` :
            `<li><a href="login.html" class="nav-link">Login</a></li>`
        }
                ${user && user.role === 'admin' ?
            `<li><a href="admin-dashboard.html" class="nav-link text-primary">Admin</a></li>` : ''
        }
                ${user ?
            `<li><a href="#" onclick="auth.logout()" class="nav-link btn-danger" style="padding: 4px 10px; border-radius: 4px; border: 1px solid #f43f5e;">Logout</a></li>` : ''
        }
            </ul>
        </div>
    `;

    const nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.innerHTML = navHTML;
    document.body.prepend(nav);

    // Highlight active link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}


