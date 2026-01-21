/* ============================================
   KRMU Green - Dashboard Logic
   Fetch user data & stats
   ============================================ */

import { showToast, escapeHtml } from './ui.js';

// DOM Elements
const elements = {
    userName: document.getElementById('userName'),
    totalImpact: document.getElementById('totalImpact'),
    volunteerCount: document.getElementById('volunteerCount'),
    myScore: document.getElementById('myScore'),
    deptLeaderboard: document.getElementById('deptLeaderboard'),
    pledgeList: document.getElementById('pledgeList'),
    logoutBtn: document.getElementById('logoutBtn')
};

/**
 * Initialize Dashboard
 */
async function initDashboard() {
    try {
        // 1. Fetch User Data (Auth Check)
        const user = await fetchUser();
        if (!user) {
            window.location.href = 'index.html'; // Redirect if not logged in
            return;
        }

        // Auth success: Show content
        document.body.classList.remove('auth-loading');

        elements.userName.textContent = user.name || 'Student';

        // 2. Fetch Dashboard Stats
        await fetchStats();

    } catch (error) {
        console.error('Dashboard init failed:', error);
        showToast('Error', 'Failed to load dashboard data', 'error');
    }
}

/**
 * Fetch Current User
 */
async function fetchUser() {
    try {
        const response = await fetch('/auth/me');
        if (!response.ok) throw new Error('Unauthorized');

        const data = await response.json();
        return data.success ? data.user : null;
    } catch (err) {
        return null; // Not logged in
    }
}

/**
 * Fetch Stats (Mocked or Real)
 * TODO: Connect to real stats endpoint once created
 */
async function fetchStats() {
    // Simulate network delay for skeleton effect
    await new Promise(r => setTimeout(r, 800));

    // MOCK DATA (Replace with API call later)
    const stats = {
        totalImpact: 1245,
        volunteers: 86,
        myScore: 42,
        topDepts: [
            { rank: 1, name: 'Computer Science', score: 8540 },
            { rank: 2, name: 'Law', score: 6200 },
            { rank: 3, name: 'Management', score: 5150 },
            { rank: 4, name: 'Engineering', score: 4800 },
            { rank: 5, name: 'Medical', score: 3200 },
        ],
        recentPledges: [
            { name: 'Rahul Sharma', action: 'Planted a tree', time: '2 mins ago', avatar: 'RS' },
            { name: 'Priya Singh', action: 'Recycled e-waste', time: '15 mins ago', avatar: 'PS' },
            { name: 'Amit Kumar', action: 'Volunteered for cleanup', time: '1 hour ago', avatar: 'AK' },
            { name: 'Sneha Gupta', action: 'Reduced plastic use', time: '3 hours ago', avatar: 'SG' },
        ]
    };

    // Update UI
    updateUI(stats);
}

/**
 * Update DOM elements with data
 */
function updateUI(stats) {
    // Top cards
    elements.totalImpact.textContent = stats.totalImpact.toLocaleString();
    elements.volunteerCount.textContent = stats.volunteers;
    elements.myScore.textContent = stats.myScore;

    // Leaderboard
    if (stats.topDepts.length > 0) {
        elements.deptLeaderboard.innerHTML = stats.topDepts.map(dept => `
            <tr>
                <td class="font-medium text-muted">#${dept.rank}</td>
                <td>${escapeHtml(dept.name)}</td>
                <td class="text-right font-mono">${dept.score.toLocaleString()}</td>
            </tr>
        `).join('');
    } else {
        elements.deptLeaderboard.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No data available</td></tr>';
    }

    // Recent Activity
    if (stats.recentPledges.length > 0) {
        elements.pledgeList.innerHTML = stats.recentPledges.map(pledge => `
            <div class="flex items-center gap-3 p-2 hover:bg-muted/10 rounded-md transition-colors">
                <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    ${pledge.avatar}
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium">${escapeHtml(pledge.name)}</div>
                    <div class="text-xs text-muted">${escapeHtml(pledge.action)}</div>
                </div>
                <div class="text-xs text-muted">${pledge.time}</div>
            </div>
        `).join('');
    } else {
        elements.pledgeList.innerHTML = '<div class="text-center text-muted py-4">No recent activity</div>';
    }
}

/**
 * Logout handler
 */
if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout failed', error);
        }
    });
}

// Auto-run
initDashboard();
