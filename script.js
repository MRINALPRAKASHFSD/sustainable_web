/* script.js - UPDATED FOR MORE QUESTIONS */

window.addEventListener('firebase-ready', () => {
    console.log("✅ Live Database Active");
    initApp();
});

setTimeout(() => {
    if (!window.db && !window.appInitialized) {
        console.warn("⚠️ Firebase is taking a while...");
    }
}, 3000);

function initApp() {
    window.appInitialized = true;
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const roll = document.getElementById('roll').value;
            localStorage.setItem('krmu_user', JSON.stringify({ roll: roll }));
            window.location.href = 'form.html';
        });
    }
    const surveyForm = document.getElementById('surveyForm');
    if (surveyForm) {
        setupForm();
    }
    if (document.getElementById('totalCount')) {
        setupLiveDashboard();
    }
}

// =========================================
// A. SUBMIT FORM TO FIREBASE (UPDATED)
// =========================================
function setupForm() {
    const user = JSON.parse(localStorage.getItem('krmu_user'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('userDisplay').textContent = "ID: " + user.roll;

    document.getElementById('surveyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // COLLECT ALL 6 DATA POINTS
        const newData = {
            roll: user.roll,
            dept: document.getElementById('department').value,
            transport: document.getElementById('transport').value,      // NEW
            improvement: document.getElementById('improvement').value,  // NEW
            score: document.getElementById('commitment').value,
            volunteer: document.getElementById('volunteer').value,
            pledge: document.getElementById('pledge').value,
            timestamp: new Date().toISOString()
        };

        const submissionsRef = window.dbRef(window.db, 'submissions');
        window.dbPush(submissionsRef, newData)
            .then(() => {
                generateCertificate(user.roll);
                setTimeout(() => {
                    alert('✅ Synced to Cloud! Redirecting...');
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch((error) => {
                alert("❌ Sync Error: " + error.message);
            });
    });
}

// =========================================
// B. LIVE DASHBOARD
// =========================================
function setupLiveDashboard() {
    const submissionsRef = window.dbRef(window.db, 'submissions');
    window.dbOnValue(submissionsRef, (snapshot) => {
        const rawData = snapshot.val();
        const data = rawData ? Object.values(rawData) : [];
        updateDashboardUI(data);
    });
}

function updateDashboardUI(data) {
    document.getElementById('totalCount').textContent = data.length;
    
    if (data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + parseInt(curr.score || 0), 0);
        document.getElementById('avgScore').textContent = (sum / data.length).toFixed(1);
    } else {
        document.getElementById('avgScore').textContent = "0.0";
    }

    const volCount = data.filter(d => d.volunteer === 'Yes').length;
    document.getElementById('volunteers').textContent = volCount;

    const deptCounts = {};
    data.forEach(d => { deptCounts[d.dept] = (deptCounts[d.dept] || 0) + 1; });
    
    const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const leaderboardEl = document.getElementById('deptLeaderboard');
    
    if(leaderboardEl) {
        if (sortedDepts.length === 0) {
            leaderboardEl.innerHTML = '<p style="color:#666; font-size:0.9rem;">Waiting for data...</p>';
        } else {
            leaderboardEl.innerHTML = sortedDepts.map((d, index) => `
                <div class="leader-item">
                    <div style="display:flex; align-items:center;">
                        <span class="rank-badge">${index + 1}</span>
                        <span style="font-weight:bold; color:#fff;">${d[0]}</span>
                    </div>
                    <span style="color:var(--primary); font-weight:bold;">${d[1]}</span>
                </div>
            `).join('');
        }
    }

    const list = document.getElementById('pledgeList');
    if (data.length === 0) {
        list.innerHTML = '<p style="color:#666; font-size:0.9rem;">Waiting for live data...</p>';
    } else {
        list.innerHTML = data.slice().reverse().map(d => `
            <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); font-size:0.9rem; color:#ccc;">
                <span style="color:var(--primary)">${d.dept}</span>: "${d.pledge}"
            </div>
        `).join('');
    }
}

// =========================================
// C. UTILITIES (Updated CSV Export)
// =========================================
function generateCertificate(roll) {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 800, 600);
    ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 15; ctx.strokeRect(20, 20, 760, 560);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
    ctx.fillText("CERTIFICATE OF PLEDGE", 400, 150);
    ctx.font = '25px Arial'; ctx.fillText("Student Roll Number:", 400, 240);
    ctx.fillStyle = '#00ff9d'; ctx.font = 'bold 50px Arial';
    ctx.shadowColor = "#00ff9d"; ctx.shadowBlur = 20;
    ctx.fillText(roll, 400, 310); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.font = '25px Arial';
    ctx.fillText("Has committed to the KRMU Green Initiative.", 400, 400);
    
    const link = document.createElement('a');
    link.download = `KRMU_Certificate_${roll}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

window.logout = function() {
    localStorage.removeItem('krmu_user');
    window.location.href = 'index.html';
}

// UPDATED EXPORT TO INCLUDE NEW FIELDS
window.exportToCSV = function() {
    const submissionsRef = window.dbRef(window.db, 'submissions');
    window.dbOnValue(submissionsRef, (snapshot) => {
        const rawData = snapshot.val();
        const data = rawData ? Object.values(rawData) : [];
        
        if (data.length === 0) { alert("No data to export!"); return; }

        // Added Transport and Improvement to columns
        let csv = "Roll,Department,Transport,Improvement_Area,Score,Volunteer,Pledge,Time\n";
        data.forEach(row => {
            // Handle missing fields for old data
            const transport = row.transport || "N/A";
            const imp = row.improvement || "N/A";
            
            csv += `${row.roll},${row.dept},${transport},${imp},${row.score},${row.volunteer},"${row.pledge.replace(/"/g, '""')}",${row.timestamp}\n`;
        });

        const link = document.createElement("a");
        link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
        link.download = "krmu_live_data.csv";
        link.click();
    }, { onlyOnce: true });
}

window.clearData = function() {
    alert("⚠️ Admin: To clear live data, please delete it from the Firebase Console.");
}