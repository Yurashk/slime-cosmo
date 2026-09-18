import { getFirestoreModule, getAnonymousUid, initFirebaseAnalytics } from './firebase.js';

const COLLECTION = 'leaderboard';
const REFRESH_MS = 60000;
const WRITE_DEBOUNCE_MS = 1200;

const state = {
  uid: null,
  name: 'Вы',
  enabled: false,
  ready: false,
  liveScore: 0,
  bestScore: 0,
  myRank: null,
  top: [],
  writeTimer: null,
  renderTimer: null,
  refreshTimer: null,
  flushed: false
};

const els = {};

function buildDom() {
  if (els.wrap) return;
  if (document.getElementById('leaderboard')) return;
  const root = document.createElement('div');
  root.id = 'leaderboard';
  root.className = 'leaderboard hidden';
  root.innerHTML = `
    <div class="leaderboard-body">
      <div class="lb-rows"></div>
      <div class="lb-more hidden">•••</div>
      <div class="lb-me hidden">
        <span class="lb-me-place"></span>
        <span class="lb-me-name">Вы</span>
        <span class="lb-me-score"></span>
      </div>
      <div class="lb-status hidden"></div>
    </div>`;
  document.body.appendChild(root);
  els.wrap = root;
  els.rows = root.querySelector('.lb-rows');
  els.more = root.querySelector('.lb-more');
  els.me = root.querySelector('.lb-me');
  els.mePlace = root.querySelector('.lb-me-place');
  els.meScore = root.querySelector('.lb-me-score');
  els.status = root.querySelector('.lb-status');
}

function fmt(n) {
  return Math.round(n).toLocaleString('ru-RU');
}

function rowFor(p, me) {
  const row = document.createElement('div');
  row.className = 'lb-row' + (me ? ' lb-me-highlight' : '');
  row.innerHTML = `<span class="lb-place">${p.rank}</span><span class="lb-name">${escapeHtml(p.name)}</span><span class="lb-score">${fmt(p.score)}</span>`;
  return row;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inTop3() {
  return state.top.some(p => p.uid !== undefined && state.uid && p.uid === state.uid);
}

function renderView() {
  if (!state.enabled || !els.rows) return;
  els.rows.innerHTML = '';
  state.top.forEach(p => {
    els.rows.appendChild(rowFor(p, state.uid && p.uid === state.uid));
  });

  const meInTop = inTop3();
  els.more.classList.toggle('hidden', meInTop || state.myRank == null || state.myRank <= 3);
  if (!meInTop) {
    els.me.classList.remove('hidden');
    els.mePlace.textContent = state.myRank != null ? '#' + state.myRank : '#…';
    els.meScore.textContent = fmt(state.liveScore);
  } else {
    els.me.classList.add('hidden');
  }
}

function queueRender() {
  if (state.renderTimer) return;
  state.renderTimer = requestAnimationFrame(() => {
    state.renderTimer = null;
    renderView();
  });
}

async function loadTop() {
  try {
    const m = await getFirestoreModule();
    const q = m.query(m.collection(m.db, COLLECTION), m.orderBy('score', 'desc'), m.limit(3));
    const snap = await m.getDocs(q);
    state.top = snap.docs.map((d, i) => ({
      uid: d.id,
      name: d.data().name || '—',
      score: d.data().score || 0,
      rank: i + 1
    }));
    queueRender();
  } catch (e) {
    showStatus('офлайн');
  }
}

async function loadMyRank() {
  if (!state.uid || state.bestScore <= 0) return;
  try {
    const m = await getFirestoreModule();
    const q = m.query(m.collection(m.db, COLLECTION), m.where('score', '>', state.bestScore));
    const cnt = await m.getCountFromServer(q);
    state.myRank = cnt.data().count + 1;
    queueRender();
  } catch (e) {
    showStatus('офлайн');
  }
}

async function writeScore() {
  if (!state.uid || state.bestScore <= 0) return;
  try {
    const m = await getFirestoreModule();
    await m.setDoc(m.doc(m.db, COLLECTION, state.uid), {
      name: state.name,
      score: state.bestScore,
      updatedAt: Date.now()
    });
  } catch (e) {
    showStatus('офлайн');
  }
}

function refresh() {
  loadTop();
  if (state.uid && state.bestScore > 0) loadMyRank();
}

function showStatus(text) {
  if (!els.status) return;
  els.status.textContent = text;
  els.status.classList.remove('hidden');
}

function hideStatus() {
  if (els.status) els.status.classList.add('hidden');
}

export function startLeaderboard() {
  if (state.enabled) return;
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;
  state.enabled = true;
  buildDom();
  if (!els.wrap) return;
  try {
    const saved = localStorage.getItem('neon-slime-highscore');
    if (saved != null) state.bestScore = Math.max(state.bestScore, parseInt(saved, 10) || 0);
    const savedRank = localStorage.getItem('lb-rank');
    if (savedRank != null) state.myRank = parseInt(savedRank, 10) || null;
  } catch (e) {}

  els.wrap.classList.remove('hidden');
  els.status.textContent = 'загрузка…';
  els.status.classList.remove('hidden');

  initFirebaseAnalytics();

  (async () => {
    const uid = await getAnonymousUid();
    if (!uid) { showStatus('нет сети'); return; }
    state.uid = uid;
    const short = uid.replace(/[^0-9]/g, '').slice(0, 4) || uid.slice(0, 4);
    try {
      state.name = localStorage.getItem('lb-name') || ('Slime-' + short);
    } catch (e) { state.name = 'Slime-' + short; }
    hideStatus();
    refresh();
    state.refreshTimer = setInterval(refresh, REFRESH_MS);
  })();
}

export function reportScore(score) {
  state.liveScore = score || 0;
  if (!state.enabled) return;

  if (score > state.bestScore) {
    state.bestScore = score;
    try { localStorage.setItem('lb-best', String(state.bestScore)); } catch (e) {}

    if (state.writeTimer) clearTimeout(state.writeTimer);
    state.writeTimer = setTimeout(() => {
      state.writeTimer = null;
      writeScore();
      loadMyRank();
    }, WRITE_DEBOUNCE_MS);
  }
  queueRender();
}

export function leaderboardGameOver(score) {
  if (!state.enabled) return;
  state.liveScore = score || 0;
  if (score > state.bestScore) {
    state.bestScore = score;
    try { localStorage.setItem('lb-best', String(state.bestScore)); } catch (e) {}
  }
  if (state.writeTimer) { clearTimeout(state.writeTimer); state.writeTimer = null; }
  writeScore();
  refresh();
  queueRender();
}

export function leaderboardRestart() {
  state.liveScore = 0;
  queueRender();
}

export function setPlayerName(name) {
  const clean = String(name || '').trim().slice(0, 20);
  if (!clean) return false;
  state.name = clean;
  try { localStorage.setItem('lb-name', clean); } catch (e) {}
  writeScore();
  refresh();
  return true;
}