// Обучение для новичка: показывается один раз, в первой партии, и не останавливает игру.
// Подсказки идут за действиями игрока: «прицелься и брось» → «соедини одинаковых» → «не переполни чашу».
const DONE_KEY = 'neon-slime-tutorial-done';
const GOAL_SHOW_MS = 4200;
// Если слияние никак не случается, подсказка про него не должна висеть всю партию
const MERGE_HINT_MAX_DROPS = 8;

const el = typeof document !== 'undefined' ? document.getElementById('coach') : null;
const textEl = el ? el.querySelector('.coach-text') : null;

let step = null;
let dropsOnStep = 0;
let timer = 0;

function isDone() {
  try { return localStorage.getItem(DONE_KEY) === '1'; } catch (e) { return false; }
}

function markDone() {
  try { localStorage.setItem(DONE_KEY, '1'); } catch (e) {}
}

function isTouch() {
  return typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
}

const TEXT = {
  aim: () => (isTouch()
    ? 'Drag to aim, lift your finger to drop'
    : 'Move the mouse to aim, click to drop'),
  merge: () => 'Two identical slimes merge into a bigger one',
  goal: () => "Keep merging and don't let the bowl overflow!"
};

function show(next) {
  if (!el) return;
  step = next;
  dropsOnStep = 0;
  el.dataset.step = next;
  textEl.textContent = TEXT[next]();
  el.classList.remove('hidden');
  // перезапуск анимации появления при смене шага
  el.classList.remove('coach-in');
  void el.offsetWidth;
  el.classList.add('coach-in');
}

function hide() {
  clearTimeout(timer);
  timer = 0;
  step = null;
  if (el) el.classList.add('hidden');
}

function finish() {
  markDone();
  hide();
}

export const tutorial = {
  // seasoned — у игрока уже есть рекорд: он играл до появления обучения, учить его незачем
  start({ seasoned = false } = {}) {
    hide();
    if (!el || isDone()) return;
    if (seasoned) { markDone(); return; }
    show('aim');
  },

  onDrop() {
    if (step === 'aim') {
      show('merge');
    } else if (step === 'merge') {
      dropsOnStep += 1;
      if (dropsOnStep >= MERGE_HINT_MAX_DROPS) finish();
    }
  },

  onMerge() {
    if (step !== 'aim' && step !== 'merge') return;
    // Управление и слияние игрок уже попробовал сам — обучение пройдено
    markDone();
    show('goal');
    timer = setTimeout(hide, GOAL_SHOW_MS);
  },

  // Партия кончилась или игрок ушёл в меню: прячем, недосмотренное обучение начнётся заново
  stop() {
    hide();
  }
};
