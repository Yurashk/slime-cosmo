import { THEMES, THEME_ORDER, entityIdOf } from './themes/registry.js';
import { getSlimeConfig, collectionLevels } from './SlimeConfig.js';
import { progress } from './state.js';
import { quality } from './quality.js';

const FONT = "'Orbitron', 'Montserrat', sans-serif";

const POD_DISPLAY = {
  space: { kind: 'planets', title: 'Space', icon: '🪐' },
  animals: { kind: 'animals', title: 'Animals', icon: '🦁' },
  ocean: { kind: 'emoji', title: 'Emoji', icon: '😍' }
};
const NEON = {
  cyan: '#00f3ff',
  magenta: '#ff0055',
  green: '#00ff66'
};
const BLACK = '#050608';

function podDisplay(id) {
  return POD_DISPLAY[id] || { kind: 'default', title: id, icon: '' };
}

function clamp(lo, v, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function text(g, str, x, y, size, color, glow, alpha, spacing) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `700 ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (glow) {
    g.shadowColor = glow;
    g.shadowBlur = 12;
  }
  g.fillStyle = color;
  if (spacing && spacing > 0 && str.length > 1) {
    const chars = Array.from(str);
    let total = 0;
    const widths = chars.map(c => g.measureText(c).width);
    chars.forEach((_, i) => { total += widths[i]; });
    total += spacing * (chars.length - 1);
    let cx = x - total / 2 + widths[0] / 2;
    for (let i = 0; i < chars.length; i++) {
      g.fillText(chars[i], cx, y);
      if (i < chars.length - 1) cx += widths[i] / 2 + spacing + widths[i + 1] / 2;
    }
  } else {
    g.fillText(str, x, y);
  }
  g.restore();
}

function withAlpha(hex, a) {
  const h = String(hex || '#ffffff').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(255,255,255,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function roundRectPath(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  if (g.roundRect) {
    g.roundRect(x, y, w, h, r);
  } else {
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
}

// Звёзды для фона: детерминированный генератор, чтобы небо не «прыгало» при ресайзе.
// layer 0 — мелкая дальняя пыль, layer 1 — крупные ближние звёзды (плывут быстрее).
function makeStars(W, H) {
  const n = Math.round(clamp(70, (W * H) / 4200, 260));
  let s = 1234567;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, () => {
    const layer = rnd() < 0.75 ? 0 : 1;
    const tintRoll = rnd();
    return {
      x: rnd() * W,
      y: rnd() * H,
      r: layer ? 0.9 + rnd() * 0.9 : 0.4 + rnd() * 0.6,
      tw: rnd() * Math.PI * 2,
      ts: 0.0008 + rnd() * 0.0022,
      layer,
      color: tintRoll < 0.1 ? '#9FE8FF' : tintRoll < 0.18 ? '#FFB8E6' : '#FFFFFF'
    };
  });
}

// Подгоняет кегль, чтобы строка влезла в ширину капсулы
function fitFontSize(g, str, maxW, size, minSize, spacing) {
  let fs = size;
  while (fs > minSize) {
    g.font = `700 ${fs}px ${FONT}`;
    const w = g.measureText(str).width + spacing * Math.max(0, str.length - 1);
    if (w <= maxW) break;
    fs -= 0.5;
  }
  return fs;
}

export function createStartScreen(opts) {
  const {
    canvasEl,
    tooltipEl,
    selectedLabelEl,
    recordLabelEl,
    playBtn,
    draw,
    drawOn,
    radiusOf,
    onPlay
  } = opts;

  const ctx = canvasEl.getContext('2d');
  let running = false;
  let rafId = 0;
  let rect = null;
  let layoutKey = '';
  let layout = null;
  let activeIndex = Math.max(0, THEME_ORDER.indexOf(progress.getSelectedTheme()));
  let animGlass = null;
  let animPop = null;
  let tooltipTimer = 0;
  let busy = false;
  let titleBottom = 0;
  const silhouetteCache = new Map();
  const spriteCache = new Map();
  // Когда последний раз трясли замок капсулы (тап по закрытому миру)
  const lockShakeAt = {};
  let lastFrameAt = 0;

  function measure() {
    const r = canvasEl.getBoundingClientRect();
    if (!r || r.width < 2 || r.height < 2) return false;
    rect = r;
    const titleEl = document.querySelector('.start-title');
    const tr = titleEl ? titleEl.getBoundingClientRect() : null;
    titleBottom = tr && tr.height > 0 ? Math.round(tr.bottom - r.top) : 0;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.maxDpr());
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return true;
  }

  function podData(W, H, cx, podW, id, podTop) {
    const t = THEMES[id];
    const disp = podDisplay(id);
    const s = Math.min(W, H);
    const capH = clamp(8, H * 0.011, 12);
    const capY0 = podTop - capH - 3;
    const headerH = clamp(24, H * 0.032, 30);
    const footerH = clamp(38, H * 0.05, 46);
    const podBottom = H * 0.82;
    // В капсуле ровно коллекция мира: 9 планет, 6 зверей, 5 эмодзи
    const levels = Object.keys(collectionLevels(id)).map(Number).sort((a, b) => a - b);
    const n = levels.length;
    const rBase = clamp(15, s * 0.042, 22);
    // Батарейка заряжается снизу вверх: первый слайм внизу, последний наверху.
    // Чем выше уровень, тем крупнее слайм — вершина коллекции выглядит наградой.
    const radiusAt = i => Math.round((rBase * (0.8 + 0.32 * (n > 1 ? i / (n - 1) : 1))) * 2) / 2;
    const rTop = radiusAt(n - 1);
    // Эмодзи торчат над телом (пламя, рожки, сердечко) — наверху им нужен запас
    const yTopSlot = podTop + headerH + rTop * (disp.kind === 'emoji' ? 1.5 : 0.9);
    const yBottomSlot = podBottom - footerH - radiusAt(0) * 1.25;
    const step = n > 1 ? (yBottomSlot - yTopSlot) / (n - 1) : 0;
    const sway = clamp(12, podW * 0.2, 48);
    const slots = levels.map((lv, i) => ({
      level: lv,
      entityId: entityIdOf(id, lv),
      themeId: id,
      r: radiusAt(i),
      // Плавная змейка вместо жёсткого зигзага
      x: Math.round(cx + Math.sin(i * 1.25 + 0.6) * sway),
      y: Math.round(yBottomSlot - i * step),
      unlocked: false
    }));
    const unlocked = progress.isThemeUnlocked(id);
    const maxLv = unlocked ? progress.getThemeMaxLevel(id) : 0;
    return {
      id,
      kind: disp.kind,
      title: disp.title.toUpperCase(),
      icon: disp.icon,
      accent: t.accent,
      accentGlow: t.accentGlow,
      lockShape: t.lockShape,
      playable: t.playable,
      unlocked,
      maxLv,
      slotCount: levels.length,
      slots,
      cx,
      podW,
      podTop,
      podBottom,
      capY0,
      capH,
      headerH,
      footerH,
      yCenter: (podTop + podBottom) / 2
    };
  }

  function pyramidData(W, H) {
    const s = Math.min(W, H);
    const cx = W / 2;
    const r = clamp(9, s * 0.026, 17);
    // Пирамидка всегда под заголовком, а не поверх него
    const yTop = Math.max(H * 0.075, titleBottom + r + 8);
    const yBot = yTop + r * 2.2;
    return {
      r,
      bottom: yBot + r,
      cubes: [
        { entityId: 'base:1', x: Math.round(cx - r * 1.1), y: Math.round(yTop), r },
        { entityId: 'base:2', x: Math.round(cx + r * 1.1), y: Math.round(yTop), r },
        { entityId: 'base:3', x: Math.round(cx - r * 2.25), y: Math.round(yBot), r },
        { entityId: 'base:4', x: Math.round(cx), y: Math.round(yBot), r },
        { entityId: 'base:5', x: Math.round(cx + r * 2.25), y: Math.round(yBot), r }
      ]
    };
  }

  function computeLayout(W, H) {
    const gap = clamp(10, W * 0.018, 22);
    // На широких экранах капсулы не растягиваются в квадраты, а собираются по центру
    const podW = Math.min((W - gap * 4) / 3, clamp(160, H * 0.34, 300));
    const x0 = (W - (podW * 3 + gap * 2)) / 2;
    const cxs = THEME_ORDER.map((_, i) => x0 + podW / 2 + i * (podW + gap));
    const base = pyramidData(W, H);
    const podTop = Math.max(H * 0.245, base.bottom + 30);
    const pods = THEME_ORDER.map((id, i) => podData(W, H, cxs[i], podW, id, podTop));
    return { pods, podW, gap, base, stars: makeStars(W, H) };
  }

  function ensureLayout() {
    if (!measure()) return false;
    const key = rect.width + 'x' + rect.height + ':' + titleBottom;
    if (key !== layoutKey || !layout) {
      layout = computeLayout(rect.width, rect.height);
      if (!animGlass) {
        animGlass = {};
        THEME_ORDER.forEach(id => { animGlass[id] = id === selectedThemeId() ? 0 : 1; });
        animPop = {};
        THEME_ORDER.forEach(id => { animPop[id] = 0; });
      } else if (layoutKey !== key) {
        layoutKey = key;
      }
      layoutKey = key;
    }
    return true;
  }

  function selectedThemeId() {
    return THEME_ORDER[activeIndex];
  }

  function drawNebula(g, now) {
    const W = rect.width;
    const H = rect.height;

    // 1. Базовая заливка: глубокий тёмно-фиолетовый / индиго.
    const base = g.createLinearGradient(0, 0, W * 0.35, H);
    base.addColorStop(0, '#0B0D1B');
    base.addColorStop(0.55, '#101433');
    base.addColorStop(1, '#161936');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);

    // 2. Очень мягкое, едва заметное внутреннее свечение по центру.
    const core = g.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.78);
    core.addColorStop(0, 'rgba(96, 116, 220, 0.16)');
    core.addColorStop(0.45, 'rgba(70, 84, 180, 0.07)');
    core.addColorStop(1, 'rgba(60, 70, 160, 0)');
    g.fillStyle = core;
    g.fillRect(0, 0, W, H);

    // 2b. Две медленно дрейфующие туманности — розовая слева сверху, голубая справа снизу.
    const clouds = [
      { x: W * (0.2 + Math.sin(now * 0.00007) * 0.05), y: H * (0.3 + Math.cos(now * 0.00005) * 0.04), rad: Math.max(W, H) * 0.42, color: '255, 51, 153', a: 0.1 },
      { x: W * (0.8 + Math.cos(now * 0.00006) * 0.05), y: H * (0.64 + Math.sin(now * 0.00008) * 0.04), rad: Math.max(W, H) * 0.46, color: '0, 200, 255', a: 0.09 }
    ];
    for (const c of clouds) {
      const cg = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rad);
      cg.addColorStop(0, `rgba(${c.color}, ${c.a})`);
      cg.addColorStop(0.5, `rgba(${c.color}, ${c.a * 0.35})`);
      cg.addColorStop(1, `rgba(${c.color}, 0)`);
      g.fillStyle = cg;
      g.fillRect(0, 0, W, H);
    }

    // 2c. Звёзды: мерцают и медленно плывут вниз, ближний слой — быстрее (параллакс).
    g.save();
    for (const st of layout.stars) {
      const y = (st.y + now * (st.layer ? 0.009 : 0.004)) % H;
      const a = (st.layer ? 0.8 : 0.5) * (0.55 + 0.45 * Math.sin(now * st.ts + st.tw));
      g.fillStyle = st.color;
      if (st.layer) {
        g.globalAlpha = a * 0.22;
        g.beginPath();
        g.arc(st.x, y, st.r * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = a;
      g.beginPath();
      g.arc(st.x, y, st.r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // 2d. Падающая звезда раз в ~7 секунд, каждый раз по новой траектории.
    const period = 7000;
    const phase = now % period;
    if (phase < 900) {
      const idx = Math.floor(now / period);
      const rnd = (k) => { const v = Math.sin(idx * 91.7 + k * 13.3) * 43758.5; return v - Math.floor(v); };
      const t = phase / 900;
      const sx = W * (0.15 + rnd(1) * 0.7);
      const sy = H * (0.04 + rnd(2) * 0.25);
      const len = Math.min(W, H) * 0.35;
      const hx = sx - len * t;
      const hy = sy + len * 0.45 * t;
      const tail = g.createLinearGradient(hx, hy, hx + len * 0.35, hy - len * 0.16);
      const fade = Math.sin(t * Math.PI);
      tail.addColorStop(0, `rgba(230, 250, 255, ${0.85 * fade})`);
      tail.addColorStop(1, 'rgba(230, 250, 255, 0)');
      g.save();
      g.strokeStyle = tail;
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + len * 0.35, hy - len * 0.16);
      g.stroke();
      g.restore();
    }

    // 3. Мягкая виньетка по краям — держит фокус на панелях.
    const vig = g.createRadialGradient(W * 0.5, H * 0.45, W * 0.3, W * 0.5, H * 0.5, W * 0.95);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(2, 3, 12, 0.5)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);
  }

  // Тонкая зафиксированная линия баланса: от верхнего стека слаймов к активной батарейке.
  function drawBalanceLine(g) {
    const active = layout.pods.find(p => p.id === selectedThemeId()) || layout.pods[0];
    if (!active) return;

    const x1 = rect.width * 0.5;
    const y1 = pyramidData(rect.width, rect.height).bottom;
    const x2 = active.cx;
    const y2 = active.top;
    if (!(y2 > y1)) return;

    // Корпус линии — тонкая, без пульсаций.
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = withAlpha(active.accent, 0.34);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.restore();
  }

  function drawPyramid(g, now) {
    const b = layout.base;
    const active = selectedThemeId();
    const pods = layout.pods;
    const valleys = [
      { sx: b.cubes[2].x, sy: b.cubes[2].y + b.r, pod: pods[0] },
      { sx: b.cubes[3].x, sy: b.cubes[3].y + b.r, pod: pods[1] },
      { sx: b.cubes[4].x, sy: b.cubes[4].y + b.r, pod: pods[2] }
    ];
    // connectors (behind cubes)
    valleys.forEach((v, i) => {
      const endY = v.pod.capY0 + 2;
      const isActive = v.pod.id === active;
      const cpX = v.sx + (v.pod.cx - v.sx) * 0.5 + (i - 1) * 6;
      const cpY = (v.sy + v.pod.capY0) / 2 + 6;
      g.save();
      g.globalAlpha = isActive ? 0.85 : 0.2;
      g.strokeStyle = isActive ? 'rgba(0, 242, 254, 0.7)' : 'rgba(255, 255, 255, 0.14)';
      g.lineWidth = isActive ? 2 : 1.5;
      g.shadowColor = isActive ? 'rgba(0, 242, 254, 0.8)' : 'rgba(0,0,0,0)';
      g.shadowBlur = isActive ? 8 : 0;
      g.beginPath();
      g.moveTo(v.sx, v.sy);
      g.quadraticCurveTo(cpX, cpY, v.pod.cx, endY);
      g.stroke();
      if (isActive) {
        const t = (now * 0.0008) % 1;
        const mt = 1 - t;
        const px = mt * mt * v.sx + 2 * mt * t * cpX + t * t * v.pod.cx;
        const py = mt * mt * v.sy + 2 * mt * t * cpY + t * t * endY;
        g.shadowBlur = 10;
        g.fillStyle = '#d9fbff';
        g.beginPath();
        g.arc(px, py, 2.6, 0, Math.PI * 2);
        g.fill();
      }
      g.shadowBlur = 0;
      g.fillStyle = '#d9fbff';
      g.beginPath();
      g.arc(v.pod.cx, endY, 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
    // base cubes
    b.cubes.forEach((c, i) => {
      const bob = Math.sin(now * 0.002 + i * 1.3) * c.r * 0.1;
      drawSprite(g, { ...c, level: i + 1 }, c.y + bob, 1);
    });
  }

  function shapePath(g, col, slot) {
    const r = slot.r;
    if (col.lockShape === 'animal') {
      const variant = slot.level % 3;
      if (variant === 0) {
        g.moveTo(-r * 0.48, -r * 0.16);
        g.lineTo(-r * 0.3, -r * 0.62);
        g.lineTo(-r * 0.02, -r * 0.34);
        g.closePath();
        g.moveTo(r * 0.48, -r * 0.16);
        g.lineTo(r * 0.3, -r * 0.62);
        g.lineTo(r * 0.02, -r * 0.34);
        g.closePath();
        g.arc(0, r * 0.12, r * 0.6, 0, Math.PI * 2);
      } else if (variant === 1) {
        g.arc(-r * 0.34, -r * 0.42, r * 0.22, 0, Math.PI * 2);
        g.arc(r * 0.34, -r * 0.42, r * 0.22, 0, Math.PI * 2);
        g.arc(0, r * 0.08, r * 0.56, 0, Math.PI * 2);
      } else {
        const rr = Math.min(r * 0.12, 4);
        if (g.roundRect) {
          g.roundRect(-r * 0.34, -r * 0.95, r * 0.26, r * 0.74, rr);
          g.roundRect(r * 0.08, -r * 0.95, r * 0.26, r * 0.74, rr);
        }
        g.arc(0, -r * 0.02, r * 0.48, 0, Math.PI * 2);
      }
    } else {
      g.arc(0, 0, r, 0, Math.PI * 2);
    }
  }

  // Силуэт закрытого слайма: рисуем настоящую модельку во временный холст,
  // отрезаем по альфе свечения/ореолы и заливаем тёмным. Кешируется на слот.
  function silhouetteOf(slot) {
    if (!drawOn) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.maxDpr());
    const key = `${slot.themeId}:${slot.level}:${slot.r}:${dpr}`;
    if (silhouetteCache.has(key)) return silhouetteCache.get(key);
    let sil = null;
    try {
      const half = Math.ceil(slot.r * 1.9);
      const size = Math.ceil(half * 2 * dpr);
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const og = c.getContext('2d', { willReadFrequently: true });
      og.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOn(og, { ...slot, x: half, y: half, unlocked: true }, 0);
      const img = og.getImageData(0, 0, size, size);
      const d = img.data;
      // Оставляем ~15% яркости оригинала: мордочка угадывается «в тени», но не раскрывается
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.15;
        d[i] = 9 + lum;
        d[i + 1] = 12 + lum;
        d[i + 2] = 28 + lum;
        d[i + 3] = a <= 90 ? 0 : a >= 150 ? 255 : Math.round((a - 90) / 60 * 255);
      }
      og.putImageData(img, 0, 0);
      // Неоновый контур запекаем один раз: живой shadowBlur на каждом кадре — самое дорогое в canvas
      const pad = 12;
      const outHalf = half + pad;
      const out = document.createElement('canvas');
      out.width = Math.ceil(outHalf * 2 * dpr);
      out.height = out.width;
      const gg = out.getContext('2d');
      gg.setTransform(dpr, 0, 0, dpr, 0, 0);
      quality.bake(() => {
        gg.shadowColor = withAlpha(THEMES[slot.themeId] ? THEMES[slot.themeId].accent : '#ffffff', 0.95);
        gg.shadowBlur = 10;
        gg.drawImage(c, pad, pad, half * 2, half * 2);
      });
      sil = { canvas: out, half: outHalf };
    } catch (err) {
      sil = null;
    }
    silhouetteCache.set(key, sil);
    return sil;
  }

  // Готовый спрайт слайма со свечением: рисуется один раз, дальше только drawImage
  function spriteOf(slot) {
    const dpr = Math.min(window.devicePixelRatio || 1, quality.maxDpr());
    const key = `${slot.themeId || 'base'}:${slot.level}:${slot.r}:${dpr}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    let spr = null;
    try {
      const half = Math.ceil(slot.r * 2.2);
      const c = document.createElement('canvas');
      c.width = Math.ceil(half * 2 * dpr);
      c.height = c.width;
      const og = c.getContext('2d');
      og.setTransform(dpr, 0, 0, dpr, 0, 0);
      quality.bake(() => drawOn(og, { ...slot, x: half, y: half, unlocked: true }, 0, 0.6));
      spr = { canvas: c, half };
    } catch (err) {
      spr = null;
    }
    spriteCache.set(key, spr);
    return spr;
  }

  function drawSprite(g, slot, y, alpha) {
    const spr = drawOn ? spriteOf(slot) : null;
    if (!spr) {
      g.save();
      g.globalAlpha *= alpha;
      draw({ ...slot, unlocked: true, y }, performance.now());
      g.restore();
      return;
    }
    g.save();
    g.globalAlpha *= alpha;
    g.drawImage(spr.canvas, slot.x - spr.half, y - spr.half, spr.half * 2, spr.half * 2);
    g.restore();
  }

  function drawSlimeSilhouette(g, pod, slot, isActive, now) {
    const sil = silhouetteOf(slot);
    if (!sil) return false;
    const bob = Math.sin(now * 0.0018 + slot.level * 1.7) * slot.r * 0.06;
    const pulse = 0.75 + 0.25 * Math.sin(now * 0.0025 + slot.level);
    g.save();
    g.globalAlpha = (isActive ? 1 : 0.7) * (0.8 + 0.2 * pulse);
    const s = sil.half * 2;
    g.drawImage(sil.canvas, slot.x - sil.half, slot.y - sil.half + bob, s, s);
    g.restore();
    text(g, '?', slot.x, slot.y + bob + slot.r * 0.05, Math.max(9, slot.r * 0.62), withAlpha(pod.accent, 0.75), null, isActive ? 0.9 : 0.55);
    return true;
  }

function drawBlackSilhouette(g, pod, slot, alpha, now = performance.now()) {
  const { x, y, r } = slot;
  
  g.save();
  g.globalAlpha = alpha;

  // 1. Базовая тёмная подложка ячейки/слота
  g.beginPath();
  g.arc(x, y, r * 0.75, 0, Math.PI * 2);
  g.fillStyle = 'rgba(4, 7, 18, 0.65)';
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  g.lineWidth = 1;
  g.stroke();

  // 2. Индивидуальные стильные заглушки по темам
  switch (pod.id) {
    case 'planets': // 🪐 КОСМОС / ПЛАНЕТЫ
    case 'space': {
      // Вращающаяся микро-орбита
      const angle = now * 0.001 + slot.level;
      g.beginPath();
      g.ellipse(x, y, r * 0.5, r * 0.25, angle, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      g.lineWidth = 1;
      g.stroke();

      // Загадочное ядро-планета в центре
      g.beginPath();
      g.arc(x, y, r * 0.22, 0, Math.PI * 2);
      g.fillStyle = 'rgba(0, 243, 255, 0.35)';
      g.fill();
      break;
    }

    case 'beasts': // 🐾 ЗВЕРИ / ПРИРОДА
    case 'animals': {
      // Светящийся аккуратный отпечаток лапки
      const padColor = 'rgba(255, 170, 0, 0.35)';
      // Центральная подушечка
      g.beginPath();
      g.arc(x, y + r * 0.08, r * 0.18, 0, Math.PI * 2);
      g.fillStyle = padColor;
      g.fill();

      // Пальчики (4 точки по дуге)
      const toes = [-0.28, -0.09, 0.09, 0.28];
      toes.forEach(a => {
        const tx = x + Math.sin(a * 2) * (r * 0.32);
        const ty = y - Math.cos(a * 2) * (r * 0.28);
        g.beginPath();
        g.arc(tx, ty, r * 0.07, 0, Math.PI * 2);
        g.fill();
      });
      break;
    }

    case 'ocean': // 😍 EMOJI
    case 'water': {
      // Заблокированный эмодзи: милый знак вопроса в стеклянном квадрате
      const bob = Math.sin(now * 0.0026 + slot.level) * r * 0.06;
      g.beginPath();
      if (g.roundRect) g.roundRect(x - r * 0.5, y - r * 0.5 + bob, r, r, r * 0.3);
      else g.rect(x - r * 0.5, y - r * 0.5 + bob, r, r);
      g.fillStyle = 'rgba(255, 140, 220, 0.22)';
      g.fill();
      g.strokeStyle = 'rgba(255, 190, 240, 0.4)';
      g.lineWidth = 1.2;
      g.stroke();
      g.font = `${r * 0.7}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255, 235, 250, 0.55)';
      g.fillText('❔', x, y + bob + r * 0.06);
      break;
    }

    default: {
      // Универсальная стильная иконка замочка / вопросика
      g.font = `${r * 0.5}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255, 255, 255, 0.25)';
      g.fillText('✦', x, y);
      break;
    }
  }

  g.restore();
}

function drawPod(g, pod, now) {
    const isActive = pod.id === selectedThemeId();
    const glass = isActive ? animGlass[pod.id] : animGlass[pod.id];
    const pop = animPop[pod.id];
    const sc = 1 + easeOutCubic(Math.max(0, pop)) * 0.035;
    const lift = isActive && glass < 0.6 ? -4 : 0;
    const cy = pod.yCenter;
    const hw = pod.podW / 2;

    g.save();
    if (Math.abs(sc - 1) > 0.001) {
      g.translate(pod.cx, cy + lift);
      g.scale(sc, sc);
      g.translate(-pod.cx, -(cy + lift));
    }

    const px = pod.cx - hw;
    const py = pod.podTop;
    const pb = pod.podBottom;
    const pw = pod.podW;
    const ph = pb - py;

    // 1. Внешняя тень карточки
    g.save();
    roundRectPath(g, px, py, pw, ph, 16);
    g.shadowColor = isActive ? withAlpha(pod.accent, 0.35) : 'rgba(0, 0, 0, 0.6)';
    g.shadowBlur = isActive ? 26 : 16;
    g.shadowOffsetY = 8;
    g.fillStyle = '#05060f';
    g.fill();
    g.restore();

    // 2. Тёмное глянцевое стекло
    roundRectPath(g, px, py, pw, ph, 16);
    g.save();
    g.clip();

    const bgGrad = g.createLinearGradient(px, py, px, pb);
    if (isActive) {
      bgGrad.addColorStop(0, 'rgba(64, 84, 150, 0.30)');
      bgGrad.addColorStop(0.5, 'rgba(38, 50, 104, 0.26)');
      bgGrad.addColorStop(1, 'rgba(24, 30, 72, 0.34)');
    } else {
      bgGrad.addColorStop(0, 'rgba(38, 44, 78, 0.34)');
      bgGrad.addColorStop(0.55, 'rgba(24, 28, 56, 0.34)');
      bgGrad.addColorStop(1, 'rgba(14, 16, 36, 0.42)');
    }
    g.fillStyle = bgGrad;
    g.fillRect(px, py, pw, ph);

    // Верхний рефлекс стекла — узкая светлая полоса
    const sheen = g.createLinearGradient(px, py, px, py + ph * 0.32);
    sheen.addColorStop(0, `rgba(255, 255, 255, ${isActive ? 0.16 : 0.09})`);
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = sheen;
    g.fillRect(px, py, pw, ph * 0.32);

    // Внутреннее затемнение по краям — стекло «уходит» в глубину
    const inner = g.createRadialGradient(pod.cx, py + ph * 0.42, pw * 0.2, pod.cx, py + ph / 2, pw * 0.85);
    inner.addColorStop(0, 'rgba(0, 0, 0, 0)');
    inner.addColorStop(1, 'rgba(4, 6, 18, 0.5)');
    g.fillStyle = inner;
    g.fillRect(px, py, pw, ph);

    // 3. Заряд батарейки и тропинка между слотами — под слаймами
    drawPodCharge(g, pod, isActive, now, px, py, pw, pb);
    drawPodPath(g, pod, isActive);

    // 4. Слаймы
    pod.slots.forEach(slot => {
      const open = pod.unlocked && slot.level <= pod.maxLv;
      if (open && isActive && !quality.low) {
        // Активная капсула рисуется вживую — крылья машут, эмодзи моргают
        const bob = Math.sin(now * 0.0022 + slot.level * 1.3) * slot.r * 0.12;
        g.save();
        g.shadowColor = pod.accentGlow;
        g.shadowBlur = 4;
        draw({ ...slot, unlocked: true, y: slot.y + bob }, now);
        g.restore();
      } else if (open) {
        // Остальные — готовым спрайтом: на замерах полная перерисовка всех капсул роняла FPS вдвое
        const bob = Math.sin(now * 0.0022 + slot.level * 1.3) * slot.r * (isActive ? 0.12 : 0.1);
        drawSprite(g, slot, slot.y + bob, isActive ? 1 : 0.75);
      } else if (!drawSlimeSilhouette(g, pod, slot, isActive, now)) {
        drawBlackSilhouette(g, pod, slot, isActive ? 0.85 : 0.45, now);
      }
    });

    // 4. Чёткий рефлекс по верхней кромке стекла
    g.save();
    roundRectPath(g, px + 1, py + 1, pw - 2, ph - 2, 15);
    g.clip();
    const edge = g.createLinearGradient(px, py, px, py + 14);
    edge.addColorStop(0, `rgba(255, 255, 255, ${isActive ? 0.34 : 0.2})`);
    edge.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = edge;
    g.fillRect(px, py, pw, 14);
    g.restore();

    // Затемнение неактивных карточек
    if (glass > 0.01 && !isActive) {
      g.fillStyle = `rgba(4, 6, 16, ${0.34 * glass})`;
      g.fillRect(px, py, pw, ph);
    }

    // Закрытые карточки — заметно темнее: силуэты угадываются, но видно, что заперто
    if (!pod.unlocked) {
      g.fillStyle = 'rgba(2, 3, 12, 0.46)';
      g.fillRect(px, py, pw, ph);
    }
    g.restore();

    // 5. СОЧНЫЕ НЕОНОВЫЕ РАМКИ
    roundRectPath(g, px, py, pw, ph, 16);
    if (isActive) {
      // Активная: яркий чёткий контур Cyan #00E8FF -> Hot Pink #FF3399
      const gg = g.createLinearGradient(px, py, px + pw, pb);
      gg.addColorStop(0, '#00E8FF');
      gg.addColorStop(0.5, '#4FA8FF');
      gg.addColorStop(1, '#FF3399');
      g.save();
      g.strokeStyle = gg;
      g.shadowColor = 'rgba(0, 232, 255, 0.9)';
      g.shadowBlur = 14;
      g.lineWidth = 2.4;
      g.stroke();
      g.restore();

      // Внутренний светлый кант
      roundRectPath(g, px + 2.4, py + 2.4, pw - 4.8, ph - 4.8, 14);
      g.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      g.lineWidth = 1;
      g.stroke();
    } else {
      // Неактивные: тонкий, но контрастный светящийся контур
      const gg = g.createLinearGradient(px, py, px + pw, pb);
      gg.addColorStop(0, withAlpha(pod.accent, pod.unlocked ? 0.6 : 0.24));
      gg.addColorStop(1, withAlpha(pod.accent, pod.unlocked ? 0.34 : 0.14));
      g.save();
      g.strokeStyle = gg;
      g.shadowColor = pod.unlocked ? pod.accentGlow : 'transparent';
      g.shadowBlur = pod.unlocked ? 8 : 0;
      g.lineWidth = pod.unlocked ? 1.4 : 1;
      g.stroke();
      g.restore();
    }

    // 6. ВЕРХНЯЯ КРАШЕЧКА / КАТOД (Battery Cap)
    const capW = pw * 0.38;
    const capPy = pod.capY0;
    const capHgt = pod.capH;
    roundRectPath(g, pod.cx - capW / 2, capPy, capW, capHgt, 4);
    
    const capGrad = g.createLinearGradient(pod.cx - capW / 2, capPy, pod.cx + capW / 2, capPy);
    capGrad.addColorStop(0, '#1a1d26');
    capGrad.addColorStop(0.5, '#3a3f52');
    capGrad.addColorStop(1, '#1a1d26');
    g.fillStyle = capGrad;
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    g.lineWidth = 1;
    g.stroke();

    // HEADER (Иконка + Счётчик)
    g.save();
    g.globalAlpha = isActive ? 1 : (pod.unlocked ? 0.75 : 0.5);
    g.font = `${clamp(12, rect.width * 0.03, 19)}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = isActive ? pod.accentGlow : 'rgba(0,0,0,0)';
    g.shadowBlur = isActive ? 8 : 0;
    g.fillText(pod.icon || '', pod.cx, pod.podTop + pod.headerH * 0.42);
    g.restore();

    if (pod.unlocked) {
      text(
        g,
        pod.slots.filter(sl => sl.level <= pod.maxLv).length + '/' + pod.slotCount,
        pod.cx + hw - 22,
        pod.podTop + pod.headerH * 0.42,
        clamp(8, rect.width * 0.018, 12),
        isActive ? 'rgba(150, 245, 255, 0.95)' : 'rgba(205, 220, 255, 0.7)',
        isActive ? 'rgba(0, 243, 255, 0.45)' : null,
        0.9
      );
    }

    drawPodFooter(g, pod, isActive);
    if (!pod.unlocked) drawPodLock(g, pod, isActive, now);

    g.restore();
  }

  // Насколько близко открытие мира: считаем слаймы коллекции, а не номера уровней
  function unlockProgress(req) {
    const levels = Object.keys(collectionLevels(req.themeId)).map(Number);
    const have = progress.isThemeUnlocked(req.themeId) ? progress.getThemeMaxLevel(req.themeId) : 0;
    const need = levels.filter(l => l <= req.requiredLevel).length;
    const got = levels.filter(l => l <= Math.min(have, req.requiredLevel)).length;
    return need > 0 ? clamp(0, got / need, 1) : 0;
  }

  // Большой навесной замок в центре закрытой капсулы, вокруг — кольцо прогресса до открытия
  function drawPodLock(g, pod, isActive, now) {
    const req = THEMES[pod.id].unlockRequirement;
    const frac = req ? unlockProgress(req) : 0;
    const R = clamp(26, pod.podW * 0.26, 46);
    const cx = pod.cx;
    const cy = pod.podTop + pod.headerH + (pod.podBottom - pod.footerH - pod.podTop - pod.headerH) * 0.45;

    // Раз в несколько секунд замок чуть покачивается; по тапу — трясётся как запертая дверь
    const shakeT = lockShakeAt[pod.id] ? (now - lockShakeAt[pod.id]) / 520 : 2;
    const shake = shakeT < 1 ? Math.sin(shakeT * Math.PI * 7) * (1 - shakeT) * 0.28 : 0;
    const idleCycle = ((now * 0.001 + pod.cx * 0.01) % 5) / 5;
    const idle = idleCycle > 0.9 ? Math.sin((idleCycle - 0.9) / 0.1 * Math.PI * 3) * 0.06 : 0;

    g.save();
    g.translate(cx, cy);

    // стеклянный диск
    const disc = g.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R);
    disc.addColorStop(0, 'rgba(40, 46, 86, 0.95)');
    disc.addColorStop(1, 'rgba(8, 10, 26, 0.95)');
    g.fillStyle = disc;
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.fill();

    // кольцо прогресса: фон и заполненная часть
    const ringR = R - 3;
    g.lineCap = 'round';
    g.lineWidth = 3.5;
    g.strokeStyle = withAlpha(pod.accent, 0.16);
    g.beginPath();
    g.arc(0, 0, ringR, 0, Math.PI * 2);
    g.stroke();
    if (frac > 0) {
      g.save();
      g.strokeStyle = pod.accent;
      g.shadowColor = pod.accent;
      g.shadowBlur = isActive ? 10 : 5;
      g.beginPath();
      g.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      g.stroke();
      g.restore();
    }

    // сам замок — качается вокруг дужки
    g.rotate(shake + idle);
    const bw = R * 0.92;
    const bh = R * 0.72;
    const by = -R * 0.12;
    // дужка
    g.lineWidth = R * 0.14;
    g.strokeStyle = 'rgba(205, 215, 240, 0.95)';
    g.beginPath();
    g.moveTo(-bw * 0.3, by + 1);
    g.lineTo(-bw * 0.3, by - bh * 0.3);
    g.arc(0, by - bh * 0.3, bw * 0.3, Math.PI, 0);
    g.lineTo(bw * 0.3, by + 1);
    g.stroke();
    // корпус
    const body = g.createLinearGradient(0, by, 0, by + bh);
    body.addColorStop(0, '#f3f6ff');
    body.addColorStop(1, withAlpha(pod.accent, 0.95));
    g.save();
    g.shadowColor = withAlpha(pod.accent, 0.8);
    g.shadowBlur = isActive ? 14 : 7;
    roundRectPath(g, -bw / 2, by, bw, bh, R * 0.14);
    g.fillStyle = body;
    g.fill();
    g.restore();
    // замочная скважина
    g.fillStyle = 'rgba(10, 12, 30, 0.85)';
    g.beginPath();
    g.arc(0, by + bh * 0.4, R * 0.1, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-R * 0.05, by + bh * 0.42);
    g.lineTo(R * 0.05, by + bh * 0.42);
    g.lineTo(R * 0.035, by + bh * 0.74);
    g.lineTo(-R * 0.035, by + bh * 0.74);
    g.closePath();
    g.fill();
    g.restore();
  }

  // Индекс самого высокого открытого слота (−1 — ничего не открыто)
  function openIndex(pod) {
    if (!pod.unlocked) return -1;
    let k = -1;
    pod.slots.forEach((sl, i) => { if (sl.level <= pod.maxLv) k = i; });
    return k;
  }

  // Жидкость цвета мира поднимается до последнего открытого слайма:
  // волнистая поверхность и пузырьки — прогресс виден издалека
  function drawPodCharge(g, pod, isActive, now, px, py, pw, pb) {
    const k = openIndex(pod);
    if (k < 0) return;
    const top = k === pod.slots.length - 1
      ? py + pod.headerH
      : pod.slots[k].y - pod.slots[k].r - 8;
    const amp = 3;
    const t = now * 0.002;
    const surface = x => top + Math.sin(x * 0.06 + t) * amp + Math.sin(x * 0.11 - t * 1.3) * amp * 0.5;

    g.save();
    g.beginPath();
    g.moveTo(px, pb);
    for (let x = px; x <= px + pw; x += 6) g.lineTo(x, surface(x));
    g.lineTo(px + pw, surface(px + pw));
    g.lineTo(px + pw, pb);
    g.closePath();
    const fill = g.createLinearGradient(0, top, 0, pb);
    fill.addColorStop(0, withAlpha(pod.accent, isActive ? 0.2 : 0.11));
    fill.addColorStop(1, withAlpha(pod.accent, isActive ? 0.34 : 0.18));
    g.fillStyle = fill;
    g.fill();

    // светящаяся кромка поверхности
    g.beginPath();
    for (let x = px; x <= px + pw; x += 6) {
      if (x === px) g.moveTo(x, surface(x));
      else g.lineTo(x, surface(x));
    }
    g.strokeStyle = withAlpha(pod.accent, isActive ? 0.75 : 0.4);
    g.lineWidth = 1.5;
    g.stroke();

    // пузырьки поднимаются со дна к поверхности
    const depth = pb - top;
    if (depth > 20) {
      for (let i = 0; i < 7; i++) {
        const speed = 0.018 + (i % 3) * 0.008;
        const y = pb - ((now * speed + i * 83) % depth);
        const x = px + pw * (0.14 + ((i * 0.37) % 1) * 0.72) + Math.sin(now * 0.003 + i) * 3;
        g.beginPath();
        g.arc(x, y, 1.4 + (i % 3) * 0.7, 0, Math.PI * 2);
        g.fillStyle = withAlpha('#ffffff', isActive ? 0.35 : 0.18);
        g.fill();
      }
    }
    g.restore();
  }

  // Тропинка через все слоты: пройденная часть светится, дальше — пунктир
  function drawPodPath(g, pod, isActive) {
    const pts = pod.slots;
    if (pts.length < 2) return;
    const trace = (from, to) => {
      g.beginPath();
      g.moveTo(pts[from].x, pts[from].y);
      for (let i = from + 1; i <= to; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const my = (a.y + b.y) / 2;
        g.bezierCurveTo(a.x, my, b.x, my, b.x, b.y);
      }
    };
    g.save();
    g.lineCap = 'round';
    g.setLineDash([3, 6]);
    g.strokeStyle = withAlpha(pod.accent, isActive ? 0.3 : 0.16);
    g.lineWidth = 2;
    trace(0, pts.length - 1);
    g.stroke();
    g.setLineDash([]);
    const k = openIndex(pod);
    if (k >= 1) {
      g.strokeStyle = withAlpha(pod.accent, isActive ? 0.22 : 0.12);
      g.lineWidth = 7;
      trace(0, k);
      g.stroke();
      g.strokeStyle = withAlpha(pod.accent, isActive ? 0.9 : 0.5);
      g.lineWidth = 2.2;
      trace(0, k);
      g.stroke();
    }
    g.restore();
  }

  // Подпись капсулы: название мира, а у закрытых — какой слайм нужен и сколько осталось
  function drawPodFooter(g, pod, isActive) {
    const hw = pod.podW / 2;
    const maxW = pod.podW - 16;
    const top = pod.podBottom - pod.footerH;
    const req = pod.unlocked ? null : THEMES[pod.id].unlockRequirement;
    const titleSize = fitFontSize(g, pod.title, maxW, clamp(10, rect.width * 0.024, 14), 8, 2.5);
    const alpha = isActive ? 1 : pod.unlocked ? 0.8 : 0.65;

    g.save();
    g.strokeStyle = withAlpha(pod.accent, 0.18);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pod.cx - hw + 12, top);
    g.lineTo(pod.cx + hw - 12, top);
    g.stroke();
    g.restore();

    if (!req) {
      text(g, pod.title, pod.cx, top + pod.footerH / 2, titleSize, pod.accent, isActive ? pod.accentGlow : null, alpha, 2.5);
      return;
    }

    const target = getSlimeConfig(req.requiredLevel, req.themeId);
    const need = `${target.name} in ${THEMES[req.themeId].title}`.toUpperCase();
    const frac = unlockProgress(req);
    const y1 = top + pod.footerH * 0.27;
    const y2 = top + pod.footerH * 0.56;
    const y3 = top + pod.footerH * 0.8;

    text(g, pod.title, pod.cx, y1, titleSize, pod.accent, isActive ? pod.accentGlow : null, alpha, 2.5);
    const needSize = fitFontSize(g, need, maxW, clamp(8, rect.width * 0.017, 10), 6, 1);
    text(g, need, pod.cx, y2, needSize, 'rgba(215, 225, 255, 0.85)', null, alpha, 1);

    // Полоска прогресса к нужному слайму
    const bw = Math.min(maxW, 120);
    const bh = 3;
    g.save();
    g.globalAlpha = alpha;
    roundRectPath(g, pod.cx - bw / 2, y3 - bh / 2, bw, bh, bh / 2);
    g.fillStyle = 'rgba(255, 255, 255, 0.1)';
    g.fill();
    if (frac > 0) {
      roundRectPath(g, pod.cx - bw / 2, y3 - bh / 2, Math.max(bh, bw * frac), bh, bh / 2);
      g.fillStyle = pod.accent;
      g.shadowColor = pod.accentGlow;
      g.shadowBlur = 6;
      g.fill();
    }
    g.restore();
  }

  function frame() {
    if (!running) return;
    if (!ensureLayout()) {
      rafId = requestAnimationFrame(frame);
      return;
    }
    const now = performance.now();
    if (lastFrameAt) quality.sample(now - lastFrameAt);
    lastFrameAt = now;

    // animate glass / pop
    const target = selectedThemeId();
    THEME_ORDER.forEach(id => {
      const t = id === target ? 0 : 1;
      animGlass[id] += (t - animGlass[id]) * 0.14;
      if (animGlass[id] < 0.005) animGlass[id] = 0;
      if (animGlass[id] > 0.995 && t === 1) animGlass[id] = 1;
      if (animPop[id] > 0) animPop[id] = Math.max(0, animPop[id] - 0.05);
    });

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawNebula(ctx, now);
    drawPyramid(ctx, now);
    drawBalanceLine(ctx);
    layout.pods.forEach(p => drawPod(ctx, p, now));

    rafId = requestAnimationFrame(frame);
  }

  function updateLabels() {
    const id = selectedThemeId();
    const t = THEMES[id];
    const unlocked = progress.isThemeUnlocked(id);
    if (selectedLabelEl) selectedLabelEl.textContent = t ? podDisplay(id).title : '';
    if (recordLabelEl) {
      const req = t && t.unlockRequirement;
      recordLabelEl.textContent = unlocked || !req
        ? 'Record: ' + progress.getHighScore(id).toLocaleString()
        : `Get ${getSlimeConfig(req.requiredLevel, req.themeId).name} in ${THEMES[req.themeId].title} to unlock`;
    }
    if (playBtn) {
      // Закрытый мир — кнопка честно говорит об этом, а не молча показывает подсказку по тапу
      playBtn.classList.toggle('locked', !unlocked);
      playBtn.innerHTML = unlocked
        ? '<svg class="start-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg><span>PLAY</span>'
        : '<svg class="start-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V7.5a5 5 0 0 1 10 0V11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="11" width="14" height="9.5" rx="2.4" fill="currentColor"/></svg><span>LOCKED</span>';
      playBtn.setAttribute('aria-label', unlocked ? 'Play' : 'Locked world');
    }
  }

  function showTooltipNear(textStr) {
    if (!tooltipEl || !rect) return;
    tooltipEl.textContent = textStr;
    tooltipEl.classList.remove('hidden');
    const r = canvasEl.getBoundingClientRect();
    const tw = Math.min(Math.max(140, tooltipEl.offsetWidth || 200), r.width - 24);
    let left = r.width / 2 - tw / 2;
    left = Math.max(6, Math.min(r.width - tw - 6, left));
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = (rect.height * 0.86) + 'px';
    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(hideTooltip, 2400);
  }

  function hideTooltip() {
    if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = 0; }
    if (tooltipEl) tooltipEl.classList.add('hidden');
  }

  function select(index) {
    if (index === activeIndex) { updateLabels(); return; }
    activeIndex = index;
    animPop[selectedThemeId()] = Math.max(animPop[selectedThemeId()] || 0, 0.7);
    progress.setSelectedTheme(selectedThemeId());
    updateLabels();
  }

  function onPointerDown(e) {
    if (!layout || !rect) return;
    const r = canvasEl.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    for (let i = 0; i < layout.pods.length; i++) {
      const p = layout.pods[i];
      const hit = x >= p.cx - p.podW / 2 - 4 && x <= p.cx + p.podW / 2 + 4 &&
        y >= p.capY0 - 8 && y <= p.podBottom + 4;
      if (hit) {
        select(i);
        if (!p.unlocked) lockShakeAt[p.id] = performance.now();
        break;
      }
    }
  }

  async function onPlayTap() {
    if (busy) return;
    const pod = layout ? layout.pods[activeIndex] : null;
    if (!pod || !rect) return;
    if (!pod.unlocked) {
      const req = THEMES[pod.id].unlockRequirement;
      lockShakeAt[pod.id] = performance.now();
      showTooltipNear(req ? `Get ${getSlimeConfig(req.requiredLevel, req.themeId).name} in ${THEMES[req.themeId].title} to unlock` : 'World is locked');
      return;
    }
    if (!pod.playable) {
      showTooltipNear('This world is coming soon');
      return;
    }
    busy = true;
    if (playBtn) { playBtn.disabled = true; playBtn.classList.add('disabled'); }
    try {
      await onPlay(pod.id);
    } catch (err) {
      showTooltipNear('Failed to load world');
    }
    busy = false;
    if (playBtn) { playBtn.disabled = false; playBtn.classList.remove('disabled'); }
  }

  return {
    show() {
      running = true;
      activeIndex = Math.max(0, THEME_ORDER.indexOf(progress.getSelectedTheme()));
      ensureLayout();
      if (!playBtn._ssHook) { playBtn.addEventListener('click', onPlayTap); playBtn._ssHook = true; }
      canvasEl.addEventListener('pointerdown', onPointerDown);
      updateLabels();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(frame);
    },
    hide() {
      running = false;
      cancelAnimationFrame(rafId);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      hideTooltip();
      if (playBtn) { playBtn.disabled = false; playBtn.classList.remove('disabled'); }
      if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    },
    isRunning() {
      return running;
    },
    getLayout() {
      return {
        activeIndex,
        world: THEME_ORDER[activeIndex],
        podW: layout ? Math.round(layout.podW) : 0,
        base: 5,
        baseSlots: layout ? layout.base.cubes.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), r: Math.round(c.r) })) : [],
        pods: layout ? layout.pods.map(p => ({
          id: p.id,
          title: p.title,
          accent: p.accent,
          unlocked: p.unlocked,
          open: p.maxLv,
          cx: Math.round(p.cx),
          x: Math.round(p.cx - p.podW / 2),
          top: Math.round(p.podTop),
          bottom: Math.round(p.podBottom),
          w: Math.round(p.podW),
          slots: p.slots.map(sl => ({ lv: sl.level, x: Math.round(sl.x), y: Math.round(sl.y), r: sl.r, open: p.unlocked && sl.level <= p.maxLv }))
        })) : []
      };
    }
  };
}