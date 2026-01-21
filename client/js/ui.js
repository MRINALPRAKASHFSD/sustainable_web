/* ============================================
   KRMU Green - UI Utilities
   Toasts, Spinners, Formatters & Helpers
   ============================================ */

/**
 * Show a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {'success'|'error'|'info'} type - Notification type
 * @param {number} duration - Duration in ms (default 5000)
 */
export function showToast(title, message, type = 'info', duration = 5000) {
    let container = document.getElementById('toast-container');

    // Create container if not exists
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: var(--space-4);
            right: var(--space-4);
            left: var(--space-4);
            max-width: 420px;
            margin-left: auto;
            z-index: var(--z-toast);
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.style.pointerEvents = 'auto'; // allow clicking toast
    toast.innerHTML = `
        <div class="toast__title">${escapeHtml(title)}</div>
        <div class="toast__message">${escapeHtml(message)}</div>
    `;

    // Add to container
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, duration);
}

/**
 * Show global loading spinner
 */
export function showGlobalSpinner() {
    let overlay = document.getElementById('global-spinner');
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'global-spinner';
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner spinner--lg"></div>';
    document.body.appendChild(overlay);
}

/**
 * Hide global loading spinner
 */
export function hideGlobalSpinner() {
    const overlay = document.getElementById('global-spinner');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Create a simple accessible alert element
 */
export function createAlert(title, message, type = 'info') {
    return `
        <div class="alert alert--${type}" role="alert">
            <div class="alert__title">${escapeHtml(title)}</div>
            <div class="alert__message">${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Utility: Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Escape HTML to prevent XSS
 */
export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format relative time (e.g. "2 mins ago")
 */
export function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";

    return "just now";
}

// Export global for convenience if needed
window.ui = {
    showToast,
    showGlobalSpinner,
    hideGlobalSpinner,
    createAlert,
    escapeHtml,
    timeAgo
};
