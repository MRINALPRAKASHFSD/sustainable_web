/* ============================================
   KRMU Green - Auth Module
   OTP Authentication Client (ES6)
   ============================================ */

// Automatically detect API URL based on current domain
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;

// ========== State ==========
let resendTimer = null;
let resendCountdown = 0;

// ========== API Helpers ==========
async function apiRequest(endpoint, data) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        return await res.json();
    } catch {
        return { success: false };
    }
}

async function logout() {
    await apiRequest('/auth/logout', {});
    window.location.href = 'login.html';
}

// ========== OTP Functions ==========
async function requestOTP(identifier, purpose) {
    return await apiRequest('/auth/request-otp', { identifier, purpose });
}

async function verifyOTP(email, otp, purpose, payload = null) {
    const data = { email, otp, purpose };
    if (payload) data.payload = payload;

    // 1. Verify OTP with our backend
    const result = await apiRequest('/auth/verify-otp', data);

    // 2. If successful and we received a Firebase Token, sign in
    if (result.success && result.firebaseToken) {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signInWithCustomToken(result.firebaseToken);
                // console.log('🔥 Firebase Sign-In Successful');
            } else {
                console.warn('Firebase SDK not loaded, skipping Firebase auth');
            }
        } catch (error) {
            console.error('Firebase Custom Token Sign-In Error:', error);
            // We don't fail the whole login if Firebase fails, 
            // but you might want to show a warning or fallback.
        }
    }

    return result;
}

// ========== UI Helpers ==========
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message || '';
        el.setAttribute('aria-live', 'polite');
    }
}

function setLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.disabled = loading;

    if (loading) {
        btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
        btn.classList.add('btn--loading');
        btn.setAttribute('aria-busy', 'true');
    } else {
        btn.classList.remove('btn--loading');
        btn.removeAttribute('aria-busy');
        if (btn.dataset.originalText) {
            btn.textContent = btn.dataset.originalText;
        }
    }
}

// ========== Resend Timer ==========
function startResendTimer(buttonId, seconds = 30) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    clearResendTimer();
    resendCountdown = seconds;
    btn.disabled = true;

    const updateTimer = () => {
        if (resendCountdown > 0) {
            btn.textContent = `Resend code (${resendCountdown}s)`;
            resendCountdown--;
            resendTimer = setTimeout(updateTimer, 1000);
        } else {
            btn.textContent = 'Resend code';
            btn.disabled = false;
        }
    };

    updateTimer();
}

function clearResendTimer() {
    if (resendTimer) {
        clearTimeout(resendTimer);
        resendTimer = null;
    }
}

// ========== OTP Input Component ==========
function setupOTPInput(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Generate 6 OTP digit inputs with new class names
    container.innerHTML = Array(6).fill(0).map((_, i) => `
    <input 
      type="text" 
      maxlength="1" 
      class="otp-input__digit" 
      data-index="${i}" 
      inputmode="numeric" 
      pattern="[0-9]" 
      autocomplete="one-time-code"
      aria-label="Digit ${i + 1} of 6"
      placeholder="·"
    >
  `).join('');

    const inputs = container.querySelectorAll('.otp-input__digit');

    inputs.forEach((input, i) => {
        // Handle input
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '');
            e.target.value = value.slice(-1);

            // Add filled class for styling
            e.target.classList.toggle('otp-input__digit--filled', !!e.target.value);

            // Auto-advance to next input
            if (value && i < 5) {
                inputs[i + 1].focus();
            }

            // Auto-submit when all 6 digits entered
            if (i === 5 && value) {
                const allFilled = Array.from(inputs).every(inp => inp.value);
                if (allFilled) {
                    // Trigger form submit
                    const form = container.closest('form');
                    if (form) {
                        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }
                }
            }
        });

        // Handle backspace navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && i > 0) {
                inputs[i - 1].focus();
                inputs[i - 1].value = '';
                inputs[i - 1].classList.remove('otp-input__digit--filled');
            }

            // Arrow key navigation
            if (e.key === 'ArrowLeft' && i > 0) {
                e.preventDefault();
                inputs[i - 1].focus();
            }
            if (e.key === 'ArrowRight' && i < 5) {
                e.preventDefault();
                inputs[i + 1].focus();
            }
        });

        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData)
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, 6);

            paste.split('').forEach((char, j) => {
                if (inputs[j]) {
                    inputs[j].value = char;
                    inputs[j].classList.add('otp-input__digit--filled');
                }
            });

            // Focus last filled or next empty
            const focusIndex = Math.min(paste.length, 5);
            inputs[focusIndex].focus();

            // Auto-submit if 6 digits pasted
            if (paste.length >= 6) {
                const form = container.closest('form');
                if (form) {
                    setTimeout(() => {
                        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }, 100);
                }
            }
        });

        // Select all on focus
        input.addEventListener('focus', () => {
            input.select();
        });
    });
}

function getOTPValue(containerId) {
    const inputs = document.querySelectorAll(`#${containerId} .otp-input__digit`);
    return Array.from(inputs).map(i => i.value).join('');
}

function clearOTPInput(containerId) {
    const inputs = document.querySelectorAll(`#${containerId} .otp-input__digit`);
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('otp-input__digit--filled');
    });
    if (inputs[0]) inputs[0].focus();
}

// ========== Toast Notifications ==========
function showToast(title, message, type = 'success', duration = 4000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const titleEl = toast.querySelector('.toast__title');
    const messageEl = toast.querySelector('.toast__message');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    // Reset classes
    toast.classList.remove('toast--success', 'toast--error', 'toast--visible');

    // Add type class
    toast.classList.add(`toast--${type}`);

    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
    });

    // Auto-hide
    setTimeout(() => {
        toast.classList.remove('toast--visible');
    }, duration);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.remove('toast--visible');
    }
}

// ========== Export for Global Access ==========
window.auth = {
    // API
    requestOTP,
    verifyOTP,
    checkAuth,
    logout,

    // UI Helpers
    showError,
    setLoading,
    showToast,
    hideToast,

    // Timer
    startResendTimer,
    clearResendTimer,

    // OTP Input
    setupOTPInput,
    getOTPValue,
    clearOTPInput
};
