import { getFirestoreModule, getAnonymousUid, initFirebaseAnalytics } from './firebase.js';

const COLLECTION = 'leaderboard';
const REFRESH_MS = 60000;
const WRITE_DEBOUNCE_MS = 1200;
const TOP_LIMIT = 10;
// Сколько соседей показывать над игроком и под ним
const RIVALS_EACH_SIDE = 2;
const NAME_MAX = 14;

const state = {
  uid: null,
  name: 'You',
  enabled: false,
  ready: false,
  liveScore: 0,
  bestScore: 0,
  myRank: null,
  top: [],
  // Ближайшие соперники: above — от дальнего к ближнему, below — от ближнего к дальнему
  above: [],
  below: [],
  editing: false,
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
    <div class="lb-head">
      <span class="lb-title">LEADERBOARD</span>
      <div class="lb-head-actions">
        <button class="lb-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="leaderboard-body">
      <div class="lb-rows"></div>
      <div class="lb-zone hidden">
        <div class="lb-zone-title">YOUR ZONE</div>
        <div class="lb-zone-rows"></div>
      </div>
      <div class="lb-goal hidden"></div>
      <div class="lb-status hidden"></div>
    </div>`;
  const slot = document.getElementById('leaderboard-slot');
  (slot || document.body).appendChild(root);
  els.wrap = root;
  els.rows = root.querySelector('.lb-rows');
  els.zone = root.querySelector('.lb-zone');
  els.zoneRows = root.querySelector('.lb-zone-rows');
  els.goal = root.querySelector('.lb-goal');
  els.status = root.querySelector('.lb-status');
  els.close = root.querySelector('.lb-close');
  if (els.close) {
    els.close.addEventListener('click', () => {
      root.classList.remove('open');
      const toggle = document.getElementById('lb-toggle');
      if (toggle) toggle.classList.remove('active');
    });
  }
  // Тап по своему имени — переименование
  root.addEventListener('click', e => {
    if (e.target.closest('.lb-name-edit')) startNameEdit();
  });
}

function fmt(n) {
  return Math.round(n).toLocaleString('ru-RU');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isMe(p) {
  return !!(state.uid && p.uid === state.uid);
}

function rowFor(p) {
  const me = isMe(p);
  const row = document.createElement('div');
  row.className = 'lb-row' + (me ? ' lb-me-highlight' : '');
  const place = p.rank != null ? p.rank : '–';
  // Своя строка: имя — кнопка переименования, счёт — рекорд (по нему и считается место)
  const name = me
    ? `<button type="button" class="lb-name lb-name-edit" title="Change name">${escapeHtml(state.name)}<span class="lb-pencil" aria-hidden="true">✎</span></button>`
    : `<span class="lb-name">${escapeHtml(p.name)}</span>`;
  const score = me ? Math.max(p.score, state.bestScore) : p.score;
  row.innerHTML = `<span class="lb-place">${place}</span>${name}<span class="lb-score">${fmt(score)}</span>`;
  return row;
}

function inTop() {
  return state.top.some(isMe);
}

// Строка прямо над игроком — ближайшая цель
function nextTarget() {
  const i = state.top.findIndex(isMe);
  if (i > 0) return state.top[i - 1];
  if (i === 0) return null;
  if (state.above.length && state.myRank != null) {
    return { ...state.above[state.above.length - 1], rank: state.myRank - 1 };
  }
  // Соседи ещё не загружены или их нет — цель: последняя строка топа
  if (state.bestScore > 0 && state.top.length && state.top[state.top.length - 1].score > state.bestScore) {
    return state.top[state.top.length - 1];
  }
  return null;
}

function renderGoal() {
  const meTop = state.top.findIndex(isMe);
  let text = '';
  if (meTop === 0) {
    text = "You're #1 — hold the crown!";
  } else if (state.bestScore <= 0) {
    text = state.uid ? 'Finish a game to join the board' : '';
  } else {
    const target = nextTarget();
    if (target) {
      const gap = Math.max(1, target.score - state.bestScore + 1);
      text = `+${fmt(gap)} to pass #${target.rank}`;
    }
  }
  els.goal.textContent = text;
  els.goal.classList.toggle('hidden', !text);
}

function renderView() {
  if (!state.enabled || !els.rows || state.editing) return;
  els.rows.innerHTML = '';
  state.top.forEach(p => els.rows.appendChild(rowFor(p)));

  // «Твоя зона»: соседи по таблице вокруг игрока, если он не в топе
  const showZone = !inTop() && !!state.uid;
  els.zone.classList.toggle('hidden', !showZone);
  if (showZone) {
    els.zoneRows.innerHTML = '';
    const rank = state.bestScore > 0 ? state.myRank : null;
    const list = [];
    if (rank != null) {
      state.above.forEach((p, i) => {
        const r = rank - (state.above.length - i);
        // соседи из топа уже показаны выше
        if (r > state.top.length) list.push({ ...p, rank: r });
      });
    }
    list.push({ uid: state.uid, name: state.name, score: state.bestScore, rank });
    if (rank != null) state.below.forEach((p, i) => list.push({ ...p, rank: rank + i + 1 }));
    list.forEach(p => els.zoneRows.appendChild(rowFor(p)));
  }
  renderGoal();
}

function startNameEdit() {
  if (state.editing || !state.uid) return;
  const btn = els.wrap.querySelector('.lb-name-edit');
  if (!btn) return;
  state.editing = true;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'lb-name-input';
  input.maxLength = NAME_MAX;
  input.value = state.name;
  input.setAttribute('aria-label', 'Your name');
  input.autocomplete = 'off';
  input.spellcheck = false;
  btn.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = save => {
    if (done) return;
    done = true;
    state.editing = false;
    if (save) setPlayerName(input.value);
    queueRender();
  };
  // Клавиши не должны долетать до игры: пробел бросал бы слайм, P открывал бы паузу
  ['keydown', 'keyup', 'keypress'].forEach(type => input.addEventListener(type, e => e.stopPropagation()));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    else if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

function queueRender() {
  if (state.renderTimer) return;
  state.renderTimer = requestAnimationFrame(() => {
    state.renderTimer = null;
    renderView();
  });
}

function playerFromDoc(d) {
  return { uid: d.id, name: d.data().name || '—', score: d.data().score || 0 };
}

async function loadTop() {
  try {
    const m = await getFirestoreModule();
    const q = m.query(m.collection(m.db, COLLECTION), m.orderBy('score', 'desc'), m.limit(TOP_LIMIT));
    const snap = await m.getDocs(q);
    state.top = snap.docs.map((d, i) => ({ ...playerFromDoc(d), rank: i + 1 }));
    queueRender();
  } catch (e) {
    showStatus('offline');
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
    showStatus('offline');
  }
}

async function loadRivals() {
  if (!state.uid || state.bestScore <= 0) return;
  try {
    const m = await getFirestoreModule();
    const col = m.collection(m.db, COLLECTION);
    const best = state.bestScore;
    const [up, down] = await Promise.all([
      m.getDocs(m.query(col, m.where('score', '>', best), m.orderBy('score', 'asc'), m.limit(RIVALS_EACH_SIDE))),
      m.getDocs(m.query(col, m.where('score', '<', best), m.orderBy('score', 'desc'), m.limit(RIVALS_EACH_SIDE)))
    ]);
    // Пока шёл запрос, рекорд мог вырасти — такой ответ уже устарел
    if (best !== state.bestScore) return;
    state.above = up.docs.map(playerFromDoc).reverse();
    state.below = down.docs.map(playerFromDoc);
    queueRender();
  } catch (e) {
    showStatus('offline');
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
    showStatus('offline');
  }
}

function refresh() {
  loadTop();
  if (state.uid && state.bestScore > 0) {
    loadMyRank();
    loadRivals();
  }
}

function showStatus(text) {
  if (!els.status) return;
  els.status.textContent = text;
  els.status.classList.remove('hidden');
}

function hideStatus() {
  if (els.status) els.status.classList.add('hidden');
}

// knownBest — лучший счёт игрока по данным самой игры. Без него рекорд в начале сессии
// считался нулевым, и первый же набранный счёт затирал настоящий рекорд в таблице.
export function startLeaderboard(knownBest = 0) {
  state.bestScore = Math.max(state.bestScore, knownBest || 0);
  if (state.enabled) return;
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;
  state.enabled = true;
  buildDom();
  if (!els.wrap) return;
  try {
    for (const key of ['lb-best', 'neon-slime-highscore']) {
      const saved = localStorage.getItem(key);
      if (saved != null) state.bestScore = Math.max(state.bestScore, parseInt(saved, 10) || 0);
    }
    const savedRank = localStorage.getItem('lb-rank');
    if (savedRank != null) state.myRank = parseInt(savedRank, 10) || null;
  } catch (e) {}

  els.wrap.classList.remove('hidden');
  els.status.textContent = 'loading…';
  els.status.classList.remove('hidden');

  initFirebaseAnalytics();

  (async () => {
    const uid = await getAnonymousUid();
    if (!uid) { showStatus('no network'); return; }
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
      // Новый рекорд прямо в партии: место и соседи пересчитываются на лету
      writeScore().then(loadTop);
      loadMyRank();
      loadRivals();
    }, WRITE_DEBOUNCE_MS);
    queueRender();
  }
}

export function leaderboardGameOver(score) {
  if (!state.enabled) return;
  state.liveScore = score || 0;
  if (score > state.bestScore) {
    state.bestScore = score;
    try { localStorage.setItem('lb-best', String(state.bestScore)); } catch (e) {}
  }
  if (state.writeTimer) { clearTimeout(state.writeTimer); state.writeTimer = null; }
  writeScore().then(refresh);
  queueRender();
}

export function leaderboardRestart() {
  state.liveScore = 0;
  queueRender();
}

export function setPlayerName(name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!clean || clean === state.name) return false;
  state.name = clean;
  try { localStorage.setItem('lb-name', clean); } catch (e) {}
  writeScore().then(loadTop);
  queueRender();
  return true;
}
