/* ============================================
   KRMU Green - Glass Shine Effect
   Subtle parallax shine that follows cursor
   ============================================ */

/**
 * Initializes the glass shine effect on elements with .glass class
 * Respects prefers-reduced-motion and disables on low-power devices
 */
export function initGlassShine() {
    // Skip if reduced motion is preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    // Skip on low-power devices
    if (isLowPowerDevice()) {
        return;
    }

    // Find all glass elements with shine overlays
    const glassElements = document.querySelectorAll('.glass');

    glassElements.forEach(glass => {
        const shine = glass.querySelector('.glass__shine');
        if (!shine || shine.classList.contains('glass__shine--static')) return;

        let rafId = null;
        let lastUpdate = 0;
        const THROTTLE_MS = 16; // ~60fps max

        // Show shine on hover
        glass.addEventListener('mouseenter', () => {
            shine.style.setProperty('--shine-opacity', '1');
        });

        // Hide shine on leave
        glass.addEventListener('mouseleave', () => {
            shine.style.setProperty('--shine-opacity', '0');
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        });

        // Update shine position on mouse move (throttled)
        glass.addEventListener('mousemove', (e) => {
            const now = performance.now();
            if (now - lastUpdate < THROTTLE_MS) return;

            if (rafId) return; // Don't queue multiple frames

            rafId = requestAnimationFrame(() => {
                const rect = glass.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                shine.style.setProperty('--shine-x', `${x}%`);
                shine.style.setProperty('--shine-y', `${y}%`);

                lastUpdate = performance.now();
                rafId = null;
            });
        });
    });
}

/**
 * Check if device is likely low-power based on heuristics
 */
function isLowPowerDevice() {
    // Check for low memory
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
        return true;
    }

    // Check for low CPU cores
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        return true;
    }

    // Check for slow connection
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g')) {
        return true;
    }

    // Check for mobile with small screen (likely low-end)
    if (window.innerWidth <= 400 && /Android|iPhone/i.test(navigator.userAgent)) {
        return true;
    }

    return false;
}

/**
 * Alternative: Gyroscope-based shine for mobile (tilt)
 * Only activates if DeviceOrientationEvent is supported
 */
export function initGyroscopeShine() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    if (!window.DeviceOrientationEvent || isLowPowerDevice()) {
        return;
    }

    const glassElements = document.querySelectorAll('.glass');

    window.addEventListener('deviceorientation', (e) => {
        if (e.gamma === null || e.beta === null) return;

        // Normalize gamma (-90 to 90) and beta (-180 to 180) to 0-100%
        const x = 50 + (e.gamma / 45) * 30; // ±30% range
        const y = 50 + (e.beta / 90) * 30;

        glassElements.forEach(glass => {
            const shine = glass.querySelector('.glass__shine');
            if (!shine || shine.classList.contains('glass__shine--static')) return;

            shine.style.setProperty('--shine-x', `${Math.max(0, Math.min(100, x))}%`);
            shine.style.setProperty('--shine-y', `${Math.max(0, Math.min(100, y))}%`);
            shine.style.setProperty('--shine-opacity', '1');
        });
    }, { passive: true });
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassShine);
} else {
    initGlassShine();
}
