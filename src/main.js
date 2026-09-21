import Matter from 'matter-js';
import {
  SLIME_CONFIGS,
  getSlimeConfig,
  MAX_SLIME_LEVEL,
  BLAST_RADIUS,
  BLAST_FORCE_MULTIPLIER,
  IRIDESCENT_LEVEL,
  GOLDEN_LEVEL,
  getCollectionName,
  COLLECTIONS,
  hslToHex
} from './SlimeConfig.js';
import { createGameOverBg } from './gameOverBg.js';
import { startLeaderboard, reportScore, leaderboardGameOver, leaderboardRestart } from './leaderboard.js';
import { sfx } from './audio.js';

const {
  Engine, Runner, Bodies, Body, Composite,
  Events
} = Matter;

const canvas = document.getElementById('game-canvas');
const previewEl = document.getElementById('preview-slime');
const dropZoneIndicator = document.getElementById('drop-zone-indicator');
const scoreEl = document.getElementById('score');
const maxLevelEl = document.getElementById('max-level');
const highScoreEl = document.getElementById('high-score');
const nextSlimeDisplay = document.getElementById('next-slime-display');
const nextSlimeHud = document.getElementById('next-slime-hud');
const collectionLabel = document.getElementById('collection-label');
const collectionCanvas = document.getElementById('collection-canvas');
const collectionCtx = collectionCanvas ? collectionCanvas.getContext('2d') : null;
const unlockPopup = document.getElementById('unlock-popup');
const unlockOrb = document.getElementById('unlock-orb');
const unlockName = document.getElementById('unlock-name');
const restartBtn = document.getElementById('restart-btn');
const lbToggle = document.getElementById('lb-toggle');
const playAgainBtn = document.getElementById('play-again-btn');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const finalSlimeNameEl = document.getElementById('final-slime-name');
const finalSlimeOrbEl = document.getElementById('final-slime-orb');
const finalMergesEl = document.getElementById('final-merges');
const finalComboEl = document.getElementById('final-combo');
const finalTimeEl = document.getElementById('final-time');
const finalCollectionEl = document.getElementById('final-collection');
const newRecordEl = document.getElementById('new-record');
const goCanvas = document.getElementById('go-canvas');
const goFrame = document.querySelector('#game-over-overlay .overlay-content');

let engine, runner;
let bowlBody, bowlBottom, bowlLeft, bowlRight;
let slimes = [];
const slimeByBody = new Map();
let nextSlimeConfig = null;
let currentPreviewConfig = null;
let score = 0;
let highScore = parseInt(localStorage.getItem('neon-slime-highscore') || '0', 10);
let maxLevelReached = 1;
let isGameOver = false;
let lastDropTime = 0;
let lastFrameTime = 0;
const DROP_COOLDOWN = 400;
let mouseX = 0;
let canvasRect = null;
let ctx = null;
let dpr = 1;
let layoutScale = 1;
let bowlCenterX = 0, bowlYTop = 0, bowlYBottom = 0, bowlHalfTop = 0, bowlHalfBottom = 0;
let lastBowlWidth = 0;
let targetX = null;
let renderPreviewX = null;
let dragOriginX = null;
let dragStartPreviewX = 0;
let touchActiveId = null;
let lastTouchTime = -9999;
const TOUCH_MOUSE_GUARD = 700;
let comboCount = 0;
let lastComboAt = -999999;
let lastMergeChild = null;
let comboShownUntil = 0;
let collectionCanvasRect = null;
let collectionLayoutKey = -1;
let collectionLayout = [];
let unlockFly = null;
let slotReveal = null;
let totalMerges = 0;
let bestCombo = 0;
let totalDrops = 0;
let gameStartTime = 0;
let gameEndTime = 0;
let isNewRecord = false;
const PLANET_TOTAL = 9;
const COLLECTION_GAP = 6;
const COLLECTION_ARC = 0.24;

const BOOSTER_DEFS = {
  antigravity: { unlockLevel: 10 },
  blackhole: { unlockLevel: 8 }
};
const BOOSTER_NAMES = { antigravity: 'Антигравитация', blackhole: 'Черная дыра' };
const AG_DURATION = 4000;
const BH_DURATION = 620;
const AG_FLOAT_SPEED = 3.2;

const boosterEls = {};
const blackHoles = [];
const AD_KEY = 'neon-slime-boosters';
const AD_UNLOCK_KEY = 'neon-slime-booster-unlocks';
const adOverlay = document.getElementById('ad-overlay');
const adMessageEl = document.getElementById('ad-message');
const adProgressBarEl = document.getElementById('ad-progress-bar');
const adCloseBtn = document.getElementById('ad-close-btn');
const adRewardEl = document.getElementById('ad-reward');
let boosterCharges = { antigravity: 1, blackhole: 1 };
let boostersUnlocked = {};
let agActive = null;
let bhMode = false;
let bhHover = null;
let lastPointer = null;
let adJob = null;

const gameOverBg = createGameOverBg(goCanvas, () => {
  if (!goFrame || !goCanvas) return { x: 0, y: 0, w: 0, h: 0 };
  const c = goCanvas.getBoundingClientRect();
  const b = goFrame.getBoundingClientRect();
  return { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height };
});

const BOWL_WIDTH = 480;
const BOWL_HEIGHT = 300;
const WALL_THICKNESS = 20;

const bowlW = () => BOWL_WIDTH * layoutScale;
const bowlH = () => BOWL_HEIGHT * layoutScale;
const wallT = () => Math.max(12, WALL_THICKNESS * layoutScale);

const BOWL_CATEGORY = 0x0001;
const SLIME_CATEGORY = 0x0002;

const mergeEffects = [];
const stars = [];
let starLayer = null;
const sparkleStars = [];
const nebulas = [];
const cosmicDust = [];
const tentacles = [];
const ambientParticles = [];
let nextTid = 1;
let collectionTick = false;
const lowPower = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 0) > 0 && navigator.hardwareConcurrency <= 4;
const TENTACLE_RANGE = 15;
const MERGE_OVERLAP_GAP = 4;
const MERGE_SPAWN_COOLDOWN = 400;
const MERGE_SPAWN_START_SCALE = 0.6;
const MAX_SLIME_KICK = 3.5;
const MAX_SLIME_SPEED = 12;
const ACCESSORIES = ['horns', 'catEars'];
const ACCESSORY_CHANCE = 0.05;
const RARE_BONUS = 1.5;
const COMBO_WINDOW = 1500;
const COMBO_DISPLAY_TIME = 1900;
const COMBO_MAX_MULT = 10;
const DROP_EDGE_INSET = 6;
const BOWL_EDGE_TOLERANCE = 6;

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isSpecialLevel(level) {
  const cfg = getSlimeConfig(level);
  return !!(cfg.isPlanet || cfg.legendary || cfg.iridescent || cfg.golden);
}

function updateCollectionRect() {
  if (!collectionCanvas) return;
  const rect = collectionCanvas.getBoundingClientRect();
  if (!rect || rect.width < 2 || rect.height < 2) return;
  collectionCanvasRect = rect;
}

function computeCollectionLayout() {
  if (!collectionCanvasRect) return [];
  const W = collectionCanvasRect.width;
  const H = collectionCanvasRect.height;
  if (H < 2) return [];
  const levels = Object.keys(COLLECTIONS.solarSystem.levels)
    .map(Number)
    .sort((a, b) => b - a)
    .map(lv => ({ level: lv, unlocked: lv <= maxLevelReached }));
  if (levels.length === 0) return [];
  const rad = lv => getSlimeConfig(lv).radius;
  const gap = COLLECTION_GAP;
  const vertical = H > W * 1.15;

  const sorted = levels;

  if (vertical) {
    const center = sorted[0];
    const up = [];
    const down = [];
    let goUp = false;
    for (let i = 1; i < sorted.length; i++) {
      if (goUp) up.push(sorted[i]); else down.push(sorted[i]);
      goUp = !goUp;
    }
    const upDesc = up.slice().sort((a, b) => b.level - a.level);
    const downAsc = down.slice().sort((a, b) => a.level - b.level);

    let y = 0;
    const placed = [];
    for (const item of upDesc) {
      placed.push({ item, y: y + rad(item.level) });
      y += rad(item.level) * 2 + gap;
    }
    const centerY = y + rad(center.level);
    placed.push({ item: center, y: centerY });
    y = centerY + rad(center.level) + gap;
    for (const item of downAsc) {
      placed.push({ item, y: y + rad(item.level) });
      y += rad(item.level) * 2 + gap;
    }
    const total = y + gap;

    const maxRad = rad(center.level);
    const fitH = total > H - 12 ? (H - 12) / total : 1;
    const targetMax = Math.min(36, W * 0.44);
    const fitW = targetMax / maxRad;
    const fit = Math.min(fitW, fitH, 1);

    const centerX = W / 2;
    const baseY = H / 2;
    const slots = [];
    for (const p of placed) {
      slots.push({ level: p.item.level, unlocked: p.item.unlocked, x: centerX, y: baseY + (p.y - total / 2) * fit, r: rad(p.item.level) * fit, fit });
    }
    return slots;
  }

  const center = sorted[0];
  const left = [];
  const right = [];
  let goLeft = false;
  for (let i = 1; i < sorted.length; i++) {
    if (goLeft) left.push(sorted[i]); else right.push(sorted[i]);
    goLeft = !goLeft;
  }

  const leftXs = [];
  let cursor = gap;
  for (const item of left) {
    leftXs.push({ item, x0: cursor + rad(item.level) });
    cursor += rad(item.level) * 2 + gap;
  }
  const rightXs = [];
  cursor = gap;
  for (const item of right) {
    rightXs.push({ item, x0: cursor + rad(item.level) });
    cursor += rad(item.level) * 2 + gap;
  }

  const combined = leftXs.slice().reverse();
  combined.push({ item: center, x0: 0 });
  for (const s of rightXs) combined.push(s);

  let x = 0;
  const placed = [];
  for (const s of combined) {
    placed.push({ item: s.item, x: x + rad(s.item.level) });
    x += rad(s.item.level) * 2 + gap;
  }
  const total = x + gap;

  const maxRad = rad(center.level);
  const fitW = total > W - 12 ? (W - 12) / total : 1;
  const targetMax = Math.min(28, H * 0.42);
  const fitH = targetMax / maxRad;
  const fit = Math.min(fitW, fitH, 1);

  const centerX = W / 2;
  const baseY = H * 0.78;
  const amp = H * COLLECTION_ARC;
  const slots = [];
  for (const p of placed) {
    const sx = centerX + (p.x - total / 2) * fit;
    const f = Math.abs(sx - centerX) / Math.max(1, W / 2);
    const y = baseY - amp * (1 - f * f);
    slots.push({ level: p.item.level, unlocked: p.item.unlocked, x: sx, y, r: rad(p.item.level) * fit, fit });
  }
  return slots;
}

function drawPanelEyes(g, r, dirX, dirY) {
  const eyeY = -r * 0.04;
  const eyeSpacing = r * 0.5;
  const eyeR = Math.max(1.4, r * 0.15);
  g.save();
  g.shadowBlur = 0;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const ex = s * eyeSpacing * 0.5 + dirX * eyeSpacing * 0.12;
    const ey = eyeY + dirY * eyeSpacing * 0.12;
    g.beginPath();
    g.arc(ex, ey, eyeR, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(255, 255, 255, 0.85)';
    g.shadowBlur = 4;
    g.fill();
    g.shadowBlur = 0;
    g.lineWidth = Math.max(0.8, eyeR * 0.12);
    g.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    g.stroke();
    const px = ex + dirX * eyeR * 0.4;
    const py = ey + dirY * eyeR * 0.4;
    g.beginPath();
    g.arc(px, py, eyeR * 0.55, 0, Math.PI * 2);
    g.fillStyle = '#21242e';
    g.fill();
    g.beginPath();
    g.arc(px + eyeR * 0.18, py - eyeR * 0.18, eyeR * 0.17, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
  }
  g.restore();
}

const panelSlimeCache = new Map();
function getPanelSlime(level) {
  let slime = panelSlimeCache.get(level);
  if (!slime) {
    slime = { body: { angle: 0 }, seed: 1.7 + level * 2.3, mergeAnim: null, opacity: 1 };
    panelSlimeCache.set(level, slime);
  }
  return slime;
}

function drawLockedSlot(g, level, x, y, r) {
  const cfg = getSlimeConfig(level);
  const pal = cfg.isPlanet && cfg.palette ? cfg.palette : null;
  g.save();
  g.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);
  g.globalAlpha = 0.85;
  g.globalCompositeOperation = 'source-over';
  const col = pal ? pal.base : 'rgba(150, 170, 210, 0.55)';
  if (pal) {
    const grad = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
    grad.addColorStop(0, pal.light || col);
    grad.addColorStop(1, pal.dark || col);
    g.fillStyle = grad;
  } else {
    g.fillStyle = col;
  }
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  if (pal) {
    g.fillStyle = 'rgba(8, 10, 24, 0.55)';
    g.beginPath();
    g.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + level;
      const bx = Math.cos(a) * r * 0.56;
      const by = Math.sin(a) * r * 0.56;
      g.beginPath();
      g.arc(bx, by, r * (0.09 + (i % 2) * 0.05), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 0.8;
  g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(160, 190, 235, 0.8)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `800 ${Math.max(8, r * 0.85)}px "Courier New", monospace`;
  g.fillText('?', 0, r * 0.05 + 0.5);
  g.restore();
}

function drawPanelSlime(g, slot, now) {
  const cfg = getSlimeConfig(slot.level);
  const r = slot.r;
  const y = slot.y;

  if (!slot.unlocked) {
    drawLockedSlot(g, slot.level, slot.x, y, r);
    return;
  }

  let revealAlpha = 1;
  let revealScale = 1;
  if (slotReveal && slotReveal.level === slot.level) {
    const t = Math.min(1, (now - slotReveal.start) / 620);
    revealScale = 1 + 1.1 * (1 - easeOutBack(t));
    revealAlpha = Math.min(1, t * 4);
    if (t >= 1) slotReveal = null;
  }

  g.save();
  g.translate(slot.x, y);
  g.scale(revealScale, revealScale);
  g.globalAlpha = revealAlpha;
  g.shadowColor = cfg.glowColor;
  g.shadowBlur = 7 + (cfg.glowBlur || 14) * 0.25;

  if (cfg.isPlanet && cfg.palette) {
    const planet = getPanelSlime(slot.level);
    planet.body.angle = slot.level % 2 ? 0.16 : -0.16;
    drawPlanetBody(g, planet, cfg, r, 0, 1, revealAlpha, cfg.glowColor, 8 + r * 0.45);
  } else {
    const chamfer = Math.max(1.5, Math.min(8, r * 0.35));
    const grad = g.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, lightenColor(cfg.color, 55));
    grad.addColorStop(0.45, cfg.color);
    grad.addColorStop(1, darkenColor(cfg.color, 25));
    g.fillStyle = grad;
    g.beginPath();
    if (g.roundRect) g.roundRect(-r, -r, r * 2, r * 2, chamfer);
    else g.rect(-r, -r, r * 2, r * 2);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.lineWidth = 1;
    g.shadowBlur = 0;
    g.beginPath();
    if (g.roundRect) g.roundRect(-r + 1.5, -r + 1.5, r * 2 - 3, r * 2 - 3, Math.max(1, chamfer - 1));
    else g.rect(-r + 1.5, -r + 1.5, r * 2 - 3, r * 2 - 3);
    g.stroke();
    g.beginPath();
    g.moveTo(-r * 0.45, -r * 0.42);
    g.lineTo(r * 0.1, -r * 0.55);
    g.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    g.lineWidth = 1.4;
    g.stroke();
  }

  drawPanelEyes(g, r, 0, -1);
  g.restore();
}

function updateCollectionBar() {
  if (!collectionCanvas || !collectionCtx) return;
  if (!collectionCanvasRect || collectionCanvasRect.width < 2 || collectionCanvasRect.height < 2) return;
  const cssW = collectionCanvasRect.width;
  const cssH = collectionCanvasRect.height;
  const dprNow = window.devicePixelRatio || 1;
  const g = collectionCtx;
  const now = performance.now();
  const pw = Math.round(cssW * dprNow);
  const ph = Math.round(cssH * dprNow);
  if (collectionCanvas.width !== pw || collectionCanvas.height !== ph) {
    collectionCanvas.width = pw;
    collectionCanvas.height = ph;
    collectionCtx.setTransform(dprNow, 0, 0, dprNow, 0, 0);
    collectionLayoutKey = -1;
  }
  if (collectionLayoutKey !== maxLevelReached) {
    collectionLayout = computeCollectionLayout();
    collectionLayoutKey = maxLevelReached;
  }
  collectionTick = !collectionTick;
  if (collectionTick) return;
  g.clearRect(0, 0, cssW, cssH);
  if (collectionLayout.length === 0) return;
  for (const slot of collectionLayout) {
    drawPanelSlime(g, slot, now);
  }
}

function triggerUnlock(level) {
  if (!unlockPopup || !unlockOrb) return;
  const cfg = getSlimeConfig(level);
  stylePreviewElement(unlockOrb, cfg, 64, true);
  unlockOrb.style.borderRadius = '50%';
  if (unlockName) unlockName.textContent = cfg.name;
  const cx = canvasRect ? canvasRect.left + canvasRect.width / 2 : Math.max(0, (window.innerWidth || 0) / 2);
  const cy = canvasRect ? canvasRect.top + canvasRect.height * 0.42 : 120;
  unlockPopup.style.transform = `translate(${cx}px, ${cy}px)`;
  unlockPopup.classList.remove('hidden');
  void unlockPopup.offsetWidth;
  unlockPopup.classList.add('show');
  sfx.playUnlock();
  unlockFly = { level, config: cfg, phase: 'show', t0: performance.now() };
  unlockBoostersThrough(level);
}

function updateUnlockFly() {
  if (!unlockFly) return;
  if (!unlockPopup) { unlockFly = null; return; }
  if (!collectionCanvasRect) updateCollectionRect();
  if (!collectionCanvasRect) return;
  const f = unlockFly;
  const now = performance.now();
  if (f.phase === 'show') {
    if (now - f.t0 >= 950) {
      f.phase = 'fly';
      f.t0 = now;
      let slot = null;
      for (const s of collectionLayout) if (s.level === f.level) { slot = s; break; }
      const r = collectionCanvasRect;
      f.toX = slot ? r.left + slot.x : r.left + r.width / 2;
      f.toY = slot ? r.top + slot.y : r.top + r.height * 0.8;
      const pop = unlockPopup.getBoundingClientRect();
      f.fromX = pop.left + pop.width / 2;
      f.fromY = pop.top + pop.height / 2;
    }
    return;
  }
  const t = Math.min(1, (now - f.t0) / 520);
  const e = 1 - Math.pow(1 - t, 3);
  const x = f.fromX + (f.toX - f.fromX) * e;
  const y = f.fromY + (f.toY - f.fromY) * e;
  unlockPopup.style.transform = `translate(${x}px, ${y}px) scale(${1 - 0.4 * e})`;
  if (t >= 1) {
    unlockPopup.classList.remove('show');
    unlockPopup.classList.add('hidden');
    slotReveal = { level: f.level, start: now };
    unlockFly = null;
  }
}

function init() {
  updateCanvasRect();
  window.addEventListener('resize', updateCanvasRect);
  window.addEventListener('load', updateCanvasRect);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateCanvasRect);
  }
  requestAnimationFrame(updateCanvasRect);

  engine = Engine.create();
  engine.world.gravity.y = 0.9;
  engine.world.gravity.x = 0;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 2;

  runner = Runner.create();
  Runner.run(runner, engine);

  createStars();
  createBowl();
  setupEventListeners();
  Events.on(engine, 'afterUpdate', dampenSlimeSpin);
  Events.on(engine, 'afterUpdate', handleCosmicAttraction);
  Events.on(engine, 'afterUpdate', containSlimes);
  gameStartTime = performance.now();
  sfx.init();
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  window.addEventListener('keydown', () => sfx.unlock(), { once: true });
  spawnNextSlime();
  updatePreview();
  updateUI();
  updateHighScoreUI();
  setupBoostersUI();
  startLeaderboard();
  requestAnimationFrame(gameLoop);
}

function updateCanvasRect() {
  const rect = canvas.getBoundingClientRect();
  if (!rect || rect.width < 2 || rect.height < 2) {
    requestAnimationFrame(() => setTimeout(updateCanvasRect, 16));
    return;
  }
  canvasRect = rect;
  dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
  layoutScale = Math.max(0.58, Math.min(1, canvasRect.width / 640));
  canvas.width = canvasRect.width * dpr;
  canvas.height = canvasRect.height * dpr;
  canvas.style.width = canvasRect.width + 'px';
  canvas.style.height = canvasRect.height + 'px';
  ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (engine && Math.abs(canvasRect.width - lastBowlWidth) > 1) {
    rebuildBowl();
  }
  updateCollectionRect();
  lastBowlWidth = canvasRect.width;
}

function rebuildBowl() {
  if (!engine || !bowlBody) return;
  Composite.remove(engine.world, bowlBody);
  createBowl();
  createStars();
  if (currentPreviewConfig) updatePreviewPosition();
}

function createStars() {
  stars.length = 0;
  sparkleStars.length = 0;
  const count = (lowPower ? 22 : 45) + Math.floor(Math.random() * (lowPower ? 8 : 15));
  for (let i = 0; i < count; i++) {
    const star = {
      x: Math.random() * canvasRect.width,
      y: Math.random() * canvasRect.height,
      radius: 0.5 + Math.random() * 0.75,
      baseAlpha: 0.3 + Math.random() * 0.6,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinklePhase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.7 ? '#ffffff' : '#00f0ff'
    };
    stars.push(star);
    if (i % 6 === 0) sparkleStars.push(star);
  }

  const w = canvasRect.width;
  const h = canvasRect.height;
  starLayer = document.createElement('canvas');
  starLayer.width = Math.max(1, Math.round(w * dpr));
  starLayer.height = Math.max(1, Math.round(h * dpr));
  const sg = starLayer.getContext('2d');
  sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const star of stars) {
    if (sparkleStars.includes(star)) continue;
    sg.save();
    sg.beginPath();
    sg.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    sg.fillStyle = star.color;
    sg.globalAlpha = star.baseAlpha * 0.8;
    sg.shadowColor = star.color;
    sg.shadowBlur = 4 + star.radius * 2;
    sg.fill();
    sg.restore();
  }

  nebulas.length = 0;
  const nebulaSpecs = [
    { fx: 0.16, fy: 0.58, size: 0.55, r: 'rgba(120, 40, 180, 0.20)', g: 'rgba(120, 40, 180, 0)', drift: 0.00032, phase: 1.3 },
    { fx: 0.86, fy: 0.28, size: 0.48, r: 'rgba(30, 90, 220, 0.22)', g: 'rgba(30, 90, 220, 0)', drift: 0.00021, phase: 4.1 },
    { fx: 0.5, fy: 0.88, size: 0.42, r: 'rgba(10, 170, 230, 0.12)', g: 'rgba(10, 170, 230, 0)', drift: 0.00027, phase: 2.2 }
  ];
  for (const spec of nebulaSpecs) {
    nebulas.push({
      fx: spec.fx + (Math.random() - 0.5) * 0.08,
      fy: spec.fy + (Math.random() - 0.5) * 0.08,
      size: spec.size * (0.85 + Math.random() * 0.3),
      r: spec.r,
      g: spec.g,
      drift: spec.drift,
      phase: spec.phase + Math.random() * 2
    });
  }

  cosmicDust.length = 0;
  for (let i = 0; i < 14; i++) {
    cosmicDust.push({
      x: Math.random() * canvasRect.width,
      y: Math.random() * canvasRect.height,
      size: 0.6 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.05 - Math.random() * 0.14,
      alpha: 0.12 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.6 ? '#91c7ff' : '#c9a4ff'
    });
  }
}

function createWall(sign, bb, bt, yB, yT, thickness, centerX, options) {
  const sx = sign * bb + centerX, sy = yB;
  const ex = sign * bt + centerX, ey = yT;
  const dx = ex - sx, dy = ey - sy;
  const len = Math.hypot(dx, dy);
  const midX = (sx + ex) / 2, midY = (sy + ey) / 2;
  const angle = Math.atan2(dy, dx);
  const ux = dx / len, uy = dy / len;
  let nx, ny;
  if (sign > 0) {
    nx = -uy; ny = ux;
  } else {
    nx = uy; ny = -ux;
  }
  return Bodies.rectangle(
    midX + nx * thickness * 0.5,
    midY + ny * thickness * 0.5,
    len,
    thickness,
    { ...options, angle }
  );
}

function createBowl() {
  const centerX = canvasRect.width / 2;
  const bottomY = canvasRect.height - 100;
  const t = wallT();
  const topWidth = bowlW();
  const bottomWidth = bowlW() * 0.7;
  const wallHeight = bowlH();
  const bb = bottomWidth / 2;
  const bt = topWidth / 2;
  const yB = bottomY - t;
  const yT = bottomY - t - wallHeight;

  const bowlOptions = {
    isStatic: true,
    friction: 0.3,
    restitution: 0.1,
    collisionFilter: { category: BOWL_CATEGORY, mask: SLIME_CATEGORY | BOWL_CATEGORY }
  };

  bowlBottom = Bodies.rectangle(centerX, bottomY - t / 2, bottomWidth, t, {
    ...bowlOptions,
    chamfer: { radius: Math.max(4, (t / 2) * 0.9) }
  });

  bowlLeft = createWall(-1, bb, bt, yB, yT, t, centerX, bowlOptions);
  bowlRight = createWall(1, bb, bt, yB, yT, t, centerX, bowlOptions);

  bowlCenterX = centerX;
  bowlYTop = yT;
  bowlYBottom = bottomY;
  bowlHalfTop = bt;
  bowlHalfBottom = bb;

  bowlBody = Body.create({
    parts: [bowlBottom, bowlLeft, bowlRight],
    isStatic: true,
    frictionAir: 0,
    collisionFilter: { category: BOWL_CATEGORY, mask: SLIME_CATEGORY | BOWL_CATEGORY }
  });

  Composite.add(engine.world, bowlBody);
}

function setupEventListeners() {
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('touchcancel', handleTouchCancel);
  window.addEventListener('keydown', handleKeyDown);

  restartBtn.addEventListener('click', restartGame);
  playAgainBtn.addEventListener('click', restartGame);
  if (lbToggle) lbToggle.addEventListener('click', toggleLeaderboardPanel);

  Events.on(engine, 'collisionStart', handleCollisionStart);
  Events.on(engine, 'collisionActive', handleCollisionActive);
}

function toggleLeaderboardPanel() {
  const lb = document.getElementById('leaderboard');
  if (!lb) return;
  const open = lb.classList.toggle('open');
  if (lbToggle) lbToggle.classList.toggle('active', open);
}

function isSyntheticMouseBlocked() {
  if (touchActiveId !== null) return true;
  return performance.now() - lastTouchTime < TOUCH_MOUSE_GUARD;
}

function handleMouseMove(e) {
  if (isGameOver || isSyntheticMouseBlocked()) return;
  const x = e.clientX - canvasRect.left;
  const y = e.clientY - canvasRect.top;
  lastPointer = { x, y };
  if (bhMode) return;
  targetX = x;
  updatePreviewPosition();
}

function handleMouseDown(e) {
  if (isGameOver || isSyntheticMouseBlocked()) return;
  if (e.button === 0) {
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    lastPointer = { x, y };
    if (bhMode) {
      attemptBlackHoleConsume(x, y);
      return;
    }
    dropSlime();
  }
}

function findTrackedTouch(list) {
  if (touchActiveId === null) return null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].identifier === touchActiveId) return list[i];
  }
  return null;
}

function touchEndedForTracked(changed) {
  for (let i = 0; i < changed.length; i++) {
    if (changed[i].identifier === touchActiveId) return true;
  }
  return false;
}

function handleTouchStart(e) {
  if (isGameOver || adJob) return;
  if (e.touches.length > 1) return;
  const touch = e.touches[0];
  const x = touch.clientX - canvasRect.left;
  const y = touch.clientY - canvasRect.top;
  lastPointer = { x, y };
  if (bhMode) {
    attemptBlackHoleConsume(x, y);
    return;
  }
  touchActiveId = touch.identifier;
  lastTouchTime = performance.now();
  dragOriginX = x;
  dragStartPreviewX = renderPreviewX != null ? renderPreviewX : canvasRect.width / 2;
  targetX = dragStartPreviewX;
  updatePreviewPosition();
}

function handleTouchMove(e) {
  if (isGameOver || adJob) return;
  lastTouchTime = performance.now();
  const touch = findTrackedTouch(e.touches);
  if (e.touches.length > 0) {
    const t = e.touches[0];
    lastPointer = { x: t.clientX - canvasRect.left, y: t.clientY - canvasRect.top };
  }
  if (bhMode) return;
  if (!touch || dragOriginX === null) return;
  const x = touch.clientX - canvasRect.left;
  targetX = dragStartPreviewX + (x - dragOriginX);
  updatePreviewPosition();
}

function handleTouchEnd(e) {
  lastTouchTime = performance.now();
  if (bhMode) return;
  if (touchActiveId === null) return;
  if (!touchEndedForTracked(e.changedTouches)) return;
  touchActiveId = null;
  dragOriginX = null;
  if (isGameOver) return;
  dropSlime();
}

function handleTouchCancel() {
  lastTouchTime = performance.now();
  touchActiveId = null;
  dragOriginX = null;
}

function handleKeyDown(e) {
  if (adJob) return;
  if (e.code === 'Escape' && bhMode) {
    exitBlackHoleMode(false);
    return;
  }
  if (e.code === 'Space' && !isGameOver) {
    if (bhMode) return;
    e.preventDefault();
    dropSlime();
  }
}

function clampDropX(desiredX) {
  const centerX = canvasRect.width / 2;
  const r = currentPreviewConfig ? currentPreviewConfig.radius * layoutScale : 0;
  const halfWidth = Math.max(0, bowlW() / 2 - r * 0.5 - DROP_EDGE_INSET);
  if (desiredX == null) return centerX;
  return Math.max(centerX - halfWidth, Math.min(centerX + halfWidth, desiredX));
}

function updatePreviewPosition() {
  const centerX = canvasRect.width / 2;
  const desiredX = targetX != null ? targetX : centerX;
  const clampedX = clampDropX(desiredX);
  renderPreviewX = clampedX;

  previewEl.style.left = clampedX + 'px';
  previewEl.style.transform = 'translateX(-50%)';

  const r = currentPreviewConfig ? currentPreviewConfig.radius * layoutScale : 0;
  const halfWidth = Math.max(0, bowlW() / 2 - r * 0.5 - DROP_EDGE_INSET);
  dropZoneIndicator.style.left = (centerX - halfWidth) + 'px';
  dropZoneIndicator.style.width = (halfWidth * 2) + 'px';
}

function stylePreviewElement(el, config, size, glow) {
  if (size != null) {
    el.style.width = size + 'px';
    el.style.height = size + 'px';
  }
  if (config.isPlanet && config.palette) {
    el.style.borderRadius = '50%';
    const p = config.palette;
    el.style.background = `radial-gradient(circle at 30% 30%, ${p.light}, ${p.base} 45%, ${p.dark})`;
    el.style.boxShadow = `${glow ? '0 0 14px ' + p.glow + ', 0 0 28px ' + p.glow : '0 0 8px ' + p.glow}`;
  } else {
    el.style.borderRadius = size == null ? '50%' : '22%';
    el.style.background = `radial-gradient(circle at 30% 30%, ${config.color}, ${config.glowColor})`;
    el.style.boxShadow = `0 0 14px ${config.glowColor}, 0 0 28px ${config.glowColor}`;
  }
}

function updatePreview() {
  if (!currentPreviewConfig) return;

  const size = currentPreviewConfig.radius * 2 * layoutScale;
  stylePreviewElement(previewEl, currentPreviewConfig, size, true);
  previewEl.classList.remove('hidden');
}

function getRandomLowLevelSlime() {
  if (Math.random() < 0.05) return SLIME_CONFIGS[2];
  return SLIME_CONFIGS[Math.floor(Math.random() * 2)];
}

function spawnNextSlime() {
  if (nextSlimeConfig) {
    currentPreviewConfig = nextSlimeConfig;
  } else {
    currentPreviewConfig = getRandomLowLevelSlime();
  }
  nextSlimeConfig = getRandomLowLevelSlime();

  stylePreviewElement(nextSlimeDisplay, nextSlimeConfig, null, false);
  nextSlimeDisplay.style.border = '2px solid #ffd54e';
  nextSlimeDisplay.style.boxShadow = `0 0 8px rgba(255,213,78,0.8), 0 0 16px rgba(255,213,78,0.45), inset 0 0 4px rgba(255,213,78,0.6)`;
  if (collectionLabel) {
    collectionLabel.textContent = getCollectionName(currentPreviewConfig.level);
  }

  updatePreview();
  updatePreviewPosition();
  sfx.playRespawn(!!nextSlimeConfig.isPlanet);
}

function dropSlime() {
  if (bhMode) return;
  const now = performance.now();
  if (now - lastDropTime < DROP_COOLDOWN) return;
  lastDropTime = now;
  totalDrops += 1;

  const centerX = canvasRect.width / 2;
  const dropX = clampDropX(renderPreviewX != null ? renderPreviewX : centerX);
  const dropY = Math.max(50, canvasRect.height * 0.16);

  const slime = createSlime(dropX, dropY, currentPreviewConfig);
  slimeByBody.set(slime.body, slime);
  slimes.push(slime);
  Composite.add(engine.world, slime.body);
  sfx.playDrop();

  spawnNextSlime();
  updateUI();

  checkGameOver();
}

function createSlime(x, y, config) {
  const radPx = config.radius * layoutScale;
  const baseOptions = {
    density: config.isPlanet ? config.density * (4 / Math.PI) : config.density,
    restitution: Math.min(config.restitution, 0.15),
    friction: config.friction,
    frictionAir: 0.05,
    frictionStatic: 0.5,
    render: {
      fillStyle: config.color,
      strokeStyle: config.glowColor,
      lineWidth: 2
    },
    collisionFilter: {
      category: SLIME_CATEGORY,
      mask: BOWL_CATEGORY | SLIME_CATEGORY
    },
    plugin: {
      slimeLevel: config.level,
      slimeConfig: config,
      mergeCooldown: 0
    }
  };

  const body = config.isPlanet
    ? Bodies.circle(x, y, radPx, baseOptions)
    : Bodies.rectangle(x, y, radPx * 2, radPx * 2, {
        ...baseOptions,
        chamfer: { radius: config.chamfer * layoutScale }
      });

  return {
    body,
    config,
    visualScaleX: 1,
    visualScaleY: 1,
    elastic: 0,
    flownOut: false,
    accessory: Math.random() < ACCESSORY_CHANCE ? randItem(ACCESSORIES) : null,
    seed: Math.random() * 10,
    particleTimer: 100 + Math.random() * 300,
    bodyScale: 1
  };
}

function findSlimeWrapper(body) {
  for (const slime of slimes) {
    if (slime.body === body) return slime;
  }
  return null;
}

function dampenSlimeSpin() {
  for (const slime of slimes) {
    slime.body.angularVelocity *= 0.85;

    const vx = slime.body.velocity.x;
    const vy = slime.body.velocity.y;
    const spd = Math.hypot(vx, vy);
    if (spd > MAX_SLIME_SPEED * layoutScale) {
      const k = MAX_SLIME_SPEED * layoutScale / spd;
      Body.setVelocity(slime.body, { x: vx * k, y: vy * k });
    }
  }
}

function bodySupport(body, nx, ny) {
  let best = -Infinity;
  const px = body.position.x;
  const py = body.position.y;
  for (const v of body.vertices) {
    const d = (v.x - px) * nx + (v.y - py) * ny;
    if (d > best) best = d;
  }
  return best;
}

function bodyReachRadius(body) {
  const b = body.bounds;
  const ex = (b.max.x - b.min.x) * 0.5;
  const ey = (b.max.y - b.min.y) * 0.5;
  return Math.hypot(ex, ey);
}

function bodyTid(body) {
  if (body.plugin.tid === undefined) body.plugin.tid = nextTid++;
  return body.plugin.tid;
}

const tentacleKeyOf = (a, b) => bodyTid(a.body) * 1048576 + bodyTid(b.body);

function bowlSafeHalfWidth(y) {
  const span = bowlYBottom - bowlYTop;
  if (span <= 0) return bowlHalfTop;
  const t = Math.max(0, Math.min(1, (bowlYBottom - y) / span));
  return bowlHalfBottom + t * (bowlHalfTop - bowlHalfBottom);
}

function containSlimes() {
  if (isGameOver) return;
  const t = wallT();
  for (const slime of slimes) {
    if (slime.body.isRemoved) continue;
    if (slime.body.plugin.mergeCooldown > 0) continue;
    if (slime.flownOut) continue;
    const pos = slime.body.position;
    const r = slime.config.radius * layoutScale;

    if (pos.y - r > bowlYBottom + t) {
      slime.flownOut = true;
      continue;
    }

    if (pos.y < bowlYTop) {
      if (Math.abs(pos.x - bowlCenterX) > bowlHalfTop + r + BOWL_EDGE_TOLERANCE) {
        slime.flownOut = true;
      } else if (slime.body.velocity.y < 0) {
        Body.setVelocity(slime.body, { x: slime.body.velocity.x, y: slime.body.velocity.y * -0.2 });
      }
      continue;
    }

    const safe = Math.max(0, bowlSafeHalfWidth(pos.y) - r);
    const over = pos.x >= bowlCenterX ? pos.x - (bowlCenterX + safe) : (bowlCenterX - safe) - pos.x;
    if (over > t + BOWL_EDGE_TOLERANCE) {
      slime.flownOut = true;
      continue;
    }
    if (over > 0) {
      const limit = bowlCenterX + (pos.x >= bowlCenterX ? safe : -safe);
      Body.setPosition(slime.body, { x: limit, y: pos.y });
      const v = slime.body.velocity;
      const outward = pos.x >= bowlCenterX ? 1 : -1;
      if (v.x * outward > 0) Body.setVelocity(slime.body, { x: v.x * -outward * 0.4, y: Math.min(0, v.y) });
      slime.body.angularVelocity *= 0.3;
    }
  }
}

function handleCosmicAttraction() {
  if (isGameOver) return;

  // Sync tentacles: remove dead entries
  for (let i = tentacles.length - 1; i >= 0; i--) {
    const t = tentacles[i];
    const aAlive = !t.a.body.isRemoved && slimeByBody.get(t.a.body) === t.a;
    const bAlive = !t.b.body.isRemoved && slimeByBody.get(t.b.body) === t.b;
    if (!aAlive || !bAlive) {
      tentacles.splice(i, 1);
      continue;
    }
    const dx = t.b.body.position.x - t.a.body.position.x;
    const dy = t.b.body.position.y - t.a.body.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) { tentacles.splice(i, 1); continue; }
    const inv = 1 / dist;
    const nx = dx * inv;
    const ny = dy * inv;
    const gap = dist - bodySupport(t.a.body, nx, ny) - bodySupport(t.b.body, -nx, -ny);
    if (gap > TENTACLE_RANGE * layoutScale + 1) {
      tentacles.splice(i, 1);
    }
  }

  const tentacleKeys = new Set();
  for (const t of tentacles) tentacleKeys.add(t.key);

  for (let i = 0; i < slimes.length; i++) {
    const a = slimes[i];
    if (a.body.isRemoved) continue;
    if (a.body.plugin.mergeCooldown > 0) continue;
    if (a.body.plugin.slimeLevel >= MAX_SLIME_LEVEL) continue;

    for (let j = i + 1; j < slimes.length; j++) {
      const b = slimes[j];
      if (b.body.isRemoved) continue;
      if (b.body.plugin.mergeCooldown > 0) continue;
      if (a.body.plugin.slimeLevel !== b.body.plugin.slimeLevel) continue;
      if (b.body.plugin.slimeLevel >= MAX_SLIME_LEVEL) continue;

      const dx = b.body.position.x - a.body.position.x;
      const dy = b.body.position.y - a.body.position.y;
      const reach = bodyReachRadius(a.body) + bodyReachRadius(b.body) + TENTACLE_RANGE * layoutScale;
      if (dx * dx + dy * dy > reach * reach) continue;

      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;
      const inv = 1 / dist;
      const supportA = bodySupport(a.body, dx * inv, dy * inv);
      const supportB = bodySupport(b.body, -dx * inv, -dy * inv);
      const gap = dist - supportA - supportB;

      if (gap <= TENTACLE_RANGE * layoutScale) {
        const key = tentacleKeyOf(a, b);
        if (!tentacleKeys.has(key)) {
          tentacleKeys.add(key);
          tentacles.push({ a, b, key, phase: Math.random() * 100, color: lightenColor(a.config.color, 25) });
        }

        if (gap <= MERGE_OVERLAP_GAP * Math.max(1, layoutScale)) {
          performMerge(a, b);
          return;
        }
      }
    }
  }
}

function findSlimeByBody(body) {
  return slimeByBody.get(body) || null;
}

function removeSlimeByIdentity(target) {
  for (let i = slimes.length - 1; i >= 0; i--) {
    if (slimes[i] === target) {
      slimes.splice(i, 1);
      break;
    }
  }
  slimeByBody.delete(target.body);
}

function handleLandingSquish(pair) {
  const { bodyA, bodyB } = pair;
  const aSlime = bodyA.plugin?.slimeLevel ? findSlimeWrapper(bodyA) : null;
  const bSlime = bodyB.plugin?.slimeLevel ? findSlimeWrapper(bodyB) : null;
  if (!aSlime && !bSlime) return;

  const normal = pair.collision?.normal;
  if (!normal) return;

  const relVx = bodyB.velocity.x - bodyA.velocity.x;
  const relVy = bodyB.velocity.y - bodyA.velocity.y;
  const impactSpeed = Math.abs(relVx * normal.x + relVy * normal.y);
  if (impactSpeed < 2.2) return;

  const squash = Math.min(1.15, impactSpeed * 0.09);
  if (aSlime) aSlime.elastic = Math.max(aSlime.elastic, squash);
  if (bSlime) bSlime.elastic = Math.max(bSlime.elastic, squash);
}

function performMerge(a, b) {
  if (isGameOver) return;
  if (a.body.plugin.mergeCooldown > 0 || b.body.plugin.mergeCooldown > 0) return;
  if (a.body.plugin.slimeLevel !== b.body.plugin.slimeLevel) return;
  if (a.body.plugin.slimeLevel >= MAX_SLIME_LEVEL) return;

  const level = a.body.plugin.slimeLevel;
  const config = getSlimeConfig(level + 1);

  const lower = a.body.position.y >= b.body.position.y ? a : b;
  const upper = lower === a ? b : a;

  const midX = (lower.body.position.x + upper.body.position.x) / 2;
  const midY = lower.body.position.y;

  const safeHalf = Math.max(0, bowlSafeHalfWidth(midY) - config.radius * layoutScale - wallT() * 0.5);
  const anchorX = Math.max(bowlCenterX - safeHalf, Math.min(bowlCenterX + safeHalf, midX));

  const bodyA = a.body;
  const bodyB = b.body;

  removeSlimeByIdentity(a);
  removeSlimeByIdentity(b);
  Composite.remove(engine.world, bodyA);
  Composite.remove(engine.world, bodyB);

  createMergeEffect(anchorX, midY, config);

  const newSlime = createSlime(anchorX, midY, config);
  newSlime.opacity = 1;
  newSlime.mergeAnim = { elapsed: 0, duration: 150 };
  newSlime.body.plugin.mergeCooldown = MERGE_SPAWN_COOLDOWN;
  newSlime.mergeAnchor = { x: anchorX, y: midY };
  newSlime.bodyScale = MERGE_SPAWN_START_SCALE;
  newSlime.mergedScale = MERGE_SPAWN_START_SCALE;
  Body.scale(newSlime.body, MERGE_SPAWN_START_SCALE, MERGE_SPAWN_START_SCALE);
  slimeByBody.set(newSlime.body, newSlime);
  slimes.push(newSlime);
  Composite.add(engine.world, newSlime.body);

  const nowMs = performance.now();
  const isChain = (lastMergeChild && (a === lastMergeChild || b === lastMergeChild)) && (nowMs - lastComboAt <= COMBO_WINDOW);
  lastMergeChild = newSlime;
  if (isChain) {
    comboCount += 1;
  } else {
    comboCount = 1;
  }
  lastComboAt = nowMs;
  totalMerges += 1;
  if (comboCount > bestCombo) bestCombo = comboCount;
  if (comboCount >= 2) {
    comboShownUntil = nowMs + COMBO_DISPLAY_TIME;
  }

  const rareBonus = (a.accessory || b.accessory) ? RARE_BONUS : 1;
  const baseGain = Math.round(config.scoreValue * rareBonus);
  const comboMult = comboCount >= 2 ? Math.min(comboCount, COMBO_MAX_MULT) : 1;
  const scoreGain = Math.round(baseGain * comboMult);
  score += scoreGain;
  const newLevel = level + 1;
  const isNewUnlock = newLevel > maxLevelReached;
  maxLevelReached = Math.max(maxLevelReached, newLevel);
  updateUI();
  reportScore(score);
  if (isNewUnlock && isSpecialLevel(newLevel)) triggerUnlock(newLevel);

  applyBlastWave(anchorX, midY, level + 1);

  if (config.isPlanet) sfx.playPlanetMerge(newLevel);
  else sfx.playMerge(newLevel);
  if (comboCount >= 2) sfx.playCombo(comboCount);
}

function handleCollisionStart(event) {
  if (isGameOver) return;

  for (const pair of event.pairs) {
    handleLandingSquish(pair);
  }

  for (const pair of event.pairs) {
    const { bodyA, bodyB } = pair;
    if (!bodyA.plugin?.slimeLevel || !bodyB.plugin?.slimeLevel) continue;
    const a = findSlimeByBody(bodyA);
    const b = findSlimeByBody(bodyB);
    if (!a || !b) continue;
    performMerge(a, b);
    break;
  }
}

function handleCollisionActive(event) {
  if (isGameOver) return;
  for (const pair of event.pairs) {
    const { bodyA, bodyB } = pair;
    if (!bodyA.plugin?.slimeLevel || !bodyB.plugin?.slimeLevel) continue;
    if (bodyA.plugin.slimeLevel !== bodyB.plugin.slimeLevel) continue;
    const a = findSlimeByBody(bodyA);
    const b = findSlimeByBody(bodyB);
    if (!a || !b) continue;
    performMerge(a, b);
    break;
  }
}

function createMergeEffect(x, y, config) {
  mergeEffects.push({
    x, y,
    color: config.glowColor,
    color2: config.color,
    radius: config.radius * layoutScale,
    maxLevel: config.level,
    time: 0,
    duration: 400,
    particles: [],
    shockwave: { radius: 0, maxRadius: config.radius * 3.2 * layoutScale, alpha: 1 },
    flash: { scale: 0.5, alpha: 1 }
  });

  const effect = mergeEffects[mergeEffects.length - 1];
  const particleCount = 10 + Math.floor(Math.random() * 6);

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    const speed = 3 + Math.random() * 6;
    effect.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 3,
      color: Math.random() > 0.4 ? config.glowColor : config.color,
      life: 1,
      decay: 0.04 + Math.random() * 0.03
    });
  }
}

function applyBlastWave(centerX, centerY, sourceLevel) {
  const sourceConfig = getSlimeConfig(sourceLevel);
  const sr = sourceConfig.radius;
  const sourceMass = sr * sr * 4 * sourceConfig.density;

  for (const slime of slimes) {
    if (slime.body.isRemoved) continue;
    if (slime.body.plugin.mergeCooldown > 0) continue;

    const dx = slime.body.position.x - centerX;
    const dy = slime.body.position.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < BLAST_RADIUS * layoutScale && dist > 1) {
      const slimeConfig = slime.config;
      const lr = slimeConfig.radius;
      const slimeMass = lr * lr * 4 * slimeConfig.density;

      const kick = (BLAST_FORCE_MULTIPLIER * sourceMass) / (slimeMass * slimeMass * (dist / 140 + 1)) * layoutScale;
      const cappedKick = Math.min(kick, MAX_SLIME_KICK * layoutScale);
      const force = cappedKick * slimeMass;
      const forceX = (dx / dist) * force;
      const forceY = (dy / dist) * force;
      const maxForce = 0.04 * layoutScale;
      const fx = Math.max(-maxForce, Math.min(maxForce, forceX));
      const fy = Math.max(-maxForce, Math.min(maxForce, forceY));

      slime.elastic += cappedKick * 0.006;

      Body.applyForce(slime.body, slime.body.position, { x: fx, y: fy });
    }
  }
}

function updateUI() {
  scoreEl.textContent = score.toLocaleString();
  if (maxLevelEl) maxLevelEl.textContent = maxLevelReached;
  if (collectionLabel) {
    const cname = getCollectionName(maxLevelReached);
    collectionLabel.textContent = cname || '';
  }
  const countEl = document.getElementById('collection-panel-count');
  if (countEl) {
    const unlocked = Math.min(PLANET_TOTAL, Math.max(0, maxLevelReached - COLLECTIONS.solarSystem.from + 1));
    countEl.textContent = `${unlocked} / ${PLANET_TOTAL}`;
  }
}

function updateHighScoreUI() {
  highScoreEl.textContent = highScore.toLocaleString();
}

function loadBoosterPersist() {
  try {
    const c = JSON.parse(localStorage.getItem(AD_KEY) || 'null');
    if (c && typeof c === 'object') {
      for (const key of Object.keys(BOOSTER_DEFS)) {
        if (Number.isFinite(c[key])) boosterCharges[key] = Math.max(0, Math.min(5, Math.round(c[key])));
      }
    }
    const u = JSON.parse(localStorage.getItem(AD_UNLOCK_KEY) || 'null');
    if (u && typeof u === 'object') boostersUnlocked = u;
  } catch (e) {}
  for (const key of Object.keys(BOOSTER_DEFS)) {
    if (maxLevelReached >= BOOSTER_DEFS[key].unlockLevel) boostersUnlocked[key] = true;
  }
  saveBoosterCharges();
  saveBoosterUnlocks();
}

function saveBoosterCharges() {
  try { localStorage.setItem(AD_KEY, JSON.stringify(boosterCharges)); } catch (e) {}
}

function saveBoosterUnlocks() {
  try { localStorage.setItem(AD_UNLOCK_KEY, JSON.stringify(boostersUnlocked)); } catch (e) {}
}

function setupBoostersUI() {
  loadBoosterPersist();
  for (const key of Object.keys(BOOSTER_DEFS)) {
    const btn = document.getElementById(`booster-${key}`);
    if (!btn) continue;
    boosterEls[key] = btn;
    btn.addEventListener('click', () => onBoosterClick(key));
  }
  if (adCloseBtn) adCloseBtn.addEventListener('click', closeAdOverlay);
  updateBoosterUI();
}

function onBoosterClick(key) {
  if (isGameOver || adJob) return;
  if (key === 'blackhole' && bhMode) {
    exitBlackHoleMode(false);
    return;
  }
  if (key === 'antigravity' && agActive) {
    stopAntigravity();
    return;
  }
  if (!boostersUnlocked[key]) {
    sfx.playBoosterDenied();
    return;
  }
  if (boosterCharges[key] > 0) {
    if (key === 'antigravity') {
      if (bhMode) exitBlackHoleMode(false);
      startAntigravity();
    } else {
      if (agActive) stopAntigravity();
      enterBlackHoleMode();
    }
  } else {
    startRewardAd(key);
  }
}

function updateBoosterUI() {
  for (const key of Object.keys(BOOSTER_DEFS)) {
    const btn = boosterEls[key];
    if (!btn) continue;
    const unlocked = !!boostersUnlocked[key];
    const count = boosterCharges[key] | 0;
    const active = (key === 'antigravity' && !!agActive) || (key === 'blackhole' && bhMode);
    btn.classList.toggle('locked', !unlocked);
    btn.classList.toggle('active', active);
    const countEl = btn.querySelector('.booster-count');
    const badgeEl = btn.querySelector('.booster-badge');
    if (countEl) countEl.textContent = `x${count}`;
    if (countEl) countEl.classList.toggle('hidden', !unlocked || count === 0);
    if (badgeEl) badgeEl.classList.toggle('hidden', unlocked && count > 0);
    const hintText = !unlocked
      ? `Открой ${getSlimeConfig(BOOSTER_DEFS[key].unlockLevel).name}, чтобы разблокировать`
      : count > 0
        ? `${BOOSTER_NAMES[key]} — в наличии ${count}`
        : `${BOOSTER_NAMES[key]} — посмотреть рекламу и получить +1`;
    btn.dataset.hint = hintText;
    btn.title = hintText;
  }
}

function unlockBoostersThrough(level) {
  let changed = false;
  for (const key of Object.keys(BOOSTER_DEFS)) {
    if (BOOSTER_DEFS[key].unlockLevel <= level && !boostersUnlocked[key]) {
      boostersUnlocked[key] = true;
      changed = true;
    }
  }
  if (changed) {
    saveBoosterUnlocks();
    updateBoosterUI();
  }
}

function consumeBooster(key) {
  boosterCharges[key] = Math.max(0, (boosterCharges[key] | 0) - 1);
  saveBoosterCharges();
  updateBoosterUI();
}

function grantBooster(key) {
  boosterCharges[key] = Math.min(5, (boosterCharges[key] | 0) + 1);
  saveBoosterCharges();
  updateBoosterUI();
}

function setTimescale(v) {
  if (engine) engine.timing.timeScale = v;
  if (runner) runner.timeScale = v;
}

function restoreGravity() {
  if (engine) engine.world.gravity.y = 0.9;
}

function stopBoosterEffects() {
  restoreGravity();
  setTimescale(1);
  agActive = null;
  bhMode = false;
  bhHover = null;
  if (canvas) canvas.style.cursor = '';
}

function startAntigravity() {
  if (agActive || isGameOver) return;
  consumeBooster('antigravity');
  agActive = { start: performance.now(), until: performance.now() + AG_DURATION };
  if (engine) engine.world.gravity.y = 0.18;
  sfx.playAntigravity();
  updateBoosterUI();
}

function stopAntigravity() {
  if (!agActive) return;
  restoreGravity();
  agActive = null;
  sfx.playAntigravityEnd();
  updateBoosterUI();
}

function updateAntigravity(now) {
  if (!agActive) return;
  if (now >= agActive.until) {
    stopAntigravity();
    return;
  }
  const t = now - agActive.start;
  for (const slime of slimes) {
    if (slime.body.isRemoved || slime.mergeAnim || slime.flownOut) continue;
    const mass = slime.body.mass;
    const pos = slime.body.position;
    if (slime.config.level <= 4) {
      Body.applyForce(slime.body, pos, { x: Math.sin(t * 0.004 + slime.seed * 7) * mass * 0.05, y: -mass * 0.55 });
      if (slime.body.velocity.y < -AG_FLOAT_SPEED) {
        Body.setVelocity(slime.body, { x: slime.body.velocity.x, y: -AG_FLOAT_SPEED });
      }
      if (slime.elastic < 0.1) slime.elastic += 0.012;
    } else {
      Body.applyForce(slime.body, pos, { x: Math.sin(t * 0.011 + slime.seed * 13) * mass * 0.22, y: mass * 0.72 });
      if (slime.elastic < 0.16) slime.elastic = Math.min(0.16, slime.elastic + 0.02);
    }
  }
}

function enterBlackHoleMode() {
  if (bhMode || isGameOver) return;
  bhMode = true;
  bhHover = null;
  setTimescale(0.25);
  if (canvas) canvas.style.cursor = 'crosshair';
  sfx.playBlackHoleArm();
  updateBoosterUI();
}

function exitBlackHoleMode(success) {
  if (!bhMode) {
    bhHover = null;
    return;
  }
  bhMode = false;
  bhHover = null;
  setTimescale(1);
  if (canvas) canvas.style.cursor = '';
  if (!success) sfx.playBoosterCancel();
  updateBoosterUI();
}

function slimeAtPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const s of slimes) {
    if (s.body.isRemoved || s.consume || s.flownOut) continue;
    const r = s.config.radius * layoutScale;
    const d = Math.hypot(s.body.position.x - x, s.body.position.y - y);
    if (d <= r * 1.3 && d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function updateTargetHover() {
  if (!bhMode) return;
  bhHover = lastPointer ? slimeAtPoint(lastPointer.x, lastPointer.y) : null;
}

function attemptBlackHoleConsume(x, y) {
  if (!bhMode) return;
  if (x < bowlCenterX - bowlHalfTop - 8 || x > bowlCenterX + bowlHalfTop + 8 || y < bowlYTop - 8 || y > bowlYBottom + 8) {
    exitBlackHoleMode(false);
    return;
  }
  const slime = slimeAtPoint(x, y);
  if (slime) {
    consumeSlimeWithBlackHole(slime);
    consumeBooster('blackhole');
    exitBlackHoleMode(true);
  }
}

function consumeSlimeWithBlackHole(slime) {
  const x = slime.body.position.x;
  const y = slime.body.position.y;
  blackHoles.push({
    x, y,
    level: slime.config.level,
    color: slime.config.glowColor,
    radius: Math.max(6, slime.config.radius * layoutScale),
    time: 0,
    duration: BH_DURATION
  });
  removeSlimeByIdentity(slime);
  Composite.remove(engine.world, slime.body);
  sfx.playBlackHole();
}

function startRewardAd(key) {
  if (adJob || isGameOver) return;
  if (window.neonAds && typeof window.neonAds.showRewarded === 'function') {
    window.neonAds.showRewarded({ onGrant: () => grantBooster(key), onClose: () => {} });
    return;
  }
  if (!adOverlay || !adMessageEl || !adProgressBarEl || !adCloseBtn || !adRewardEl) return;
  adCloseBtn.classList.add('hidden');
  adRewardEl.classList.add('hidden');
  adProgressBarEl.style.width = '0%';
  adMessageEl.textContent = 'Загрузка рекламы…';
  adOverlay.classList.remove('hidden');
  adJob = { key, t0: performance.now(), dur: 3400, stop: null, granted: false };
  const tick = () => {
    if (!adJob) return;
    const elapsed = performance.now() - adJob.t0;
    const p = Math.min(elapsed / adJob.dur, 1);
    adProgressBarEl.style.width = `${(p * 100).toFixed(1)}%`;
    if (p < 0.3) {
      adMessageEl.textContent = 'Загрузка рекламы…';
    } else if (p < 1) {
      adMessageEl.textContent = `Реклама… ${Math.ceil((1 - p) * adJob.dur / 1000)} с`;
    } else if (!adJob.granted) {
      adJob.granted = true;
      grantBooster(adJob.key);
      sfx.playReward();
      adMessageEl.textContent = 'Бустер получен!';
      adRewardEl.classList.remove('hidden');
      adCloseBtn.classList.remove('hidden');
    }
  };
  tick();
  const iv = setInterval(tick, 120);
  adJob.stop = () => clearInterval(iv);
}

function closeAdOverlay() {
  if (adOverlay) adOverlay.classList.add('hidden');
  if (adJob) {
    adJob.stop();
    adJob = null;
  }
}

function checkGameOver() {
  const t = wallT();
  for (const slime of slimes) {
    if (slime.body.isRemoved) continue;
    const pos = slime.body.position;

    if (slime.flownOut) {
      if (pos.y > bowlYTop + t) {
        triggerGameOver();
        return;
      }
      continue;
    }

    if (!slime.flownOut && pos.y - slime.config.radius * layoutScale > bowlYBottom + t) {
      slime.flownOut = true;
      continue;
    }
  }
}

function triggerGameOver() {
  isGameOver = true;
  Runner.stop(runner);
  stopBoosterEffects();
  sfx.playGameOver();
  gameEndTime = performance.now();
  isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    localStorage.setItem('neon-slime-highscore', highScore.toString());
  }
  const elapsed = Math.max(0, Math.round((gameEndTime - gameStartTime) / 1000));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  finalScoreEl.textContent = score.toLocaleString();
  const topConfig = getSlimeConfig(maxLevelReached);
  if (finalSlimeOrbEl) stylePreviewElement(finalSlimeOrbEl, topConfig, 46, true);
  if (finalSlimeNameEl) finalSlimeNameEl.textContent = topConfig.name;
  if (finalBestEl) finalBestEl.textContent = highScore.toLocaleString();
  if (finalMergesEl) finalMergesEl.textContent = totalMerges.toLocaleString();
  if (finalComboEl) finalComboEl.textContent = `×${bestCombo}`;
  if (finalTimeEl) finalTimeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  if (finalCollectionEl) {
    finalCollectionEl.textContent = `${Math.min(PLANET_TOTAL, Math.max(0, maxLevelReached - 5))} / ${PLANET_TOTAL}`;
  }
  if (newRecordEl) {
    if (isNewRecord) newRecordEl.classList.remove('hidden');
    else newRecordEl.classList.add('hidden');
  }

  comboShownUntil = 0;
  nextSlimeHud.classList.add('hidden');
  gameOverOverlay.classList.remove('hidden');
  previewEl.classList.add('hidden');
  gameOverBg.start();
  leaderboardGameOver(score);
}

function restartGame() {
  isGameOver = false;
  score = 0;
  maxLevelReached = 1;
  totalMerges = 0;
  bestCombo = 0;
  totalDrops = 0;
  isNewRecord = false;
  gameStartTime = performance.now();
  gameOverBg.stop();
  slimes = [];
  slimeByBody.clear();
  mergeEffects.length = 0;
  tentacles.length = 0;
  ambientParticles.length = 0;
  comboCount = 0;
  lastComboAt = -999999;
  lastMergeChild = null;
  comboShownUntil = 0;
  if (unlockPopup) {
    unlockPopup.classList.remove('show');
    unlockPopup.classList.add('hidden');
  }
  unlockFly = null;
  slotReveal = null;
  collectionLayoutKey = -1;
  stopBoosterEffects();
  closeAdOverlay();
  updateBoosterUI();
  gameOverOverlay.classList.add('hidden');

  Composite.clear(engine.world, false);
  Engine.clear(engine);

  engine = Engine.create();
  engine.world.gravity.y = 0.9;
  engine.world.gravity.x = 0;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 2;

  runner.engine = engine;
  Runner.run(runner, engine);

  createStars();
  createBowl();
  Events.on(engine, 'collisionStart', handleCollisionStart);
  Events.on(engine, 'collisionActive', handleCollisionActive);
  Events.on(engine, 'afterUpdate', dampenSlimeSpin);
  Events.on(engine, 'afterUpdate', handleCosmicAttraction);
  Events.on(engine, 'afterUpdate', containSlimes);

  nextSlimeConfig = null;
  spawnNextSlime();
  nextSlimeHud.classList.remove('hidden');
  updateUI();
  updateHighScoreUI();
  leaderboardRestart();
}

function updateMergeEffects(dt = 16.67) {
  for (let i = mergeEffects.length - 1; i >= 0; i--) {
    const effect = mergeEffects[i];
    effect.time += dt;
    const progress = Math.min(effect.time / effect.duration, 1);

    effect.shockwave.radius = effect.shockwave.maxRadius * (1 - Math.pow(1 - progress, 3));
    effect.shockwave.alpha = 1 - progress;

    effect.flash.scale = 0.5 + progress * 1.6;
    effect.flash.alpha = 1 - progress * 0.85;

    for (const p of effect.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= p.decay;
    }
    const parts = effect.particles;
    let w = 0;
    for (let k = 0; k < parts.length; k++) {
      if (parts[k].life > 0) parts[w++] = parts[k];
    }
    parts.length = w;

    if (progress >= 1 && effect.particles.length === 0) {
      mergeEffects.splice(i, 1);
    }
  }
}

function updateSlimesVisual(dt = 16.67) {
  for (const slime of slimes) {
    if (slime.mergeAnim) {
      slime.mergeAnim.elapsed += dt;
      const progress = Math.min(slime.mergeAnim.elapsed / slime.mergeAnim.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const target = MERGE_SPAWN_START_SCALE + (1 - MERGE_SPAWN_START_SCALE) * eased;

      if (progress < 1) {
        const ratio = target / slime.bodyScale;
        if (Math.abs(ratio - 1) > 1e-4) {
          slime.scaleFrame = (slime.scaleFrame || 0) + 1;
          if (slime.scaleFrame % 3 === 0) {
            Body.scale(slime.body, ratio, ratio);
            slime.bodyScale = target;
          }
        }
      }
      slime.mergedScale = target;

      if (slime.mergeAnchor) {
        Body.setPosition(slime.body, slime.mergeAnchor);
        Body.setVelocity(slime.body, { x: 0, y: 0 });
        Body.setAngularVelocity(slime.body, 0);
      }

      if (progress >= 1) {
        if (slime.bodyScale !== 1) {
          Body.scale(slime.body, 1 / slime.bodyScale, 1 / slime.bodyScale);
          slime.bodyScale = 1;
        }
        slime.mergeAnim = null;
        slime.mergeAnchor = null;
        slime.opacity = 1;
        slime.mergedScale = 1;
      }
    }

    slime.elastic = Math.max(0, slime.elastic - 0.028 * dt / 16);

    slime.visualScaleX = 1;
    slime.visualScaleY = 1;
  }
}

function updateParticles(dt = 16.67) {
  const bodies = Composite.allBodies(engine.world);
  for (const body of bodies) {
    if (body.plugin?.isParticle) {
      body.plugin.life -= dt * 0.0012;
      if (body.plugin.life <= 0) {
        Composite.remove(engine.world, body);
      } else {
        body.render.opacity = body.plugin.life;
      }
    }
    if (body.plugin?.mergeCooldown > 0) {
      body.plugin.mergeCooldown -= dt;
      if (body.plugin.mergeCooldown < 0) body.plugin.mergeCooldown = 0;
    }
  }
}

function gameLoop() {
  const now = performance.now();
  let dt = lastFrameTime ? now - lastFrameTime : 16.67;
  lastFrameTime = now;
  if (dt > 50) dt = 50;
  if (dt <= 0) dt = 16.67;
  if (!isGameOver) {
    updateParticles(dt);
    updateAmbientParticles(dt);
    updateMergeEffects(dt);
    updateSlimesVisual(dt);
    updateAntigravity(now);
    checkGameOver();
  }
  updateTargetHover();
  updateUnlockFly();
  updateCollectionBar();
  renderCustom();
  requestAnimationFrame(gameLoop);
}

function renderCustom() {
  const width = canvasRect.width;
  const height = canvasRect.height;

  ctx.clearRect(0, 0, width, height);

  const now = performance.now();

  drawBackground(ctx, width, height, now);
  drawStars(ctx, now);
  drawDust(ctx, now);
  drawBowl(ctx);
  drawAntigravityOverlay(ctx, now);
  drawMergeEffects(ctx);
  drawTentacles(ctx, now);
  drawDropTrail(ctx, now);
  drawSlimes(ctx, now);
  drawBlackHoles(ctx, now);
  drawTargetModeOverlay(ctx, now);
  drawAmbientParticles(ctx, now);
  drawComboOverlay(ctx, now);
}

function drawAntigravityOverlay(ctx, now) {
  if (!agActive) return;
  const remain = agActive.until - now;
  const progress = Math.max(0, Math.min(1, 1 - remain / AG_DURATION));
  const alpha = 0.1 + 0.05 * Math.sin(now * 0.005);
  ctx.save();
  const grad = ctx.createLinearGradient(0, bowlYTop, 0, bowlYBottom);
  grad.addColorStop(0, `rgba(120, 255, 190, ${0.5 * alpha})`);
  grad.addColorStop(1, 'rgba(120, 255, 190, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(bowlCenterX - bowlHalfTop, bowlYTop);
  ctx.lineTo(bowlCenterX + bowlHalfTop, bowlYTop);
  ctx.lineTo(bowlCenterX + bowlHalfBottom, bowlYBottom);
  ctx.lineTo(bowlCenterX - bowlHalfBottom, bowlYBottom);
  ctx.closePath();
  ctx.fill();
  const labelY = bowlYTop - 14;
  const fw = bowlHalfTop * 0.7;
  ctx.fillStyle = `rgba(140, 255, 195, ${0.85 + 0.15 * Math.sin(now * 0.006)})`;
  ctx.font = '800 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('АНТИГРАВИТАЦИЯ', bowlCenterX, labelY);
  ctx.fillStyle = 'rgba(140, 255, 195, 0.55)';
  ctx.fillRect(bowlCenterX - fw / 2, labelY + 4, fw, 3);
  ctx.fillStyle = 'rgba(180, 255, 220, 0.95)';
  ctx.fillRect(bowlCenterX - fw / 2, labelY + 4, Math.max(2, fw * progress), 3);
  ctx.restore();
}

function drawBlackHoles(ctx, now) {
  if (blackHoles.length === 0) return;
  for (let i = blackHoles.length - 1; i >= 0; i--) {
    const h = blackHoles[i];
    h.time += 16.67;
    const p = Math.min(1, h.time / h.duration);
    const alpha = 1 - p;
    ctx.save();
    ctx.globalAlpha = alpha;
    const core = h.radius * Math.max(0.05, 0.5 - p * 0.42);
    const gradC = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, Math.max(1, core));
    gradC.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradC.addColorStop(0.4, h.color);
    gradC.addColorStop(1, 'rgba(10,4,30,0)');
    ctx.fillStyle = gradC;
    ctx.shadowColor = 'rgba(180,90,255,0.9)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(h.x, h.y, Math.max(1, core), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (let k = 0; k < 2; k++) {
      const rr = h.radius * (0.5 + (1 - p) * k * 0.75);
      const rot = now * 0.01 + k * 1.4 + p * 9;
      ctx.strokeStyle = k === 0 ? h.color : 'rgba(220,170,255,0.8)';
      ctx.lineWidth = Math.max(0.6, 2 - p);
      ctx.beginPath();
      ctx.arc(h.x, h.y, Math.max(1, rr), rot, rot + Math.PI * 1.3);
      ctx.stroke();
    }
    for (let k = 0; k < 7; k++) {
      const ang = p * Math.PI * 4 + k * 0.9;
      const rad = h.radius * (1.5 - p * 1.4) * (1 + 0.18 * Math.sin(k * 2.3));
      ctx.fillStyle = k % 2 ? '#ffffff' : h.color;
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(ang) * rad, h.y + Math.sin(ang) * rad, Math.max(0.3, 1.7 - p * 1.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (p >= 1) blackHoles.splice(i, 1);
  }
}

function drawTargetModeOverlay(ctx, now) {
  if (!bhMode) return;
  ctx.save();
  if (lastPointer) {
    const p = lastPointer;
    const cr = 12;
    ctx.strokeStyle = 'rgba(200, 140, 255, 0.95)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(190, 120, 255, 0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.moveTo(p.x + Math.cos(a) * (cr + 6), p.y + Math.sin(a) * (cr + 6));
      ctx.lineTo(p.x + Math.cos(a) * (cr + 11), p.y + Math.sin(a) * (cr + 11));
    }
    ctx.stroke();
  }
  if (bhHover && !bhHover.body.isRemoved) {
    const x = bhHover.body.position.x;
    const y = bhHover.body.position.y;
    const r = bhHover.config.radius * layoutScale * 1.22;
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.008);
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -now * 0.06;
    ctx.strokeStyle = 'rgba(210, 150, 255, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(200, 130, 255, 0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const labelY = Math.max(26, bowlYTop - 30);
  ctx.fillStyle = 'rgba(205, 150, 255, 0.95)';
  ctx.font = '800 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЧЕРНАЯ ДЫРА: нажми на слизня', bowlCenterX, labelY);
  ctx.fillStyle = 'rgba(180, 130, 255, 0.75)';
  ctx.font = '600 10px sans-serif';
  ctx.fillText('Esc или клик мимо чаши — отмена', bowlCenterX, labelY + 13);
  ctx.restore();
}

function drawDropTrail(ctx, now) {
  if (isGameOver || renderPreviewX == null || !currentPreviewConfig) return;

  const dropX = renderPreviewX;
  const dropY = Math.max(50, canvasRect.height * 0.16);
  const r = currentPreviewConfig.radius * layoutScale;

  let landing = bowlYBottom;
  for (const slime of slimes) {
    if (slime.body.isRemoved) continue;
    const pos = slime.body.position;
    if (Math.abs(pos.x - dropX) < r + slime.config.radius * layoutScale) {
      landing = Math.min(landing, pos.y - slime.config.radius * layoutScale);
    }
  }
  if (landing < dropY + 4) landing = dropY + 4;

  const dropTo = Math.max(dropY, Math.min(landing, bowlYTop));

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = currentPreviewConfig.glowColor;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -(now * 0.02) % 14;
  ctx.beginPath();
  ctx.moveTo(dropX, dropY);
  ctx.lineTo(dropX, dropTo);
  ctx.stroke();
  ctx.restore();
}

function drawComboOverlay(ctx, now) {
  if (isGameOver || comboCount < 2 || now >= comboShownUntil) return;

  const mult = Math.min(comboCount, COMBO_MAX_MULT);
  const lifeLeft = comboShownUntil - now;
  const fade = Math.min(1, lifeLeft / 420);

  const pulseA = Math.sin(now * 0.006) * 0.12;
  const popIn = Math.min(1, (COMBO_DISPLAY_TIME - lifeLeft) / 140);
  const scale = 0.8 + 0.45 * easeOutBack(popIn) + pulseA;

  const color = comboCount >= 6 ? '#ff4bd6' : comboCount >= 4 ? '#ffd54e' : '#5af0ff';

  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.translate(canvasRect.width / 2, 96 * layoutScale);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${28 * layoutScale}px 'Segoe UI', 'Arial', sans-serif`;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12 * layoutScale;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`COMBO x${mult}`, 0, 0);
  ctx.shadowBlur = 22 * layoutScale;
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.max(0, fade) * 0.55;
  ctx.fillText(`COMBO x${mult}`, 0, 0);
  ctx.globalAlpha = Math.max(0, fade);
  ctx.font = `600 ${13 * layoutScale}px 'Segoe UI', 'Arial', sans-serif`;
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillText(`+${mult}× blok points`, 0, 20 * layoutScale);
  ctx.restore();
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawBackground(ctx, width, height) {
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#07081c');
  baseGrad.addColorStop(0.55, '#090b24');
  baseGrad.addColorStop(1, '#0a0a1e');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  const now = performance.now();
  const maxDim = Math.max(width, height);

  for (const nebula of nebulas) {
    const cx = nebula.fx * width + Math.sin(now * nebula.drift + nebula.phase) * width * 0.035;
    const cy = nebula.fy * height + Math.sin(now * nebula.drift * 0.7 + nebula.phase * 2) * height * 0.025;
    const rad = maxDim * nebula.size;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, nebula.r);
    grad.addColorStop(1, nebula.g);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const farWorldX = width * 0.82 + Math.sin(now * 0.00008) * width * 0.03;
  const farWorldY = height * 0.16;
  const farR = maxDim * 0.055;
  const farGrad = ctx.createRadialGradient(farWorldX, farWorldY, 0, farWorldX, farWorldY, farR * 4);
  farGrad.addColorStop(0, 'rgba(120, 170, 255, 0.10)');
  farGrad.addColorStop(0.35, 'rgba(90, 130, 230, 0.05)');
  farGrad.addColorStop(1, 'rgba(90, 130, 230, 0)');
  ctx.fillStyle = farGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.14;
  const worldGrad = ctx.createRadialGradient(farWorldX - farR * 0.3, farWorldY - farR * 0.3, farR * 0.1, farWorldX, farWorldY, farR);
  worldGrad.addColorStop(0, '#9db8ff');
  worldGrad.addColorStop(1, '#31407a');
  ctx.fillStyle = worldGrad;
  ctx.beginPath();
  ctx.arc(farWorldX, farWorldY, farR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDust(ctx, now) {
  const width = canvasRect.width;
  const height = canvasRect.height;
  for (let i = 0; i < cosmicDust.length; i++) {
    const d = cosmicDust[i];
    d.x += d.vx;
    d.y += d.vy;
    if (d.y < -4) { d.y = height + 4; d.x = Math.random() * width; }
    if (d.x < -4) d.x = width + 4;
    if (d.x > width + 4) d.x = -4;
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.globalAlpha = d.alpha * (0.6 + 0.4 * Math.sin(now * 0.0009 + d.phase));
    ctx.fill();
    ctx.restore();
  }
}

function drawStars(ctx, now) {
  const w = canvasRect.width;
  const h = canvasRect.height;
  if (starLayer) {
    ctx.save();
    ctx.globalAlpha = 0.88 + 0.12 * Math.sin(now * 0.0011);
    ctx.drawImage(starLayer, 0, 0, w, h);
    ctx.restore();
  }
  for (const star of sparkleStars) {
    const twinkle = 0.5 + 0.5 * Math.sin(now * 0.001 * star.twinkleSpeed + star.twinklePhase);
    ctx.save();
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.globalAlpha = star.baseAlpha * (0.5 + 0.5 * twinkle);
    ctx.shadowColor = star.color;
    ctx.shadowBlur = 4 + star.radius * 2;
    ctx.fill();
    ctx.restore();
  }
}

function drawBowl(ctx) {
  if (!bowlBody) return;

  const centerX = canvasRect.width / 2;
  const bottomY = canvasRect.height - 100;
  const t = wallT();
  const topWidth = bowlW();
  const bottomWidth = bowlW() * 0.7;
  const wallHeight = bowlH();

  const bb = bottomWidth / 2;
  const bt = topWidth / 2;
  const yB = bottomY - t;
  const yT = bottomY - t - wallHeight;

  const L = Math.hypot(bt - bb, wallHeight);
  const ox = (wallHeight / L) * t;
  const oy = ((bt - bb) / L) * t;

  const slab = [
    { x: centerX - bt - ox, y: yT + oy },
    { x: centerX + bt + ox, y: yT + oy },
    { x: centerX + bb + ox, y: yB + oy },
    { x: centerX + bottomWidth / 2, y: bottomY },
    { x: centerX - bottomWidth / 2, y: bottomY },
    { x: centerX - bb - ox, y: yB + oy }
  ];
  const cavity = [
    { x: centerX - bt, y: yT },
    { x: centerX + bt, y: yT },
    { x: centerX + bb, y: yB },
    { x: centerX - bb, y: yB }
  ];

  const trace = (pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
  };

  ctx.save();

  trace(slab);
  const bodyGrad = ctx.createLinearGradient(0, yT + oy, 0, bottomY);
  bodyGrad.addColorStop(0, 'rgba(52, 78, 170, 0.42)');
  bodyGrad.addColorStop(0.55, 'rgba(32, 46, 120, 0.5)');
  bodyGrad.addColorStop(1, 'rgba(10, 14, 48, 0.65)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  const now = performance.now();
  const pulse = 0.5 + 0.35 * Math.sin(now * 0.004);

  trace(cavity);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 8 + 5 * pulse;
  ctx.globalAlpha = 0.5 + 0.2 * pulse;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - bt, yT);
  ctx.lineTo(centerX + bt, yT);
  ctx.strokeStyle = `rgba(170, 245, 255, ${0.55 + 0.15 * pulse})`;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10 + 5 * pulse;
  ctx.stroke();

  trace(slab);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = 'rgba(0, 170, 240, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.shadowBlur = 3;
  ctx.stroke();

  ctx.save();
  trace(slab);
  ctx.clip();
  const bandY = yT + wallHeight * 0.28;
  const band = ctx.createLinearGradient(0, bandY - 26, 0, bandY + 26);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = band;
  ctx.globalAlpha = 1;
  ctx.fillRect(centerX - bt - ox, bandY - 26, (bt + ox) * 2, 52);
  ctx.restore();

  ctx.restore();
}

function drawMergeEffects(ctx) {
  for (const effect of mergeEffects) {
    ctx.save();

    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.shockwave.radius, 0, Math.PI * 2);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = effect.shockwave.alpha * 0.7;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * effect.flash.scale, 0, Math.PI * 2);
    const flashGrad = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, Math.max(1, effect.radius * effect.flash.scale));
    flashGrad.addColorStop(0, '#ffffff');
    flashGrad.addColorStop(0.25, effect.color2);
    flashGrad.addColorStop(0.7, effect.color);
    flashGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flashGrad;
    ctx.globalAlpha = effect.flash.alpha * 0.5;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.fill();

    for (const p of effect.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, p.radius * p.life), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.9;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawTentacles(ctx, now) {
  if (tentacles.length === 0) return;

  for (const t of tentacles) {
    if (t.a.body.isRemoved || t.b.body.isRemoved) continue;

    const ax = t.a.body.position.x, ay = t.a.body.position.y;
    const bx = t.b.body.position.x, by = t.b.body.position.y;
    let dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;
    dx /= dist; dy /= dist;

    const supportA = bodySupport(t.a.body, dx, dy);
    const supportB = bodySupport(t.b.body, -dx, -dy);
    const fx = ax + dx * supportA, fy = ay + dy * supportA;
    const tx = bx - dx * supportB, ty = by - dy * supportB;
    const gap = Math.hypot(tx - fx, ty - fy);
    if (gap < 0.5) continue;

    const perpX = -(ty - fy) / gap, perpY = (tx - fx) / gap;
    const color = t.color || '#00f0ff';
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006 + t.phase);

    ctx.save();

    const arm = (sx, sy, ex, ey, width) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.6 + 0.2 * pulse;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85 * pulse;
      ctx.shadowBlur = 6;
      ctx.fill();
    };

    for (let k = -1; k <= 1; k += 2) {
      const reach = Math.min(0.72, 0.5 + 0.18 * pulse + k * 0.05);
      const fanPx = k * 3;

      arm(
        fx + perpX * fanPx, fy + perpY * fanPx,
        fx + (tx - fx) * reach + perpX * fanPx,
        fy + (ty - fy) * reach + perpY * fanPx,
        1.6
      );
      arm(
        tx - perpX * fanPx, ty - perpY * fanPx,
        tx - (tx - fx) * reach - perpX * fanPx,
        ty - (ty - fy) * reach - perpY * fanPx,
        1.6
      );
    }

    ctx.restore();
  }
}

function drawSlimes(ctx, now) {
  for (const slime of slimes) {
    const body = slime.body;
    const config = slime.config;
    const pos = body.position;
    const r = config.radius * layoutScale;
    const scale = slime.mergedScale !== undefined ? slime.mergedScale : 1;

    const sizeX = r * 2 * slime.visualScaleX * scale;
    const sizeY = r * 2 * slime.visualScaleY * scale;
    const chamfer = config.chamfer * layoutScale * scale;

    let glowColor = config.glowColor;
    let strokeColor = config.glowColor;
    if (config.legendary || config.iridescent) {
      const base = config.baseHue !== undefined ? config.baseHue : 40;
      const speed = config.legendary ? 0.06 : 0.02;
      const hue = (base + now * speed) % 360;
      glowColor = hslToHex(hue, 100, 65);
      strokeColor = hslToHex(hue, 100, 75);
    }
    const glowBlur = Math.min(32, (config.glowBlur !== undefined ? config.glowBlur : Math.min(45, 15 + config.level * 2.5)) * (0.8 + 0.5 * layoutScale));

    const opacity = slime.opacity !== undefined ? slime.opacity : 1;

    ctx.save();

    ctx.translate(pos.x, pos.y);
    ctx.rotate(body.angle);

    if (config.isPlanet) {
      drawPlanetBody(ctx, slime, config, r, now, scale, opacity, glowColor, glowBlur);
    } else {
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(-sizeX / 2, -sizeY / 2, sizeX, sizeY, chamfer);
      } else {
        ctx.beginPath();
        ctx.rect(-sizeX / 2, -sizeY / 2, sizeX, sizeY);
      }

      ctx.globalAlpha = opacity;

      const grad = ctx.createLinearGradient(0, -sizeY / 2, 0, sizeY / 2);
      if (config.legendary) {
        const inner = `hsl(${(now * 0.03 + 220) % 360}, 100%, 78%)`;
        grad.addColorStop(0, inner);
        grad.addColorStop(0.45, '#ffffff');
        grad.addColorStop(1, '#c8d2ff');
      } else if (config.iridescent) {
        const hue = (config.baseHue + now * 0.02) % 360;
        grad.addColorStop(0, hslToHex((hue + 18) % 360, 88, 70));
        grad.addColorStop(0.45, hslToHex(hue, 88, 60));
        grad.addColorStop(1, hslToHex((hue + 342) % 360, 88, 50));
      } else {
        grad.addColorStop(0, lightenColor(config.color, 55));
        grad.addColorStop(0.45, config.color);
        grad.addColorStop(1, darkenColor(config.color, 25));
      }

      ctx.fillStyle = grad;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowBlur;
      ctx.fill();

      if (slime.mergeAnim) {
        const mp = Math.min(slime.mergeAnim.elapsed / slime.mergeAnim.duration, 1);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = opacity * (1 - mp) * 0.45;
        ctx.shadowBlur = glowBlur * 1.5;
        ctx.fill();
        ctx.globalAlpha = opacity;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = opacity * 0.75;
      ctx.stroke();

      drawAura(ctx, config, r, now, opacity, glowColor);

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-sizeX / 2 + 3, -sizeY / 2 + 3, sizeX - 6, sizeY - 6, Math.max(2, chamfer - 2));
      } else {
        ctx.rect(-sizeX / 2 + 3, -sizeY / 2 + 3, sizeX - 6, sizeY - 6);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = opacity;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-sizeX * 0.3, -sizeY * 0.28);
      ctx.lineTo(sizeX * 0.05, -sizeY * 0.35);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    drawStyleDecor(ctx, slime, config, r, now, sizeX, sizeY);
    drawSlimeFace(ctx, slime, now, sizeX, sizeY);
    drawAccessory(ctx, slime, sizeX, sizeY, glowColor);

    ctx.restore();
  }
}

function hexA(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function seededRnd(seed, i) {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawAura(ctx, config, r, now, opacity, glowColor) {
  const aura = config.aura;
  if (!aura) return;
  ctx.save();
  ctx.globalAlpha = opacity * 0.5 * aura;
  for (let i = 0; i < 3; i++) {
    const a = now * 0.001 * (0.7 + i * 0.3) + i * 2.1;
    const ar = r * 1.12 + Math.sin(now * 0.002 + i * 2.4) * r * 0.28;
    const mx = Math.cos(a) * ar;
    const my = Math.sin(a * 1.35) * ar * 0.85;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1.2, r * 0.055), 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 5;
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanetBody(ctx, slime, config, r, now, scale, opacity, glowColor, glowBlur) {
  const p = config.palette;
  const R = r;

  ctx.save();
  ctx.globalAlpha = opacity * 0.3;
  const haloR = R * 1.65 + Math.sin(now * 0.002 + slime.seed) * R * 0.06;
  const halo = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, haloR);
  halo.addColorStop(0, hexA(p.glow, 0.45));
  halo.addColorStop(1, hexA(p.glow, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (config.surface === 'corona') {
    drawSolarCorona(ctx, slime, config, R, now, opacity);
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glowBlur;
  const bodyGrad = ctx.createRadialGradient(-R * 0.32, -R * 0.36, R * 0.1, 0, 0, R);
  bodyGrad.addColorStop(0, p.light);
  bodyGrad.addColorStop(0.45, p.base);
  bodyGrad.addColorStop(1, p.dark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.995, 0, Math.PI * 2);
  ctx.clip();
  drawPlanetSurface(ctx, slime, config, R, now, p);
  ctx.restore();

  if (slime.mergeAnim) {
    const mp = Math.min(slime.mergeAnim.elapsed / slime.mergeAnim.duration, 1);
    ctx.save();
    ctx.globalAlpha = opacity * (1 - mp) * 0.55;
    const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    fg.addColorStop(0, '#ffffff');
    fg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (config.ring) {
    drawPlanetRings(ctx, slime, config, R, now, opacity);
  }

  ctx.save();
  ctx.globalAlpha = opacity * 0.55;
  ctx.strokeStyle = p.rim;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, R * 0.055);
  ctx.shadowColor = p.rim;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, R - ctx.lineWidth * 0.5, Math.PI * 1.12, Math.PI * 1.66);
  ctx.stroke();
  ctx.globalAlpha = opacity * 0.8;
  ctx.lineWidth = 1.6;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexA(p.rim, 0.8);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawAura(ctx, config, R, now, opacity, glowColor);
}

function drawPlanetRings(ctx, slime, config, R, now, opacity) {
  const p = config.palette;
  const saturn = config.planet === 'saturn';
  ctx.save();
  ctx.rotate(-slime.body.angle);
  let glint = 0.6 + 0.25 * Math.sin(now * 0.003 + slime.seed);
  if (slime.mergeAnim) {
    glint += 0.3 * (1 - Math.min(slime.mergeAnim.elapsed / slime.mergeAnim.duration, 1));
  }
  ctx.globalAlpha = opacity * glint;
  const bands = saturn ? [1.38, 1.72] : [1.5];
  const widths = saturn ? [R * 0.16, R * 0.1] : [R * 0.06];
  const ringColor = saturn ? 'rgba(242, 226, 172, 0.95)' : 'rgba(190, 240, 255, 0.8)';
  for (let i = 0; i < bands.length; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, R * bands[i], R * (0.4 - i * 0.07), -0.12, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = widths[i];
    ctx.shadowColor = p.rim;
    ctx.shadowBlur = saturn ? 5 : 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSolarCorona(ctx, slime, config, R, now, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity * 0.5;
  const rays = 10;
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays + now * 0.0004 + slime.seed;
    const r0 = R * (1.0 + 0.1 * Math.sin(now * 0.002 + i));
    const r1 = R * (1.5 + 0.22 * Math.sin(now * 0.0025 + i * 2));
    const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * r1, Math.sin(a) * r1);
    grad.addColorStop(0, 'rgba(255, 210, 90, 0)');
    grad.addColorStop(0.7, 'rgba(255, 214, 90, 0.3)');
    grad.addColorStop(0.92, 'rgba(255, 246, 196, 0.55)');
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, R * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * (r1 - R * 0.15), Math.sin(a) * (r1 - R * 0.15));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanetSurface(ctx, slime, config, R, now, p) {
  const s = config.surface;
  switch (s) {
    case 'corona': {
      const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
      const core = ctx.createRadialGradient(0, 0, R * 0.04, 0, 0, R);
      core.addColorStop(0, `rgba(255, 250, 222, ${0.95 * pulse})`);
      core.addColorStop(0.5, 'rgba(255, 214, 90, 0.85)');
      core.addColorStop(1, 'rgba(255, 150, 30, 0.28)');
      ctx.fillStyle = core;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      break;
    }
    case 'craters': {
      ctx.strokeStyle = 'rgba(214, 220, 230, 0.28)';
      for (let i = 0; i < 4; i++) {
        const a = seededRnd(slime.seed, i) * Math.PI * 2;
        const dist = R * (0.22 + seededRnd(slime.seed, i * 2 + 1) * 0.45);
        const cr = R * (0.09 + seededRnd(slime.seed, i * 3 + 2) * 0.13);
        const cx = Math.cos(a) * dist;
        const cy = Math.sin(a) * dist * 0.85;
        ctx.fillStyle = 'rgba(42, 46, 54, 0.55)';
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx - cr * 0.2, cy - cr * 0.2, cr * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'clouds': {
      ctx.fillStyle = 'rgba(255, 238, 190, 0.3)';
      for (let i = 0; i < 5; i++) {
        const y = -R + i * R * 0.5 + seededRnd(slime.seed, i) * R * 0.12;
        const sway = Math.sin(now * 0.001 + i + slime.seed) * R * 0.15;
        const w = R * (0.55 + seededRnd(slime.seed, i + 7) * 0.25);
        const h = R * (0.1 + seededRnd(slime.seed, i + 3) * 0.06);
        ctx.beginPath();
        ctx.ellipse(sway, y, w, h, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'continents': {
      ctx.fillStyle = 'rgba(62, 170, 96, 0.85)';
      for (let i = 0; i < 3; i++) {
        const a = seededRnd(slime.seed, i) * Math.PI * 2;
        const dist = R * (0.3 + seededRnd(slime.seed, i * 2 + 1) * 0.35);
        const bw = R * (0.24 + seededRnd(slime.seed, i * 3 + 2) * 0.22);
        const bh = R * (0.18 + seededRnd(slime.seed, i * 4 + 3) * 0.18);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * dist, Math.sin(a) * dist * 0.8, bw, bh, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 3; i++) {
        const a = seededRnd(slime.seed, i + 11) * Math.PI * 2;
        const dist = R * (0.4 + seededRnd(slime.seed, i * 2 + 1 + 20) * 0.4);
        const w = R * (0.2 + seededRnd(slime.seed, i + 5) * 0.16);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * dist, Math.sin(a) * dist * 0.8, w, R * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'rocky': {
      ctx.fillStyle = 'rgba(92, 31, 21, 0.5)';
      for (let i = 0; i < 4; i++) {
        const a = seededRnd(slime.seed, i * 5) * Math.PI * 2;
        const dist = R * (0.2 + seededRnd(slime.seed, i * 2 + 1 + 40) * 0.5);
        const rr = R * (0.07 + seededRnd(slime.seed, i + 9) * 0.1);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist * 0.85, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'bands': {
      const bandColors = config.planet === 'saturn'
        ? ['#e8d7a0', '#cbb67a', '#e2ce93', '#bfa76a', '#d6c088']
        : ['#e8c291', '#c7874c', '#a5633e', '#e2bc8e', '#b27147', '#d8a36a'];
      for (let i = 0; i < bandColors.length; i++) {
        const h = (2 * R) / bandColors.length * (0.9 + 0.2 * seededRnd(slime.seed, i));
        const y0 = -R + i * (2 * R) / bandColors.length;
        ctx.fillStyle = hexA(bandColors[i], 0.55 - (i % 2) * 0.12);
        ctx.beginPath();
        ctx.ellipse(0, y0 + h / 2, R * 1.4, h / 2, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      if (config.planet === 'jupiter') {
        ctx.fillStyle = '#b73a2a';
        ctx.beginPath();
        ctx.ellipse(R * 0.14, R * 0.12, R * 0.2, R * 0.13, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 190, 170, 0.5)';
        ctx.beginPath();
        ctx.ellipse(R * 0.09, R * 0.08, R * 0.11, R * 0.07, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'smooth': {
      const ug = ctx.createLinearGradient(0, -R, 0, R);
      ug.addColorStop(0, 'rgba(220, 250, 255, 0.35)');
      ug.addColorStop(0.5, 'rgba(190, 240, 255, 0.08)');
      ug.addColorStop(1, 'rgba(120, 200, 255, 0.3)');
      ctx.fillStyle = ug;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      break;
    }
    case 'storm': {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(${50 + i * 20}, ${80 + i * 15}, ${205 - i * 22}, ${0.12 + i * 0.03})`;
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.5 + i * R * 0.5, R * 1.35, R * 0.08, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(20, 40, 110, 0.7)';
      ctx.beginPath();
      ctx.ellipse(R * 0.22, -R * 0.15, R * 0.16, R * 0.12, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(R * 0.42, R * 0.26, R * 0.09, R * 0.06, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function drawStyleDecor(ctx, slime, config, r, now, sizeX, sizeY) {
  const style = config.visualStyle;
  if (!style || style === 'solid' || style === 'planet') return;
  const hw = sizeX / 2;
  const hh = sizeY / 2;
  const opacity = slime.opacity !== undefined ? slime.opacity : 1;

  switch (style) {
    case 'electric': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      ctx.lineCap = 'round';
      const flick = Math.sin(now * 0.05) + Math.sin(now * 0.079 + 1.7);
      const alpha = 0.4 + 0.32 * Math.max(0, Math.min(1, flick * 0.5 + 0.5));
      ctx.strokeStyle = `rgba(200, 235, 255, ${alpha})`;
      ctx.shadowColor = config.glowColor;
      ctx.shadowBlur = 6;
      ctx.lineWidth = Math.max(1.2, hw * 0.08);
      for (let b = 0; b < 3; b++) {
        const t0 = (now * 0.002 + slime.seed + b * 0.42) % 1;
        const x0 = -hw + t0 * hw * 2;
        ctx.beginPath();
        ctx.moveTo(x0, -hh);
        let x = x0;
        for (let i = 1; i <= 4; i++) {
          const t = i / 4;
          const y = -hh + t * hh * 2;
          x = x0 + Math.sin(t * 7 + now * 0.02 + slime.seed * 3 + b * 2.1) * hw * 0.18;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'plasma': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      const pulse = 0.75 + 0.25 * Math.sin(now * 0.006);
      const g = ctx.createRadialGradient(0, 0, r * pulse * 0.42, 0, 0, r);
      g.addColorStop(0, 'rgba(190, 245, 255, 0.9)');
      g.addColorStop(0.55, 'rgba(41, 224, 255, 0.4)');
      g.addColorStop(1, 'rgba(41, 224, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-hw, -hh, sizeX, sizeY);
      ctx.restore();
      break;
    }
    case 'golden': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      const bx = ((now * 0.3) % (hw * 2)) - hw;
      const band = ctx.createLinearGradient(bx - 14, 0, bx + 14, 0);
      band.addColorStop(0, 'rgba(255, 255, 255, 0)');
      band.addColorStop(0.5, 'rgba(255, 255, 255, 0.38)');
      band.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(-hw, -hh, sizeX, sizeY);
      for (let i = 0; i < 3; i++) {
        const a = now * 0.003 + i * 2.1;
        const sx = Math.cos(a) * hw * 0.35;
        const sy = Math.sin(a) * hh * 0.35;
        ctx.fillStyle = 'rgba(255, 244, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, hw * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'magma': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
      const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
      g.addColorStop(0, `rgba(255, 214, 130, ${0.75 * pulse})`);
      g.addColorStop(0.5, `rgba(255, 87, 87, ${0.4 * pulse})`);
      g.addColorStop(1, 'rgba(120, 20, 10, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-hw, -hh, sizeX, sizeY);
      ctx.strokeStyle = 'rgba(70, 10, 4, 0.55)';
      ctx.lineWidth = Math.max(1.5, hw * 0.06);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const cy = -hh + hh * 2 * (0.28 + 0.2 * i);
        ctx.beginPath();
        ctx.moveTo(-hw * 0.6, cy);
        ctx.lineTo(-hw * 0.2, cy + hh * 0.12);
        ctx.lineTo(hw * 0.15, cy - hh * 0.1);
        ctx.lineTo(hw * 0.6, cy + hh * 0.1);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'nebula': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      const hue = config.baseHue !== undefined ? config.baseHue : 220;
      const ch = (hue + 70) % 360;
      const sh = (hue + 310) % 360;
      for (let i = 0; i < 2; i++) {
        const bx = Math.sin(now * 0.0003 + i * 2.3) * hw * 0.28;
        const by = Math.cos(now * 0.00024 + i * 1.7) * hh * 0.26;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, r * 0.75);
        g.addColorStop(0, `hsla(${ch}, 90%, 70%, 0.5)`);
        g.addColorStop(1, `hsla(${ch}, 90%, 60%, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(-hw, -hh, sizeX, sizeY);
        const g2 = ctx.createRadialGradient(-bx, -by, 0, -bx, -by, r * 0.6);
        g2.addColorStop(0, `hsla(${sh}, 90%, 70%, 0.35)`);
        g2.addColorStop(1, `hsla(${sh}, 90%, 60%, 0)`);
        ctx.fillStyle = g2;
        ctx.fillRect(-hw, -hh, sizeX, sizeY);
      }
      ctx.restore();
      break;
    }
    case 'iridescent': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      for (let i = 0; i < 4; i++) {
        const a = now * 0.002 + i * 1.57 + slime.seed;
        const hue = (config.baseHue + now * 0.06 + i * 90) % 360;
        ctx.fillStyle = `hsla(${hue}, 95%, 75%, 0.4)`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * hw * 0.4, Math.sin(a * 1.3) * hh * 0.4, Math.max(1, hw * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'singularity': {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = opacity;
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
      core.addColorStop(0, 'rgba(6, 10, 26, 0.96)');
      core.addColorStop(0.85, 'rgba(70, 100, 230, 0.3)');
      core.addColorStop(1, 'rgba(70, 100, 230, 0)');
      ctx.fillStyle = core;
      ctx.fillRect(-hw, -hh, sizeX, sizeY);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = opacity * (0.55 + 0.25 * Math.sin(now * 0.008));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = Math.max(1.5, hw * 0.07);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
}

const AMBIENT_PARTICLE_KINDS = {
  sparks: { kind: 'streak', vy: 0.7, vx: 0.5, life: 26, decay: 0.03, sizeMul: 1.1, color: '#fff6c9' },
  golden_dust: { kind: 'star', vy: 0.16, vx: 0.1, life: 70, decay: 0.011, sizeMul: 0.9, color: '#ffd54e' },
  ember: { kind: 'glow', vy: 0.42, vx: 0.18, life: 52, decay: 0.016, sizeMul: 1.0, color: '#ff8a5c' },
  cosmic_stars: { kind: 'dot', vy: 0.1, vx: 0.1, life: 80, decay: 0.01, sizeMul: 0.8, color: '#c995ff' },
  prism_shimmer: { kind: 'dot', vy: 0.5, vx: 0.3, life: 40, decay: 0.02, sizeMul: 0.9, color: '#bffcff' },
  hyper_sparkles: { kind: 'cross', vy: 0.9, vx: 0.6, life: 22, decay: 0.036, sizeMul: 1.2, color: '#9fd8ff' },
  solar_flare: { kind: 'glow', vy: 0.14, vx: 0.05, life: 62, decay: 0.013, sizeMul: 1.0, color: '#ffe9a0' }
};

function spawnAmbientParticle(slime) {
  const cfg = slime.config;
  const data = AMBIENT_PARTICLE_KINDS[cfg.particleType];
  if (!data) return;
  const r = cfg.radius * layoutScale;
  const pos = slime.body.position;
  const a = Math.random() * Math.PI * 2;
  const ar = r * (0.25 + Math.random() * 0.55);
  const size = Math.max(1.5, (0.5 + Math.random() * 0.7) * r * data.sizeMul * 0.07);
  ambientParticles.push({
    x: pos.x + Math.cos(a) * ar,
    y: pos.y + Math.sin(a) * ar,
    vx: (Math.random() - 0.5) * data.vx * 2,
    vy: -data.vy * (0.6 + Math.random() * 0.8),
    life: data.life,
    maxLife: data.life,
    size,
    color: data.color,
    kind: data.kind,
    wx: Math.random() * 10,
    wy: Math.random() * 10
  });
}

function updateAmbientParticles(dt = 16.67) {
  for (const slime of slimes) {
    if (slime.body.isRemoved) continue;
    const cfg = slime.config;
    if (!cfg.particleType) continue;
    if (slime.opacity < 0.3 || slime.mergeAnim) continue;
    const interval = (cfg.visualStyle === 'singularity' || cfg.visualStyle === 'iridescent' || cfg.particleType === 'solar_flare') ? 150 : 340;
    slime.particleTimer -= dt;
    if (slime.particleTimer <= 0) {
      slime.particleTimer = interval * (0.6 + Math.random() * 0.8);
      if (ambientParticles.length < (lowPower ? 80 : 120)) spawnAmbientParticle(slime);
    }
  }
  for (let i = ambientParticles.length - 1; i >= 0; i--) {
    const p = ambientParticles[i];
    p.life -= p.decay;
    if (p.life <= 0) { ambientParticles.splice(i, 1); continue; }
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.985;
    p.vy *= 0.985;
    if (p.kind === 'glow' || p.kind === 'star') p.vy += 0.0008;
  }
}

function drawAmbientParticles(ctx, now) {
  if (ambientParticles.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const p of ambientParticles) {
    const fade = Math.max(0, Math.min(1, p.life / p.maxLife));
    let alpha = fade;
    if (p.kind === 'glow' || p.kind === 'dot') {
      alpha *= 0.55 + 0.45 * Math.sin(now * 0.02 + p.wx);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size >= 2.6 ? 5 : 0;

    switch (p.kind) {
      case 'streak': {
        const len = 3 + p.size * 2.5;
        ctx.lineWidth = Math.max(1, p.size * 0.55);
        ctx.beginPath();
        ctx.moveTo(p.x + p.vy * len, p.y + p.vx * len);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        break;
      }
      case 'cross': {
        const s = p.size * (0.6 + 0.5 * Math.sin(now * 0.05 + p.wx));
        ctx.lineWidth = Math.max(1, p.size * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y);
        ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x, p.y + s);
        ctx.stroke();
        break;
      }
      case 'star': {
        const s = p.size * (0.7 + 0.5 * Math.sin(now * 0.03 + p.wx));
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const ang = i * Math.PI / 2 + now * 0.004;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(ang) * s, p.y + Math.sin(ang) * s);
        }
        ctx.stroke();
        break;
      }
      default: {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function slimeBlinkAmount(seed, now) {
  const period = 15000 + seededRnd(seed, 7) * 5000;
  const cycle = (now + seededRnd(seed, 8) * 12000) % period;
  const blinkLen = 140;
  if (cycle > period - blinkLen) {
    const t = (cycle - (period - blinkLen)) / blinkLen;
    return Math.sin(Math.PI * t);
  }
  return 0;
}

function drawSlimeFace(ctx, slime, now, sizeX, sizeY) {
  const eyeY = -sizeY * 0.05;
  const eyeSpacing = sizeX * 0.28;
  const eyeR = sizeX * 0.15;

  let gx = slime.body.velocity.x;
  let gy = slime.body.velocity.y;
  for (const t of tentacles) {
    const other = t.a === slime ? t.b : (t.b === slime ? t.a : null);
    if (other) {
      gx = other.body.position.x - slime.body.position.x;
      gy = other.body.position.y - slime.body.position.y;
      break;
    }
  }
  const ang = -slime.body.angle;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let lx = gx * ca - gy * sa;
  let ly = gx * sa + gy * ca;
  const gl = Math.hypot(lx, ly);
  if (gl < 1) { lx = 0; ly = 0; } else { lx /= gl; ly /= gl; }

  const SCLERA = '#ffffff';
  const PUPIL = '#21242e';
  const RIM = 'rgba(0, 0, 0, 0.22)';

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const blink = slimeBlinkAmount(slime.seed, now);
  const eyeScaleY = 1 - 0.9 * blink;

  for (const s of [-1, 1]) {
    const ex = s * eyeSpacing * 0.5 + lx * eyeSpacing * 0.15;
    const ey = eyeY + ly * eyeSpacing * 0.15;

    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(1, eyeScaleY);

    ctx.beginPath();
    ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = SCLERA;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, eyeR * 0.12);
    ctx.strokeStyle = RIM;
    ctx.stroke();

    const px = lx * eyeR * 0.4;
    const py = ly * eyeR * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = PUPIL;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + eyeR * 0.18, py - eyeR * 0.18, eyeR * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = SCLERA;
    ctx.fill();

    ctx.restore();

    if (blink > 0.35) {
      const lidH = eyeR * (blink - 0.35) * 4.2;
      ctx.beginPath();
      ctx.moveTo(ex - eyeR * 1.02, ey - eyeR * 0.55);
      ctx.quadraticCurveTo(ex, ey - eyeR * 0.55 - lidH, ex + eyeR * 1.02, ey - eyeR * 0.55);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = Math.max(1, eyeR * 0.18);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawAccessory(ctx, slime, sizeX, sizeY, glowColor) {
  const acc = slime.accessory;
  if (!acc) return;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 6;

  if (acc === 'horns') {
    ctx.fillStyle = glowColor;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.4;
    if (slime.config.isPlanet) {
      drawRoundHorns(ctx, sizeX / 2, glowColor);
    } else {
      drawSquareHorns(ctx, sizeX, sizeY, glowColor);
    }
  } else if (acc === 'catEars') {
    const topY = -sizeY / 2;
    const hx = sizeX * 0.22, hy = sizeY * 0.17;
    for (const s of [-1, 1]) {
      const bx = s * hx;
      ctx.beginPath();
      ctx.moveTo(bx - s * 5, topY);
      ctx.lineTo(bx + s * sizeX * 0.16, topY - hy * 1.4);
      ctx.lineTo(bx + s * 8, topY);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawSquareHorns(ctx, sizeX, sizeY, glowColor) {
  const topY = -sizeY / 2;
  const hx = sizeX * 0.27;
  const hy = sizeY * 0.20;
  const baseW = sizeX * 0.10;
  for (const s of [-1, 1]) {
    const bx = s * hx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bx - s * baseW, topY + 1);
    ctx.quadraticCurveTo(bx + s * sizeX * 0.02, topY - hy * 0.55, bx + s * sizeX * 0.18, topY - hy);
    ctx.quadraticCurveTo(bx + s * sizeX * 0.10, topY - hy * 0.5, bx + s * baseW, topY + 1);
    ctx.closePath();
    ctx.fillStyle = glowColor;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(bx - sizeX * 0.2, topY - hy * 1.2, sizeX * 0.4, hy * 0.55);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(bx - sizeX * 0.2, topY - hy * 0.1, sizeX * 0.4, hy * 0.4);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, sizeX * 0.014);
    ctx.beginPath();
    ctx.moveTo(bx + s * baseW * 0.4, topY + 1);
    ctx.quadraticCurveTo(bx + s * sizeX * 0.03, topY - hy * 0.5, bx + s * sizeX * 0.16, topY - hy * 0.92);
    ctx.stroke();
  }
}

function drawRoundHorns(ctx, r, glowColor) {
  const rootA = 0.52;
  for (const s of [-1, 1]) {
    const rx = Math.sin(rootA) * r * s;
    const ry = -Math.cos(rootA) * r + 1;
    const tA = s * (rootA + 0.62);
    const tx = Math.sin(tA) * r * 1.18;
    const ty = -Math.cos(tA) * r * 1.18;
    const span = tx - rx;
    const base = ty < ry ? ty : ry;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rx - s * r * 0.09, ry);
    ctx.quadraticCurveTo(rx + s * r * 0.26, ry - r * 0.22, tx, ty);
    ctx.quadraticCurveTo(rx + s * r * 0.14, ry - r * 0.08, rx + s * r * 0.09, ry);
    ctx.closePath();
    ctx.fillStyle = glowColor;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(base - r * 0.35, base, r * 0.7, r * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(base - r * 0.35, base + r * 0.4, r * 0.7, r * 0.35);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath();
    ctx.moveTo(rx + s * r * 0.03, ry - 2);
    ctx.quadraticCurveTo(rx + s * r * 0.2, ry - r * 0.18, tx - s * r * 0.04, ty + r * 0.04);
    ctx.stroke();
  }
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

init();