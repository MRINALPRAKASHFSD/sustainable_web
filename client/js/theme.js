/* ============================================
   KRMU Green - Theme Manager
   Light / Dark / System theme support
   ============================================ */

const THEME_KEY = 'krmu-theme';
const THEMES = ['light', 'dark', 'system'];

/**
 * Get the current theme preference from localStorage
 * @returns {'light' | 'dark' | 'system'}
 */
export function getThemePreference() {
    const stored = localStorage.getItem(THEME_KEY);
    return THEMES.includes(stored) ? stored : 'system';
}

/**
 * Get the resolved theme (what's actually applied)
 * @returns {'light' | 'dark'}
 */
export function getResolvedTheme() {
    const pref = getThemePreference();
    if (pref === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return pref;
}

/**
 * Apply the theme to the document
 * @param {'light' | 'dark'} theme 
 */
export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.content = theme === 'dark' ? '#0a0a0c' : '#ffffff';
    }
}

/**
 * Set and persist theme preference
 * @param {'light' | 'dark' | 'system'} theme 
 */
export function setTheme(theme) {
    if (!THEMES.includes(theme)) return;

    localStorage.setItem(THEME_KEY, theme);
    applyTheme(getResolvedTheme());

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('theme-change', {
        detail: { preference: theme, resolved: getResolvedTheme() }
    }));
}

/**
 * Initialize theme system
 * - Apply saved theme
 * - Listen for system preference changes
 */
export function initTheme() {
    // Apply initial theme
    applyTheme(getResolvedTheme());

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        if (getThemePreference() === 'system') {
            applyTheme(getResolvedTheme());
        }
    });
}

/**
 * Create and mount theme toggle component
 * @param {HTMLElement} container - Element to mount toggle into
 */
export function createThemeToggle(container) {
    const currentPref = getThemePreference();

    container.innerHTML = `
    <div class="theme-toggle" role="group" aria-label="Theme selection">
      <button 
        type="button"
        class="theme-toggle__btn ${currentPref === 'light' ? 'theme-toggle__btn--active' : ''}"
        data-theme="light"
        aria-pressed="${currentPref === 'light'}"
        aria-label="Light theme"
        title="Light"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      </button>
      <button 
        type="button"
        class="theme-toggle__btn ${currentPref === 'dark' ? 'theme-toggle__btn--active' : ''}"
        data-theme="dark"
        aria-pressed="${currentPref === 'dark'}"
        aria-label="Dark theme"
        title="Dark"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
      <button 
        type="button"
        class="theme-toggle__btn ${currentPref === 'system' ? 'theme-toggle__btn--active' : ''}"
        data-theme="system"
        aria-pressed="${currentPref === 'system'}"
        aria-label="System theme"
        title="System"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>
    </div>
  `;

    // Add click handlers
    container.querySelectorAll('.theme-toggle__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);

            // Update active states
            container.querySelectorAll('.theme-toggle__btn').forEach(b => {
                const isActive = b.dataset.theme === theme;
                b.classList.toggle('theme-toggle__btn--active', isActive);
                b.setAttribute('aria-pressed', isActive);
            });
        });
    });
}

// Auto-init when imported as module
initTheme();

// Export for global access
window.theme = {
    get: getThemePreference,
    getResolved: getResolvedTheme,
    set: setTheme,
    apply: applyTheme,
    init: initTheme,
    createToggle: createThemeToggle
};
