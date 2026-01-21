/* script.js - 3D ANIMATED FLASHCARD EDITION */

// HTML Sanitization Helper - Prevents XSS attacks
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

window.addEventListener('firebase-ready', () => { initApp(); });

// Added explanations based on your PDF content
const QUIZ_DATA = [
    { q: "Agenda 2030 is regarded as the global treaty of the future because the 17 goals ensure that:", options: ["The world is becoming suitable for grandchildren", "Climate change is stopped", "People are living in peace"], ans: 0, exp: "The goals ensure resources are preserved so the world remains suitable for future generations (grandchildren)." },
    { q: "193 states have signed Agenda 2030. What about the other states (e.g., Kosovo)?", options: ["They are against it", "Their status is controversial/Not recognized by UN", "They don't want to join"], ans: 1, exp: "Some states like Kosovo have controversial status and are not recognized by the UN as independent states." },
    { q: "Which SDG is considered the greatest global challenge?", options: ["Global energy transformation", "Eradicate poverty worldwide", "Education for all"], ans: 1, exp: "SDG 1: No Poverty is widely considered the primary and greatest global challenge." },
    { q: "The Sustainable Development Goals (SDGs) relate to:", options: ["All countries", "Rich countries", "Poor countries"], ans: 0, exp: "SDGs apply to all countries universally, regardless of their economic status." },
    { q: "How many Sustainable Development Goals are there?", options: ["9", "17", "23"], ans: 1, exp: "There are 17 goals adopted by the UN in 2015 to be achieved by 2030." },
    { q: "The three pillars of sustainable development are:", options: ["Love, peace, joy", "Stock market, banks, companies", "Society, economy, environment"], ans: 2, exp: "Sustainability relies on the balance of Social, Economic, and Environmental factors (The Triple Bottom Line)." },
    { q: "What year has the UN set for achieving the SDGs?", options: ["2015", "2030", "2050"], ans: 1, exp: "The agenda is explicitly titled 'Agenda 2030'." },
    { q: "What can you do to consume more responsibly (SDG12)?", options: ["Buy new clothes every season", "Repair appliances that no longer work", "Throw away unused things"], ans: 1, exp: "Repairing reduces waste and consumption, which aligns with SDG 12: Responsible Consumption and Production." },
    { q: "Which of these is NOT an SDG?", options: ["Decent work and economic growth", "Profit maximization and cheap labor", "Industry, innovation and infrastructure"], ans: 1, exp: "Profit maximization at the cost of cheap labor violates the principles of decent work and equality." },
    { q: "What is sustainable development?", options: ["Meeting present needs without compromising future", "Conserving resources", "Eco-friendly models", "All of the above"], ans: 3, exp: "It encompasses all these aspects: intergenerational equity, resource conservation, and eco-friendly practices." },
    { q: "Social + Economic Sustainability =", options: ["Equitable", "Bearable", "Viable", "None"], ans: 0, exp: "When something is socially and economically sound, it is considered 'Equitable'." },
    { q: "Sustainability refers to a process that can be maintained indefinitely.", options: ["True", "False"], ans: 0, exp: "Sustainability literally means the ability to be maintained at a certain rate or level." },
    { q: "Which is NOT an objective of sustainable development?", options: ["Family planning", "Balance of arable land", "Catastrophic transformation of environment"], ans: 2, exp: "Sustainable development aims to prevent catastrophic damage, not cause it." },
    { q: "Primary Goals of Sustainability include:", options: ["End of poverty", "Gender equality", "Sustainable economic growth", "All of the above"], ans: 3, exp: "These are all core components of the 17 SDGs." },
    { q: "In which year did the term 'Sustainable Development' come into existence?", options: ["1987", "1980", "1992"], ans: 1, exp: "The term was popularized in 1980 (World Conservation Strategy) and later defined in the Brundtland Report (1987)." },
    { q: "The UN Commission on Sustainable Development (CSD) was established in:", options: ["1992", "1993", "1995"], ans: 0, exp: "It was established by the UN General Assembly in 1992." },
    { q: "Which commission reviews Agenda 21 progress?", options: ["UN Disarmament Commission", "UN Statistical Commission", "UN CSD"], ans: 2, exp: "The CSD was specifically created to monitor Agenda 21." },
    { q: "Parameters of sustainable development help to:", options: ["Understand the concept", "Point out problems", "Take policy measures", "All of the above"], ans: 3, exp: "Parameters provide the metrics needed to understand, identify issues, and create policy." },
    { q: "Which is included in parameters of sustainable development?", options: ["Carrying capacity", "Inter-generation equity", "Gender disparity", "All of the above"], ans: 3, exp: "All these factors are critical measures of a sustainable society." },
    { q: "What is the 'triple bottom line'?", options: ["Profit, product, people", "Economic, environmental, social factors", "Business, government, community"], ans: 1, exp: "TBL is defined as People (Social), Planet (Environmental), and Profit (Economic)." }
];

let currentQuestionIndex = 0;
let currentScore = 0;
let currentUserRoll = "";
let isLocked = false;

function initApp() {
    // Initialize quiz if on quiz page
    if (document.getElementById('card-inner')) {
        // Auth is handled by form.html script - wait for initQuiz call
    }
    // Initialize dashboard if on dashboard page  
    if (document.getElementById('totalCount')) setupLiveDashboard();
}

// Called from form.html after auth check
window.initQuiz = function (rollNumber) {
    currentUserRoll = rollNumber;
    loadQuestion(0);
};

// --- AUTH LOGIC ---
function setupAuthPage() {
    const toggle = document.getElementById('toggleAuth');
    document.getElementById('toggleAuth').addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        const toggleText = document.getElementById('toggleText');

        if (isRegistering) {
            formTitle.textContent = "Student Register";
            submitBtn.textContent = "Create Account";
            toggleText.textContent = "Have account?";
            toggle.textContent = "Login";
        } else {
            formTitle.textContent = "Student Login";
            submitBtn.textContent = "Login";
            toggleText.textContent = "New here?";
            toggle.textContent = "Register";
        }
    });

    document.getElementById('authForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const roll = document.getElementById('roll').value.trim();
        const pass = document.getElementById('pass').value;

        // Input validation - prevent injection and ensure proper format
        if (!/^[a-zA-Z0-9]{5,15}$/.test(roll)) {
            alert('Invalid roll number format. Use 5-15 alphanumeric characters only.');
            return;
        }
        if (pass.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        const email = `${roll}@krmu.edu.in`;

        const p = isRegistering
            ? window.createUserWithEmailAndPassword(window.auth, email, pass)
            : window.signInWithEmailAndPassword(window.auth, email, pass);

        p.then(() => window.location.href = 'form.html')
            .catch(err => alert(err.message));
    });
}

// --- FLASHCARD QUIZ LOGIC ---
function loadQuestion(index) {
    const q = QUIZ_DATA[index];
    const cardInner = document.getElementById('card-inner');

    // Reset Card State
    cardInner.classList.remove('flipped');
    isLocked = false;

    // UI Updates
    document.getElementById('question-text').textContent = q.q;
    document.getElementById('q-number').textContent = index + 1;
    document.getElementById('correct-answer-display').textContent = "Correct Answer: " + q.options[q.ans];
    document.getElementById('explanation-text').textContent = q.exp;

    // Reset Buttons
    document.getElementById('skipBtn').style.display = "block";
    document.getElementById('flipBtn').style.display = "none";
    document.getElementById('nextBtn').style.display = "none";

    // Build Options
    const optsContainer = document.getElementById('options-container');
    optsContainer.innerHTML = '';

    q.options.forEach((opt, i) => {
        const btn = document.createElement('div');
        btn.className = 'quiz-option';
        btn.style.padding = '15px';
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
        btn.style.borderRadius = '10px';
        btn.style.cursor = 'pointer';
        btn.style.color = 'white';
        btn.style.textAlign = 'left';
        btn.textContent = opt;

        btn.onclick = () => handleAnswer(i, index, btn);
        optsContainer.appendChild(btn);
    });

    // Button Listeners
    document.getElementById('skipBtn').onclick = () => handleAnswer(-1, index, null);

    document.getElementById('flipBtn').onclick = () => {
        cardInner.classList.toggle('flipped');
    };

    document.getElementById('flipBackBtn').onclick = () => {
        cardInner.classList.remove('flipped');
    };

    document.getElementById('nextBtn').onclick = () => {
        if (index < QUIZ_DATA.length - 1) loadQuestion(index + 1);
        else finishQuiz();
    };
}

function handleAnswer(selectedIndex, qIndex, btn) {
    if (isLocked) return;
    isLocked = true;

    const correctIndex = QUIZ_DATA[qIndex].ans;
    const opts = document.getElementById('options-container').children;
    const toast = document.getElementById('toast');

    // 1. Scoring Logic
    if (selectedIndex === -1) {
        // SKIP
        showToast("Skipped (0)", "popup-skip");
        // Highlight correct anyway
        opts[correctIndex].classList.add('correct');
    }
    else if (selectedIndex === correctIndex) {
        // CORRECT
        currentScore += 5;
        btn.classList.add('correct');
        showToast("Correct! +5", "popup-correct");
    }
    else {
        // WRONG
        currentScore -= 1;
        btn.classList.add('wrong');
        btn.classList.add('shake');
        opts[correctIndex].classList.add('correct'); // Show right answer
        showToast("Incorrect! -1", "popup-wrong");
    }

    // 2. Update Score Display
    document.getElementById('current-score').textContent = currentScore;

    // 3. UI Changes
    Array.from(opts).forEach(o => o.style.pointerEvents = 'none'); // Disable clicks
    document.getElementById('skipBtn').style.display = 'none';
    document.getElementById('flipBtn').style.display = 'block';
    document.getElementById('nextBtn').style.display = 'block';
}

function showToast(msg, className) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `popup-toast show ${className}`;
    setTimeout(() => {
        toast.className = 'popup-toast';
    }, 1500);
}

function finishQuiz() {
    const total = QUIZ_DATA.length * 5;
    const newData = {
        roll: currentUserRoll,
        score: currentScore,
        total: total,
        dept: "Flashcard",
        pledge: `Final Score: ${currentScore}`,
        volunteer: "Yes",
        timestamp: new Date().toISOString()
    };

    window.dbPush(window.dbRef(window.db, 'submissions'), newData).then(() => {
        alert(`Quiz Finished! Final Score: ${currentScore}`);
        window.location.href = 'dashboard.html';
    });
}

// --- DASHBOARD LOGIC (Minimal) ---
function setupLiveDashboard() {
    window.dbOnValue(window.dbRef(window.db, 'submissions'), (snap) => {
        const data = snap.val() ? Object.values(snap.val()) : [];
        document.getElementById('totalCount').textContent = data.length;
        if (data.length) {
            const sum = data.reduce((a, b) => a + parseInt(b.score || 0), 0);
            document.getElementById('avgScore').textContent = Math.round(sum / data.length);
        }
        const list = document.getElementById('pledgeList');
        if (list && data.length) {
            list.innerHTML = data.slice().reverse().map(d => `
                <div style="padding:10px; border-bottom:1px solid #333; color:#ccc;">
                    <span style="color:#00ff9d">${escapeHtml(d.roll)}</span>: ${escapeHtml(d.pledge)}
                </div>`).join('');
        }
    });
}

window.logout = function () { window.signOut(window.auth).then(() => window.location.href = 'index.html'); }