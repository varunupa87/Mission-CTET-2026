/* ===================== CONFIG ===================== */
// Change these before you publish the site publicly.
// NOTE: this is a client-side-only check for a personal practice site — anyone who
// views the page source can see these values, so don't reuse a real password here.
const CREDENTIALS = { username: "Madhu", password: "Madhu@88" };

const SECONDS_PER_QUESTION = 45;   // timer budget per question
const PASS_PERCENT = 60;           // pass threshold — CTET's actual cutoff varies by category/cycle

const STUDY_FILES = [
  { key:"cdp",    label:"1. Child Dev. & Pedagogy", file:"01_Child_Development_and_Pedagogy.md" },
  { key:"math",   label:"2. Mathematics",           file:"02_Mathematics.md" },
  { key:"sci",    label:"3. Science",                file:"03_Science.md" },
  { key:"ss",     label:"4. Social Studies",         file:"04_Social_Studies.md" },
  { key:"lang",   label:"5. Language I & II",        file:"05_Language_I_and_II.md" },
];

/* ===================== PREPROCESS QUESTION DATA ===================== */
// Resolve "__SAME__" passage placeholders to the actual passage text of the group,
// and pre-flatten each paper's questions into quiz-ready order.
PAPERS.forEach(paper => {
  let lastPassage = null;
  paper.questions.forEach(q => {
    if (q.passage === "__SAME__") {
      q.passage = lastPassage;
    } else if (q.passage) {
      lastPassage = q.passage;
    }
  });
});

/* ===================== STATE ===================== */
let currentPaper = null;
let currentIndex = 0;
let score = 0, correctCount = 0, incorrectCount = 0;
let answered = false;
let timerInterval = null;
let secondsLeft = 0;
let startTime = null;
let activeTab = "study";
let studyLoaded = {};

/* ===================== ELEMENTS ===================== */
const screenLogin = document.getElementById("screen-login");
const mainApp = document.getElementById("main-app");

function showLoggedIn(loggedIn){
  screenLogin.classList.toggle("active", !loggedIn);
  mainApp.classList.toggle("active", loggedIn);
}

/* ===================== LOGIN ===================== */
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value;
  const errorEl = document.getElementById("login-error");

  if(user === CREDENTIALS.username && pass === CREDENTIALS.password){
    errorEl.hidden = true;
    sessionStorage.setItem("ctet_logged_in", "1");
    showLoggedIn(true);
    initApp();
  } else {
    errorEl.hidden = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem("ctet_logged_in");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  showLoggedIn(false);
});

/* ===================== TAB NAVIGATION ===================== */
function switchTab(tab){
  activeTab = tab;
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  if(tab === "study") loadStudySubject(currentStudyKey || STUDY_FILES[0].key);
}
document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* ===================== STUDY MATERIAL ===================== */
let currentStudyKey = null;

function renderStudySidebar(){
  const sidebar = document.getElementById("study-sidebar");
  sidebar.innerHTML = "";
  STUDY_FILES.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "study-nav-btn";
    btn.textContent = s.label;
    btn.dataset.key = s.key;
    btn.addEventListener("click", () => loadStudySubject(s.key));
    sidebar.appendChild(btn);
  });
}

async function loadStudySubject(key){
  currentStudyKey = key;
  document.querySelectorAll(".study-nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.key === key);
  });
  const main = document.getElementById("study-main");
  const subject = STUDY_FILES.find(s => s.key === key);
  if(!subject) return;

  if(studyLoaded[key]){
    main.innerHTML = studyLoaded[key];
    return;
  }
  main.innerHTML = `<div class="loading-note">Loading ${subject.label}…</div>`;
  try{
    const res = await fetch(subject.file);
    if(!res.ok) throw new Error("Could not load file");
    const md = await res.text();
    const html = window.marked ? marked.parse(md) : `<pre>${md}</pre>`;
    studyLoaded[key] = html;
    main.innerHTML = html;
  } catch(err){
    main.innerHTML = `<div class="loading-note">Couldn't load this file. If you're opening index.html directly from your computer (file://), study notes won't load due to browser security — this works correctly once hosted on GitHub Pages (https://).</div>`;
  }
}

/* ===================== MOCKS: SUB-VIEWS ===================== */
function showMockSubview(name){
  document.querySelectorAll(".mocks-subview").forEach(el => el.classList.remove("active"));
  document.getElementById(`mocks-${name}`).classList.add("active");
}

function bestScoreFor(paperId){
  const raw = localStorage.getItem(`ctet_best_${paperId}`);
  return raw ? JSON.parse(raw) : null;
}

function renderDashboard(){
  const grid = document.getElementById("papers-grid");
  grid.innerHTML = "";
  PAPERS.forEach((paper, idx) => {
    const best = bestScoreFor(paper.id);
    const card = document.createElement("div");
    card.className = "paper-card" + (best ? " done" : "");
    card.innerHTML = `
      <span class="paper-num">PAPER ${String(idx+1).padStart(2,"0")}</span>
      <span class="track-badge">${paper.track || "Mixed"}</span>
      <h3>${paper.title}</h3>
      <span class="paper-meta">${paper.questions.length} questions · ~${Math.ceil(paper.questions.length * SECONDS_PER_QUESTION / 60)} min</span>
      ${best ? `<span class="best-score">Best: ${best.score}/${best.total} (${best.percent}%)</span>` : ""}
      <button class="btn btn-primary start-btn">${best ? "Retry" : "Start"}</button>
    `;
    card.querySelector(".start-btn").addEventListener("click", () => startPaper(paper));
    grid.appendChild(card);
  });
}

document.getElementById("back-btn").addEventListener("click", () => {
  renderDashboard();
  showMockSubview("dashboard");
});

/* ===================== QUIZ FLOW ===================== */
function startPaper(paper){
  currentPaper = paper;
  currentIndex = 0;
  score = 0; correctCount = 0; incorrectCount = 0;
  startTime = Date.now();
  document.getElementById("quiz-paper-title").textContent = paper.title;
  showMockSubview("quiz");
  startTimer(paper.questions.length * SECONDS_PER_QUESTION);
  renderQuestion();
}

function startTimer(totalSeconds){
  clearInterval(timerInterval);
  secondsLeft = totalSeconds;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();
    if(secondsLeft <= 0){
      clearInterval(timerInterval);
      finishPaper();
    }
  }, 1000);
}

function updateTimerDisplay(){
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const el = document.getElementById("timer");
  el.textContent = `${m}:${String(s).padStart(2,"0")}`;
  el.classList.toggle("low", secondsLeft <= 30);
}

function renderQuestion(){
  answered = false;
  const q = currentPaper.questions[currentIndex];

  document.getElementById("quiz-progress").textContent =
    `Question ${currentIndex+1} of ${currentPaper.questions.length}`;
  document.getElementById("progress-fill").style.width =
    `${(currentIndex/currentPaper.questions.length)*100}%`;

  const passageBox = document.getElementById("q-passage-box");
  if(q.passage){
    document.getElementById("q-passage-text").textContent = q.passage;
    passageBox.hidden = false;
  } else {
    passageBox.hidden = true;
  }

  document.getElementById("q-tag").textContent = q.tag;
  document.getElementById("q-text").textContent = q.q;

  const optionsEl = document.getElementById("q-options");
  optionsEl.innerHTML = "";
  const letters = ["A","B","C","D"];
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener("click", () => selectAnswer(i, btn));
    optionsEl.appendChild(btn);
  });

  document.getElementById("q-explain").hidden = true;
  document.getElementById("next-btn").disabled = true;
  document.getElementById("next-btn").textContent =
    currentIndex === currentPaper.questions.length - 1 ? "Finish paper" : "Next question";

  window.scrollTo({top:0, behavior:"instant"});
}

function selectAnswer(selectedIndex, btnEl){
  if(answered) return;
  answered = true;
  const q = currentPaper.questions[currentIndex];
  const allOptions = document.querySelectorAll("#q-options .option");
  allOptions.forEach(o => o.classList.add("locked"));

  if(selectedIndex === q.correct){
    btnEl.classList.add("correct");
    score++; correctCount++;
  } else {
    btnEl.classList.add("incorrect");
    allOptions[q.correct].classList.add("correct");
    incorrectCount++;
  }

  if(q.exp){
    const exEl = document.getElementById("q-explain");
    exEl.textContent = q.exp;
    exEl.hidden = false;
  }
  document.getElementById("next-btn").disabled = false;
}

document.getElementById("next-btn").addEventListener("click", () => {
  if(currentIndex < currentPaper.questions.length - 1){
    currentIndex++;
    renderQuestion();
  } else {
    clearInterval(timerInterval);
    finishPaper();
  }
});

document.getElementById("quit-btn").addEventListener("click", () => {
  if(confirm("Quit this paper? Your progress won't be saved.")){
    clearInterval(timerInterval);
    renderDashboard();
    showMockSubview("dashboard");
  }
});

/* ===================== RESULT ===================== */
function finishPaper(){
  const total = currentPaper.questions.length;
  const percent = Math.round((score/total)*100);
  const pass = percent >= PASS_PERCENT;
  const elapsed = Math.floor((Date.now() - startTime)/1000);
  const em = Math.floor(elapsed/60), es = elapsed%60;

  localStorage.setItem(`ctet_best_${currentPaper.id}`, JSON.stringify({score, total, percent}));

  document.getElementById("result-badge").className = "result-badge " + (pass ? "pass" : "fail");
  document.getElementById("result-badge").textContent = pass ? "✓" : "✕";
  document.getElementById("result-title").textContent = pass
    ? "Pass — nice work!"
    : `Not yet — needs ${PASS_PERCENT}%+ to pass`;
  document.getElementById("result-score").textContent = score;
  document.getElementById("result-total").textContent = total;
  document.getElementById("result-percent").textContent = percent;
  document.getElementById("result-correct").textContent = correctCount;
  document.getElementById("result-incorrect").textContent = incorrectCount;
  document.getElementById("result-time").textContent = `${em}:${String(es).padStart(2,"0")}`;

  showMockSubview("result");
}

document.getElementById("retry-btn").addEventListener("click", () => {
  startPaper(currentPaper);
});

/* ===================== INIT ===================== */
function initApp(){
  renderStudySidebar();
  renderDashboard();
  switchTab("study");
}

if(sessionStorage.getItem("ctet_logged_in") === "1"){
  showLoggedIn(true);
  initApp();
} else {
  showLoggedIn(false);
}
