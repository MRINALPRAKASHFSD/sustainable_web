/* ============================================
   KRMU Green - Stats Page Logic
   Fetch & Display Platform Statistics
   ============================================ */

import { showToast, escapeHtml, timeAgo } from './ui.js';

// DOM Elements
const elements = {
    totalStudents: document.getElementById('totalStudents'),
    totalImpact: document.getElementById('totalImpact'),
    totalActivity: document.getElementById('totalActivity'),
    statsTableBody: document.getElementById('statsTableBody'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportBtn: document.getElementById('exportBtn'),
    searchInput: document.getElementById('searchInput')
};

// Global state
let currentData = {
    activity: []
};

/**
 * Initialize Stats Page
 */
async function initStats() {
    try {
        // Check auth first
        if (!authResponse.ok) {
            window.location.href = 'index.html';
            return;
        }

        // Auth success: Show content
        document.body.classList.remove('auth-loading');

        await Promise.all([
            fetchSummary(),
            fetchActivity()
        ]);

        setupEventListeners();
    } catch (error) {
        console.error('Stats init failed:', error);
        showToast('Error', 'Failed to load statistics', 'error');
    }
}

/**
 * Fetch Summary Stats
 */
async function fetchSummary() {
    try {
        const response = await fetch('/stats/summary');
        if (!response.ok) throw new Error('Failed to fetch summary');

        const data = await response.json();
        if (data.success) {
            elements.totalStudents.textContent = data.stats.studentCount.toLocaleString();
            elements.totalActivity.textContent = data.stats.otpCount.toLocaleString();
            elements.totalImpact.textContent = data.stats.totalImpact.toLocaleString();
        }
    } catch (error) {
        console.error('Fetch summary error:', error);
    }
}

/**
 * Fetch Activity Log
 */
async function fetchActivity() {
    try {
        elements.refreshBtn.classList.add('btn--loading');

        const response = await fetch('/stats/activity');
        if (!response.ok) throw new Error('Failed to fetch activity');

        const data = await response.json();
        if (data.success) {
            currentData.activity = data.activity;
            renderTable(currentData.activity);
        }
    } catch (error) {
        console.error('Fetch activity error:', error);
        showToast('Error', 'Could not refresh data', 'error');
    } finally {
        elements.refreshBtn.classList.remove('btn--loading');
    }
}

/**
 * Render Data Table
 */
function renderTable(data) {
    if (!data || data.length === 0) {
        elements.statsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-6">
                    No activity found
                </td>
            </tr>
        `;
        return;
    }

    elements.statsTableBody.innerHTML = data.map(row => {
        const name = row.name || 'Unknown User';
        const roll = row.roll_number || row.email || '-';
        const action = row.purpose === 'login' ? 'Logged in' : 'Requested OTP';
        const time = timeAgo(row.created_at + 'Z'); // server returns UTC string usually

        return `
            <tr>
                <td data-label="Time" class="text-muted font-mono text-xs">${time}</td>
                <td data-label="Student">${escapeHtml(name)}</td>
                <td data-label="Roll No" class="font-mono text-xs">${escapeHtml(roll)}</td>
                <td data-label="Action">
                    <span class="badge badge--${row.purpose === 'login' ? 'primary' : 'secondary'}">
                        ${action}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filter table based on search
 */
function handleSearch(query) {
    const term = query.toLowerCase();
    const filtered = currentData.activity.filter(item => {
        const name = (item.name || '').toLowerCase();
        const roll = (item.roll_number || item.email || '').toLowerCase();
        return name.includes(term) || roll.includes(term);
    });
    renderTable(filtered);
}

/**
 * Export to CSV
 */
function exportCSV() {
    if (!currentData.activity.length) return;

    // Headers
    const headers = ['Time', 'Student Name', 'Roll Number', 'Email', 'Action'];

    // Rows
    const rows = currentData.activity.map(row => [
        row.created_at,
        row.name || 'Unknown',
        row.roll_number || '',
        row.email || '',
        row.purpose
    ]);

    // Combine
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `krmu_stats_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        fetchSummary();
        fetchActivity();
    });

    // Export button
    elements.exportBtn.addEventListener('click', exportCSV);

    // Search input (debounced)
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(e.target.value);
        }, 300);
    });
}

// Auto-run
initStats();
