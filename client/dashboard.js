/* dashboard.js */

const STORAGE_SUBMISSIONS = 'krmu_submissions';
const STORAGE_CURRENT = 'krmu_current_user';

document.addEventListener('DOMContentLoaded', () => {
    // NOTE: This dashboard shows public aggregate statistics
    // For admin-only features, use Firebase Auth custom claims
    // and verify on the server/Firebase Security Rules

    // 2. Initialize
    const submissions = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS) || '[]');
    initStats(submissions);
    initTable(submissions);
    initChart(submissions);
    bindEvents(submissions);

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_CURRENT);
        window.location.href = 'index.html';
    });
});

function initStats(data) {
    document.getElementById('totalSubmissions').textContent = data.length;

    // Calculate High Commitment (>8)
    const committed = data.filter(d => parseInt(d.commitment) > 8).length;
    document.getElementById('highCommitment').textContent = committed;

    // Calculate Volunteers (Checking nested data property)
    const volunteers = data.filter(d => d.data.volunteer === 'Yes').length;
    document.getElementById('totalVolunteers').textContent = volunteers;
}

function initTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = ''; // Clear

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No submissions found.</td></tr>';
        return;
    }

    data.forEach(sub => {
        const tr = document.createElement('tr');
        const date = new Date(sub.timestamp).toLocaleDateString();

        tr.innerHTML = `
            <td>${date}</td>
            <td>${sub.roll}</td>
            <td>${sub.data.fullName || 'N/A'}</td>
            <td>${sub.department}</td>
            <td>${sub.year}</td>
            <td>
                <div style="background: rgba(255,255,255,0.1); width: 100%; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${sub.commitment * 10}%; background: #27ae60; height: 6px;"></div>
                </div>
                <small>${sub.commitment}/10</small>
            </td>
            <td>
                <button class="btn-sm btn-secondary" onclick="viewDetails('${sub.roll}')">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('showingText').textContent = `Showing ${data.length} records`;
}

function viewDetails(roll) {
    const data = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS));
    const sub = data.find(s => s.roll === roll);
    if (sub) {
        alert(`Details for ${sub.data.fullName}:\n\npledge: ${sub.data.pledgeText}\nCampus Idea: ${sub.data.campusIdea}`);
    }
}

// --- Vanilla JS Canvas Chart ---
function initChart(data) {
    const canvas = document.getElementById('deptChart');
    if (!canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    // Aggregation
    const counts = {};
    data.forEach(d => {
        counts[d.department] = (counts[d.department] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    // Canvas settings
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    const maxVal = Math.max(...values, 5); // Minimum scale of 5

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Bars
    const barWidth = width / labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const barHeight = (val / maxVal) * height;
        const x = padding + (i * barWidth) + (barWidth * 0.1);
        const y = canvas.height - padding - barHeight;

        // Bar
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(x, y, barWidth * 0.8, barHeight);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + (barWidth * 0.4), canvas.height - padding + 15);
        ctx.fillText(val, x + (barWidth * 0.4), y - 5);
    });

    // Axis line
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
}

function bindEvents(allData) {
    const searchInput = document.getElementById('searchInput');
    const deptFilter = document.getElementById('deptFilter');

    const filterData = () => {
        const term = searchInput.value.toLowerCase();
        const dept = deptFilter.value;

        const filtered = allData.filter(item => {
            const matchesSearch = item.roll.includes(term) || (item.data.fullName && item.data.fullName.toLowerCase().includes(term));
            const matchesDept = dept === 'All' || item.department === dept;
            return matchesSearch && matchesDept;
        });

        initTable(filtered);
    };

    searchInput.addEventListener('input', filterData);
    deptFilter.addEventListener('change', filterData);

    // Export to CSV
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (allData.length === 0) return alert("No data to export");

        let csv = "Roll Number,Name,Department,Year,Commitment,Volunteer,Pledge\n";
        allData.forEach(row => {
            // Escape commas in text fields
            const cleanName = (row.data.fullName || '').replace(/,/g, '');
            const cleanPledge = (row.data.pledgeText || '').replace(/,/g, ' ').replace(/\n/g, ' ');

            csv += `${row.roll},${cleanName},${row.department},${row.year},${row.commitment},${row.data.volunteer},${cleanPledge}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'krmu_sustainability_report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}