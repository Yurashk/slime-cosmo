import { THEMES, THEME_ORDER, themeSlimeLevels, entityIdOf } from './themes/registry.js';
import { progress } from './state.js';

const FONT = '"Courier New", monospace';
const EMOJI = { space: '🪐', animals: '🦁', ocean: '🐙' };
const NEON = {
  cyan: '#00f3ff',
  magenta: '#ff0055',
  green: '#00ff66'
};
const BLACK = '#050608';

function clamp(lo, v, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function text(g, str, x, y, size, color, glow, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `800 ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (glow) {
    g.shadowColor = glow;
    g.shadowBlur = 10;
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
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

export function createStartScreen(opts) {
  const {
    canvasEl,
    tooltipEl,
    selectedLabelEl,
    recordLabelEl,
    playBtn,
    draw,
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

  function measure() {
    const r = canvasEl.getBoundingClientRect();
    if (!r || r.width < 2 || r.height < 2) return false;
    rect = r;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return true;
  }

  function podData(W, H, cx, podW, id) {
    const t = THEMES[id];
    const s = Math.min(W, H);
    const capH = clamp(8, H * 0.011, 12);
    const podTop = H * 0.245;
    const capY0 = podTop - capH - 3;
    const headerH = clamp(30, H * 0.045, 42);
    const slimeY0 = podTop + headerH;
    const podBottom = H * 0.82;
    const slotsY1 = podBottom - 8;
    const n = 9;
    const step = (slotsY1 - slimeY0) / (n - 1);
    const r = clamp(15, s * 0.042, 22);
    const sway = clamp(14, podW * 0.2, 26);
    const levels = themeSlimeLevels(id);
    const slots = levels.map((lv, i) => ({
      level: lv,
      entityId: entityIdOf(id, lv),
      r,
      x: Math.round(cx + (i % 2 === 0 ? -1 : 1) * sway),
      y: Math.round(slimeY0 + i * step),
      unlocked: false
    }));
    const unlocked = progress.isThemeUnlocked(id);
    const maxLv = unlocked ? progress.getThemeMaxLevel(id) : 0;
    return {
      id,
      title: t.title.toUpperCase(),
      accent: t.accent,
      accentGlow: t.accentGlow,
      lockShape: t.lockShape,
      playable: t.playable,
      unlocked,
      maxLv,
      slots,
      cx,
      podW,
      podTop,
      podBottom,
      capY0,
      capH,
      headerH,
      yCenter: (podTop + podBottom) / 2
    };
  }

  function pyramidData(W, H) {
    const s = Math.min(W, H);
    const cx = W / 2;
    const r = clamp(9, s * 0.026, 17);
    const yTop = H * 0.075;
    const yBot = yTop + r * 2.2;
    return {
      r,
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
    const podW = (W - gap * 4) / 3;
    const cxs = THEME_ORDER.map((_, i) => gap + podW / 2 + i * (podW + gap));
    const pods = THEME_ORDER.map((id, i) => podData(W, H, cxs[i], podW, id));
    return { pods, podW, gap, base: pyramidData(W, H) };
  }

  function ensureLayout() {
    if (!measure()) return false;
    const key = rect.width + 'x' + rect.height;
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
    const n1 = g.createRadialGradient(W * 0.18, H * 0.12, 0, W * 0.18, H * 0.12, W * 0.5);
    n1.addColorStop(0, 'rgba(0, 243, 255, 0.07)');
    n1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = n1;
    g.fillRect(0, 0, W, H);
    const n2 = g.createRadialGradient(W * 0.88, H * 0.78, 0, W * 0.88, H * 0.78, W * 0.55);
    n2.addColorStop(0, 'rgba(255, 0, 85, 0.06)');
    n2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = n2;
    g.fillRect(0, 0, W, H);
  }

  function drawStars(g, now) {
    const W = rect.width;
    const H = rect.height;
    for (let i = 0; i < 40; i++) {
      const fx = (i * 0.618034) % 1;
      const fy = ((i * 0.381966) % 1 + now * 0.00001 * (i % 3 + 1)) % 1;
      if (fy > 0.88) continue;
      g.globalAlpha = 0.05 + 0.1 * Math.abs(Math.sin(now * 0.0016 + i * 1.7));
      g.fillStyle = i % 4 === 0 ? '#c7d8ff' : '#9fe8ff';
      g.beginPath();
      g.arc(fx * W, fy * H, 0.6 + (i % 3) * 0.5, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
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
      g.globalAlpha = isActive ? 0.95 : 0.22;
      g.strokeStyle = isActive ? NEON.cyan : 'rgba(255, 255, 255, 0.15)';
      g.lineWidth = isActive ? 3 : 2;
      g.shadowColor = isActive ? NEON.cyan : 'rgba(0,0,0,0)';
      g.shadowBlur = isActive ? 12 : 0;
      if (isActive) {
        g.setLineDash([6, 9]);
        g.lineDashOffset = -now * 0.04;
      }
      g.beginPath();
      g.moveTo(v.sx, v.sy);
      g.quadraticCurveTo(cpX, cpY, v.pod.cx, endY);
      g.stroke();
      g.setLineDash([]);
      if (isActive) {
        g.fillStyle = '#d9fbff';
        g.shadowBlur = 8;
        g.beginPath();
        g.arc(v.pod.cx, endY, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    });
    // base cubes
    b.cubes.forEach((c, i) => {
      const bob = Math.sin(now * 0.002 + i * 1.3) * c.r * 0.1;
      g.save();
      g.shadowColor = 'rgba(0, 243, 255, 0.35)';
      g.shadowBlur = 6;
      draw({ ...c, level: i + 1, unlocked: true, y: c.y + bob }, now);
      g.restore();
    });
  }

  function shapePath(g, col, slot) {
    const r = slot.r;
    const puffer = col.lockShape === 'fish' && slot.level % 2 === 0;
    if (col.lockShape === 'fish') {
      g.beginPath();
      if (puffer) {
        g.moveTo(-r * 0.58, 0);
        g.lineTo(-r * 0.95, -r * 0.3);
        g.lineTo(-r * 0.95, r * 0.3);
      } else {
        g.moveTo(-r * 0.55, 0);
        g.lineTo(-r * 1.02, -r * 0.44);
        g.lineTo(-r * 1.02, r * 0.44);
      }
      g.closePath();
      g.ellipse(r * 0.02, 0, r * 0.6, r * 0.56, 0, 0, Math.PI * 2);
    } else if (col.lockShape === 'animal') {
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

  function drawBlackSilhouette(g, col, slot, alpha) {
    g.save();
    g.translate(slot.x, slot.y);
    g.globalAlpha = alpha;
    g.fillStyle = BLACK;
    g.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    g.lineWidth = 1.5;
    shapePath(g, col, slot);
    g.fill();
    g.stroke();
    if (col.lockShape === 'planet' && slot.r > 10) {
      g.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      g.beginPath();
      g.ellipse(0, 0, slot.r * 1.25, slot.r * 0.4, 0.5, 0, Math.PI * 2);
      g.stroke();
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

    // container background
    roundRectPath(g, px, py, pw, ph, 14);
    g.save();
    g.clip();
    g.fillStyle = 'rgba(255, 255, 255, 0.03)';
    g.fillRect(px, py, pw, ph);
    // subtle inner energy for active
    if (isActive) {
      const ig = g.createRadialGradient(pod.cx, (py + pb) / 2, 0, pod.cx, (py + pb) / 2, hw * 1.4);
      ig.addColorStop(0, 'rgba(0, 243, 255, 0.09)');
      ig.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = ig;
      g.fillRect(px, py, pw, ph);
    } else if (glass > 0.01) {
      g.fillStyle = `rgba(5, 8, 18, ${0.2 * glass})`;
      g.fillRect(px, py, pw, ph);
    }

    // slimes
    pod.slots.forEach(slot => {
      const open = pod.unlocked && slot.level <= pod.maxLv;
      const dim = isActive ? 1 : 0.55;
      if (open && isActive) {
        const bob = Math.sin(now * 0.0022 + slot.level * 1.3) * slot.r * 0.12;
        g.save();
        g.shadowColor = pod.accentGlow;
        g.shadowBlur = 8;
        draw({ ...slot, unlocked: true, y: slot.y + bob }, now);
        g.restore();
      } else if (open && !isActive) {
        const bob = Math.sin(now * 0.0022 + slot.level * 1.3) * slot.r * 0.1;
        g.save();
        g.globalAlpha = dim;
        draw({ ...slot, unlocked: true, y: slot.y + bob }, now);
        g.restore();
      } else {
        drawBlackSilhouette(g, pod, slot, isActive ? 0.85 : 0.5);
      }
    });

    // locked heavy dim + vignette
    if (!pod.unlocked) {
      g.fillStyle = 'rgba(0, 0, 0, 0.25)';
      g.fillRect(px, py, pw, ph);
    }
    g.restore();

    // border
    roundRectPath(g, px, py, pw, ph, 14);
    if (isActive) {
      g.strokeStyle = NEON.cyan;
      g.shadowColor = NEON.cyan;
      g.shadowBlur = 16;
      g.lineWidth = 1.6;
      g.stroke();
      g.shadowBlur = 34;
      g.globalAlpha = 0.5;
      g.stroke();
      g.globalAlpha = 1;
    } else {
      g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      g.shadowBlur = 0;
      g.lineWidth = 1.4;
      g.stroke();
    }

    // glass overlay (panel + reflect) for inactive pods
    if (glass > 0.02) {
      const gg = g.createLinearGradient(px, py, pw * 0.35, pb);
      gg.addColorStop(0, `rgba(255, 255, 255, ${0.13 * glass})`);
      gg.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
      roundRectPath(g, px, py, pw, ph, 14);
      g.fillStyle = gg;
      g.fill();
      roundRectPath(g, px, py, pw, ph, 14);
      g.strokeStyle = `rgba(255, 255, 255, ${0.07 * glass})`;
      g.lineWidth = 1;
      g.stroke();
    }

    // battery top cap (contact)
    const capW = pw * 0.4;
    const capPy = pod.capY0;
    const capHgt = pod.capH;
    roundRectPath(g, pod.cx - capW / 2, capPy, capW, capHgt, 3);
    g.fillStyle = '#2a2e3d';
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    g.lineWidth = 1;
    g.stroke();
    roundRectPath(g, pod.cx - capW / 2, capPy, capW, capHgt / 2, 3);
    g.fillStyle = 'rgba(255, 255, 255, 0.06)';
    g.fill();

    // header: title + icon (+lock / count)
    const hdrY = pod.podTop + 8;
    const titleSize = clamp(9, rect.width * 0.02, 16);
    const titleCol = isActive ? pod.accent : 'rgba(190, 205, 230, 0.6)';
    text(g, pod.title, pod.cx, hdrY, titleSize, titleCol, isActive ? pod.accentGlow : null, isActive ? 1 : (0.9 - glass * 0.25));
    const emojiSize = clamp(10, rect.width * 0.026, 17);
    g.save();
    g.globalAlpha = isActive ? 0.95 : (0.6 - glass * 0.25);
    g.font = `${emojiSize}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(EMOJI[pod.id] || '', pod.cx, hdrY + emojiSize + 2);
    g.restore();
    if (!pod.unlocked) {
      g.save();
      g.globalAlpha = 0.9;
      g.font = `${clamp(11, rect.width * 0.024, 16)}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🔒', pod.cx + hw - 16, hdrY + emojiSize + 2);
      g.restore();
    } else {
      text(g, pod.maxLv + '/9', pod.cx + hw - 22, hdrY + 2, clamp(8, rect.width * 0.018, 12), 'rgba(160, 180, 210, 0.6)', null, 0.7);
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
    drawStars(ctx, now);
    drawPyramid(ctx, now);
    layout.pods.forEach(p => drawPod(ctx, p, now));

    rafId = requestAnimationFrame(frame);
  }

  function updateLabels() {
    const t = THEMES[selectedThemeId()];
    if (selectedLabelEl) selectedLabelEl.textContent = t ? t.title : '';
    if (recordLabelEl) recordLabelEl.textContent = 'Рекорд: ' + progress.getHighScore(selectedThemeId()).toLocaleString();
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
      showTooltipNear(req ? `Достигни ${req.requiredLevel} уровня в ${THEMES[req.themeId].title}` : 'Мир ещё закрыт');
      return;
    }
    if (!pod.playable) {
      showTooltipNear('Этот мир скоро появится');
      return;
    }
    busy = true;
    if (playBtn) { playBtn.disabled = true; playBtn.classList.add('disabled'); }
    try {
      await onPlay(pod.id);
    } catch (err) {
      busy = false;
      if (playBtn) { playBtn.disabled = false; playBtn.classList.remove('disabled'); }
      showTooltipNear('Не удалось загрузить мир');
    }
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