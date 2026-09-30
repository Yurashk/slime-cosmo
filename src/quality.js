// Адаптивное качество графики.
//
// Первые секунды меряем реальную длительность кадра. Если устройство не держит ~45 FPS,
// переключаемся в лёгкий режим: без shadowBlur (самая дорогая операция canvas — на замерах
// она съедала до половины кадра) и с плотностью пикселей 1×. Решение запоминается на
// несколько дней, чтобы слабое устройство сразу стартовало в лёгком режиме.
//
// shadowBlur управляется патчем сеттера на прототипе контекста: так он разом меняется во всех
// местах отрисовки (их десятки) без правки каждого. В обычном режиме радиус свечения
// умножается на GLOW_SCALE, в лёгком — гасится. Для одноразовой «запечки» спрайтов,
// где свечение рисуется один раз и дальше ничего не стоит, есть quality.bake().

const KEY = 'neon-slime-quality-v1';
const RETEST_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
const WARMUP_FRAMES = 60;
const WINDOW_FRAMES = 120;
const SLOW_FRAME_MS = 22;
const SLOW_SHARE = 0.4;

// Общая сила неонового свечения: радиус shadowBlur и яркость ореолов вокруг слаймов
export const GLOW_SCALE = 0.82;

const listeners = [];
let low = false;
let shadowsPatched = false;
let bypass = 0;
let warmup = WARMUP_FRAMES;
let frames = 0;
let slow = 0;

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && saved.low && Date.now() - saved.at < RETEST_AFTER_MS) low = true;
} catch (e) {}

function patchShadows() {
  if (shadowsPatched || typeof CanvasRenderingContext2D === 'undefined') return;
  const proto = CanvasRenderingContext2D.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
  if (!desc || !desc.set) return;
  Object.defineProperty(proto, 'shadowBlur', {
    configurable: true,
    enumerable: desc.enumerable,
    get: desc.get,
    set(v) { desc.set.call(this, low && bypass === 0 ? 0 : v * GLOW_SCALE); }
  });
  shadowsPatched = true;
}

function goLow() {
  low = true;
  try { localStorage.setItem(KEY, JSON.stringify({ low: true, at: Date.now() })); } catch (e) {}
  listeners.forEach(fn => { try { fn(); } catch (e) {} });
}

patchShadows();

export const quality = {
  get low() { return low; },

  // Потолок devicePixelRatio для всех холстов
  maxDpr() { return low ? 1 : 2; },

  // Длительность очередного кадра в мс; вызывается из игрового цикла и стартового экрана
  sample(dt) {
    if (low || !(dt > 0)) return;
    if (dt > 100) return; // вкладка была в фоне или шла загрузка — не показатель
    if (warmup > 0) { warmup--; return; }
    frames++;
    if (dt > SLOW_FRAME_MS) slow++;
    if (frames >= WINDOW_FRAMES) {
      if (slow / frames > SLOW_SHARE) goLow();
      frames = 0;
      slow = 0;
    }
  },

  // Разовая отрисовка со свечением даже в лёгком режиме (для кешируемых спрайтов)
  bake(fn) {
    bypass++;
    try { return fn(); } finally { bypass--; }
  },

  onChange(fn) { listeners.push(fn); }
};
