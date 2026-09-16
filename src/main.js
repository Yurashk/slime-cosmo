import Matter from 'matter-js';
import {
  SLIME_CONFIGS,
  getSlimeConfig,
  MAX_SLIME_LEVEL,
  BLAST_RADIUS,
  BLAST_FORCE_MULTIPLIER,
  MERGE_COOLDOWN,
  IRIDESCENT_LEVEL,
  GOLDEN_LEVEL,
  hslToHex
} from './SlimeConfig.js';

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
const slimeCountEl = document.getElementById('slime-count');
const nextSlimeDisplay = document.getElementById('next-slime-display');
const nextSlimeHud = document.getElementById('next-slime-hud');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const finalMaxLevelEl = document.getElementById('final-max-level');

let engine, runner;
let bowlBody, bowlBottom, bowlLeft, bowlRight;
let slimes = [];
let nextSlimeConfig = null;
let currentPreviewConfig = null;
let score = 0;
let highScore = parseInt(localStorage.getItem('neon-slime-highscore') || '0', 10);
let maxLevelReached = 1;
let isGameOver = false;
let lastDropTime = 0;
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
let comboCount = 0;
let lastComboAt = -999999;
let comboShownUntil = 0;

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
const tentacles = [];
const TENTACLE_RANGE = 15;
const MERGE_OVERLAP_GAP = 1.5;
const MAX_SLIME_KICK = 3.5;
const MAX_SLIME_SPEED = 12;
const ACCESSORIES = ['horns', 'catEars', 'glasses'];
const ACCESSORY_CHANCE = 0.05;
const RARE_BONUS = 1.5;
const COMBO_WINDOW = 1500;
const COMBO_DISPLAY_TIME = 1900;

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function init() {
  updateCanvasRect();
  window.addEventListener('resize', updateCanvasRect);

  engine = Engine.create();
  engine.world.gravity.y = 0.9;
  engine.world.gravity.x = 0;
  engine.positionIterations = 18;
  engine.velocityIterations = 18;
  engine.constraintIterations = 14;

  runner = Runner.create();
  Runner.run(runner, engine);

  createStars();
  createBowl();
  setupEventListeners();
  Events.on(engine, 'afterUpdate', dampenSlimeSpin);
  Events.on(engine, 'afterUpdate', handleCosmicAttraction);
  Events.on(engine, 'afterUpdate', containSlimes);
  spawnNextSlime();
  updatePreview();
  updateHighScoreUI();
  requestAnimationFrame(gameLoop);
}

function updateCanvasRect() {
  canvasRect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  const count = 45 + Math.floor(Math.random() * 15);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvasRect.width,
      y: Math.random() * canvasRect.height,
      radius: 0.5 + Math.random() * 0.75,
      baseAlpha: 0.3 + Math.random() * 0.6,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinklePhase: Math.random() * Math.PI * 2,
      color: Math.random() < 0.7 ? '#ffffff' : '#00f0ff'
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
  window.addEventListener('keydown', handleKeyDown);

  restartBtn.addEventListener('click', restartGame);
  playAgainBtn.addEventListener('click', restartGame);

  Events.on(engine, 'collisionStart', handleCollisionStart);
}

function handleMouseMove(e) {
  if (isGameOver) return;
  targetX = e.clientX - canvasRect.left;
  updatePreviewPosition();
}

function handleMouseDown(e) {
  if (isGameOver) return;
  if (e.button === 0) dropSlime();
}

function handleTouchMove(e) {
  if (isGameOver) return;
  const touch = e.touches[0];
  const x = touch.clientX - canvasRect.left;
  if (dragOriginX !== null) {
    targetX = dragStartPreviewX + (x - dragOriginX);
  }
  updatePreviewPosition();
}

function handleTouchStart(e) {
  if (isGameOver) return;
  const touch = e.touches[0];
  const x = touch.clientX - canvasRect.left;
  dragOriginX = x;
  dragStartPreviewX = renderPreviewX != null ? renderPreviewX : canvasRect.width / 2;
  targetX = dragStartPreviewX;
  updatePreviewPosition();
}

function handleTouchEnd(e) {
  dragOriginX = null;
  if (isGameOver) return;
  dropSlime();
}

function handleKeyDown(e) {
  if (e.code === 'Space' && !isGameOver) {
    e.preventDefault();
    dropSlime();
  }
}

function updatePreviewPosition() {
  const centerX = canvasRect.width / 2;
  const halfWidth = bowlW() / 2 - 35;
  const desiredX = targetX != null ? targetX : centerX;
  const clampedX = Math.max(centerX - halfWidth, Math.min(centerX + halfWidth, desiredX));
  renderPreviewX = clampedX;

  previewEl.style.left = clampedX + 'px';
  previewEl.style.transform = 'translateX(-50%)';

  const dropZoneLeft = centerX - halfWidth;
  const dropZoneWidth = halfWidth * 2;
  dropZoneIndicator.style.left = dropZoneLeft + 'px';
  dropZoneIndicator.style.width = dropZoneWidth + 'px';
}

function updatePreview() {
  if (!currentPreviewConfig) return;

  const size = currentPreviewConfig.radius * 2 * layoutScale;
  previewEl.style.width = size + 'px';
  previewEl.style.height = size + 'px';
  previewEl.style.borderRadius = '22%';
  previewEl.style.background = `radial-gradient(circle at 30% 30%, ${currentPreviewConfig.color}, ${currentPreviewConfig.glowColor})`;
  previewEl.style.boxShadow = `0 0 20px ${currentPreviewConfig.glowColor}, 0 0 40px ${currentPreviewConfig.glowColor}`;
  previewEl.classList.remove('hidden');
}

function getRandomLowLevelSlime() {
  return SLIME_CONFIGS[Math.floor(Math.random() * 2)];
}

function spawnNextSlime() {
  if (nextSlimeConfig) {
    currentPreviewConfig = nextSlimeConfig;
  } else {
    currentPreviewConfig = getRandomLowLevelSlime();
  }
  nextSlimeConfig = getRandomLowLevelSlime();

  nextSlimeDisplay.style.borderRadius = '22%';
  nextSlimeDisplay.style.background = `radial-gradient(circle at 30% 30%, ${nextSlimeConfig.color}, ${nextSlimeConfig.glowColor})`;
  nextSlimeDisplay.style.border = '2px solid #ffd54e';
  nextSlimeDisplay.style.boxShadow = `0 0 8px rgba(255,213,78,0.8), 0 0 16px rgba(255,213,78,0.45), inset 0 0 4px rgba(255,213,78,0.6)`;

  updatePreview();
  updatePreviewPosition();
}

function dropSlime() {
  const now = performance.now();
  if (now - lastDropTime < DROP_COOLDOWN) return;
  lastDropTime = now;

  const centerX = canvasRect.width / 2;
  const halfWidth = bowlW() / 2 - currentPreviewConfig.radius * layoutScale - 12;
  const baseX = renderPreviewX != null ? renderPreviewX : centerX;
  const dropX = Math.max(centerX - halfWidth, Math.min(centerX + halfWidth, baseX));
  const dropY = Math.max(50, canvasRect.height * 0.16);

  const slime = createSlime(dropX, dropY, currentPreviewConfig);
  slimes.push(slime);
  Composite.add(engine.world, slime.body);

  spawnNextSlime();
  updateUI();

  checkGameOver();
}

function createSlime(x, y, config) {
  const side = config.radius * 2 * layoutScale;
  const body = Bodies.rectangle(x, y, side, side, {
    density: config.density,
    restitution: Math.min(config.restitution, 0.15),
    friction: 0.5,
    frictionAir: 0.05,
    frictionStatic: 0.5,
    chamfer: { radius: config.chamfer * layoutScale },
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
  });

  return {
    body,
    config,
    visualScaleX: 1,
    visualScaleY: 1,
    elastic: 0,
    flownOut: false,
    accessory: Math.random() < ACCESSORY_CHANCE ? randItem(ACCESSORIES) : null
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

function bodySupport(body, dir) {
  let best = -Infinity;
  for (const v of body.vertices) {
    const d = (v.x - body.position.x) * dir.x + (v.y - body.position.y) * dir.y;
    if (d > best) best = d;
  }
  return best;
}

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
      if (Math.abs(pos.x - bowlCenterX) > bowlHalfTop + r) {
        slime.flownOut = true;
      } else if (slime.body.velocity.y < 0) {
        Body.setVelocity(slime.body, { x: slime.body.velocity.x, y: slime.body.velocity.y * -0.2 });
      }
      continue;
    }

    const safe = Math.max(0, bowlSafeHalfWidth(pos.y) - r);
    const over = pos.x >= bowlCenterX ? pos.x - (bowlCenterX + safe) : (bowlCenterX - safe) - pos.x;
    if (over > t + 1) {
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
    const aAlive = !t.a.body.isRemoved && slimes.includes(t.a);
    const bAlive = !t.b.body.isRemoved && slimes.includes(t.b);
    if (!aAlive || !bAlive) {
      tentacles.splice(i, 1);
      continue;
    }
    const dx = t.b.body.position.x - t.a.body.position.x;
    const dy = t.b.body.position.y - t.a.body.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) { tentacles.splice(i, 1); continue; }
    const dhat = { x: dx / dist, y: dy / dist };
    const gap = dist - bodySupport(t.a.body, dhat) - bodySupport(t.b.body, { x: -dhat.x, y: -dhat.y });
    if (gap > TENTACLE_RANGE * layoutScale + 1) {
      tentacles.splice(i, 1);
    }
  }

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
      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;
      const dhat = { x: dx / dist, y: dy / dist };
      const supportA = bodySupport(a.body, dhat);
      const supportB = bodySupport(b.body, { x: -dhat.x, y: -dhat.y });
      const gap = dist - supportA - supportB;

      if (gap <= TENTACLE_RANGE * layoutScale) {
        const alreadyHas = tentacles.some(
          t => (t.a === a && t.b === b) || (t.a === b && t.b === a)
        );
        if (!alreadyHas) {
          tentacles.push({ a, b, phase: Math.random() * 100, color: lightenColor(a.config.color, 25) });
        }

        if (gap <= MERGE_OVERLAP_GAP * layoutScale) {
          performMerge(a, b);
          return;
        }
      }
    }
  }
}

function findSlimeByBody(body) {
  for (const slime of slimes) {
    if (slime.body === body) return slime;
  }
  return null;
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

  Composite.remove(engine.world, bodyA);
  Composite.remove(engine.world, bodyB);
  slimes = slimes.filter(s => s.body !== bodyA && s.body !== bodyB);

  createMergeEffect(anchorX, midY, config);

  const newSlime = createSlime(anchorX, midY, config);
  newSlime.opacity = 1;
  newSlime.mergeAnim = { elapsed: 0, duration: 240 };
  newSlime.body.plugin.mergeCooldown = MERGE_COOLDOWN;
  newSlime.body.collisionFilter.mask = 0;
  newSlime.mergeAnchor = { x: anchorX, y: midY };
  slimes.push(newSlime);
  Composite.add(engine.world, newSlime.body);

  const nowMs = performance.now();
  if (nowMs - lastComboAt <= COMBO_WINDOW) {
    comboCount += 1;
  } else {
    comboCount = 1;
  }
  lastComboAt = nowMs;
  if (comboCount >= 2) {
    comboShownUntil = nowMs + COMBO_DISPLAY_TIME;
  }

  const rareBonus = (a.accessory || b.accessory) ? RARE_BONUS : 1;
  const baseGain = Math.round(config.scoreValue * rareBonus);
  const comboMult = comboCount >= 2 ? comboCount : 1;
  const scoreGain = Math.round(baseGain * comboMult);
  score += scoreGain;
  maxLevelReached = Math.max(maxLevelReached, level + 1);
  updateUI();

  applyBlastWave(anchorX, midY, level + 1);
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

function createMergeEffect(x, y, config) {
  mergeEffects.push({
    x, y,
    color: config.glowColor,
    color2: config.color,
    radius: config.radius * layoutScale,
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
  maxLevelEl.textContent = maxLevelReached;
  slimeCountEl.textContent = slimes.length;
}

function updateHighScoreUI() {
  highScoreEl.textContent = highScore.toLocaleString();
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
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('neon-slime-highscore', highScore.toString());
  }
  finalScoreEl.textContent = score.toLocaleString();
  finalMaxLevelEl.textContent = maxLevelReached;
  comboShownUntil = 0;
  nextSlimeHud.classList.add('hidden');
  gameOverOverlay.classList.remove('hidden');
  previewEl.classList.add('hidden');
}

function restartGame() {
  isGameOver = false;
  score = 0;
  maxLevelReached = 1;
  slimes = [];
  mergeEffects.length = 0;
  tentacles.length = 0;
  comboCount = 0;
  lastComboAt = -999999;
  comboShownUntil = 0;
  gameOverOverlay.classList.add('hidden');

  Composite.clear(engine.world, false);
  Engine.clear(engine);

  engine = Engine.create();
  engine.world.gravity.y = 0.9;
  engine.world.gravity.x = 0;
  engine.positionIterations = 18;
  engine.velocityIterations = 18;
  engine.constraintIterations = 14;

  runner.engine = engine;
  Runner.run(runner, engine);

  createStars();
  createBowl();
  Events.on(engine, 'collisionStart', handleCollisionStart);
  Events.on(engine, 'afterUpdate', dampenSlimeSpin);
  Events.on(engine, 'afterUpdate', handleCosmicAttraction);
  Events.on(engine, 'afterUpdate', containSlimes);

  nextSlimeConfig = null;
  spawnNextSlime();
  nextSlimeHud.classList.remove('hidden');
  updateUI();
  updateHighScoreUI();
}

function updateMergeEffects() {
  const dt = 16.67;
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
    effect.particles = effect.particles.filter(p => p.life > 0);

    if (progress >= 1 && effect.particles.length === 0) {
      mergeEffects.splice(i, 1);
    }
  }
}

function updateSlimesVisual() {
  const dt = 16.67;
  for (const slime of slimes) {
    if (slime.mergeAnim) {
      slime.mergeAnim.elapsed += dt;
      const progress = Math.min(slime.mergeAnim.elapsed / slime.mergeAnim.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      slime.mergedScale = 1 + 0.22 * Math.pow(1 - eased, 2);

      if (slime.mergeAnchor) {
        Body.setPosition(slime.body, slime.mergeAnchor);
        Body.setVelocity(slime.body, { x: 0, y: 0 });
        Body.setAngularVelocity(slime.body, 0);
      }

      if (progress >= 1) {
        slime.mergeAnim = null;
        slime.mergeAnchor = null;
        slime.opacity = 1;
        slime.mergedScale = 1;
        slime.body.collisionFilter.mask = BOWL_CATEGORY | SLIME_CATEGORY;
      }
    }

    slime.elastic = Math.max(0, slime.elastic - 0.028 * dt / 16);

    slime.visualScaleX = 1;
    slime.visualScaleY = 1;
  }
}

function updateParticles() {
  const bodies = Composite.allBodies(engine.world);
  for (const body of bodies) {
    if (body.plugin?.isParticle) {
      body.plugin.life -= 0.02;
      if (body.plugin.life <= 0) {
        Composite.remove(engine.world, body);
      } else {
        body.render.opacity = body.plugin.life;
      }
    }
    if (body.plugin?.mergeCooldown > 0) {
      body.plugin.mergeCooldown -= 16.67;
      if (body.plugin.mergeCooldown < 0) body.plugin.mergeCooldown = 0;
    }
  }
}

function gameLoop() {
  if (!isGameOver) {
    updateParticles();
    updateMergeEffects();
    updateSlimesVisual();
    checkGameOver();
  }

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
  drawBowl(ctx);
  drawMergeEffects(ctx);
  drawTentacles(ctx, now);
  drawDropTrail(ctx, now);
  drawSlimes(ctx, now);
  drawComboOverlay(ctx, now);
}

function drawDropTrail(ctx, now) {
  if (isGameOver || renderPreviewX == null || !currentPreviewConfig) return;

  const centerX = canvasRect.width / 2;
  const halfWidth = bowlW() / 2 - currentPreviewConfig.radius * layoutScale - 12;
  const dropX = Math.max(centerX - halfWidth, Math.min(centerX + halfWidth, renderPreviewX));
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
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = currentPreviewConfig.glowColor;
  ctx.lineWidth = 1.5;
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
  ctx.shadowBlur = 18 * layoutScale;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`COMBO x${comboCount}`, 0, 0);
  ctx.shadowBlur = 34 * layoutScale;
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.max(0, fade) * 0.55;
  ctx.fillText(`COMBO x${comboCount}`, 0, 0);
  ctx.globalAlpha = Math.max(0, fade);
  ctx.font = `600 ${13 * layoutScale}px 'Segoe UI', 'Arial', sans-serif`;
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillText(`+${comboCount}× blok points`, 0, 20 * layoutScale);
  ctx.restore();
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawBackground(ctx, width, height) {
  ctx.fillStyle = '#050311';
  ctx.fillRect(0, 0, width, height);

  const maxDim = Math.max(width, height);

  const leftNebula = ctx.createRadialGradient(
    width * 0.15, height * 0.6, 0,
    width * 0.15, height * 0.6, maxDim * 0.5
  );
  leftNebula.addColorStop(0, 'rgba(150, 0, 100, 0.25)');
  leftNebula.addColorStop(1, 'rgba(150, 0, 100, 0)');
  ctx.fillStyle = leftNebula;
  ctx.fillRect(0, 0, width, height);

  const rightNebula = ctx.createRadialGradient(
    width * 0.88, height * 0.3, 0,
    width * 0.88, height * 0.3, maxDim * 0.45
  );
  rightNebula.addColorStop(0, 'rgba(0, 200, 255, 0.2)');
  rightNebula.addColorStop(1, 'rgba(0, 200, 255, 0)');
  ctx.fillStyle = rightNebula;
  ctx.fillRect(0, 0, width, height);

  const topNebula = ctx.createRadialGradient(
    width * 0.5, height * 0.05, 0,
    width * 0.5, height * 0.05, maxDim * 0.35
  );
  topNebula.addColorStop(0, 'rgba(0, 200, 255, 0.15)');
  topNebula.addColorStop(1, 'rgba(0, 200, 255, 0)');
  ctx.fillStyle = topNebula;
  ctx.fillRect(0, 0, width, height);
}

function drawStars(ctx, now) {
  for (const star of stars) {
    const twinkle = 0.6 + 0.4 * Math.sin(now * 0.001 * star.twinkleSpeed + star.twinklePhase);
    ctx.save();
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.globalAlpha = star.baseAlpha * twinkle;
    ctx.shadowColor = star.color;
    ctx.shadowBlur = 6 + star.radius * 3;
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
  const pulse = 0.55 + 0.45 * Math.sin(now * 0.004);

  trace(cavity);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18 + 10 * pulse;
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - bt, yT);
  ctx.lineTo(centerX + bt, yT);
  ctx.strokeStyle = `rgba(170, 245, 255, ${0.8 + 0.2 * pulse})`;
  ctx.lineWidth = 4.5;
  ctx.shadowBlur = 26 + 12 * pulse;
  ctx.stroke();

  trace(slab);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = 'rgba(0, 170, 240, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 8;
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
    ctx.shadowBlur = 20;
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
    ctx.shadowBlur = 30;
    ctx.fill();

    for (const p of effect.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, p.radius * p.life), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.9;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
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

    const supportA = bodySupport(t.a.body, { x: dx, y: dy });
    const supportB = bodySupport(t.b.body, { x: -dx, y: -dy });
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
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85 * pulse;
      ctx.shadowBlur = 10;
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
    const chamfer = config.chamfer * layoutScale;

    let glowColor = config.glowColor;
    let strokeColor = config.glowColor;
    if (config.legendary || config.iridescent) {
      const base = config.baseHue !== undefined ? config.baseHue : 40;
      const speed = config.legendary ? 0.06 : 0.02;
      const hue = (base + now * speed) % 360;
      glowColor = hslToHex(hue, 100, 65);
      strokeColor = hslToHex(hue, 100, 75);
    }
    const glowBlur = (config.glowBlur !== undefined ? config.glowBlur : Math.min(45, 15 + config.level * 2.5)) * (0.6 + 0.4 * layoutScale);

    ctx.save();

    ctx.translate(pos.x, pos.y);
    ctx.rotate(body.angle);

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-sizeX / 2, -sizeY / 2, sizeX, sizeY, chamfer);
    } else {
      ctx.beginPath();
      ctx.rect(-sizeX / 2, -sizeY / 2, sizeX, sizeY);
    }

    const opacity = slime.opacity !== undefined ? slime.opacity : 1;
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

    if (config.aura > 0) {
      ctx.save();
      ctx.globalAlpha = opacity * 0.5 * config.aura;
      for (let i = 0; i < 3; i++) {
        const a = now * 0.001 * (0.7 + i * 0.3) + i * 2.1;
        const ar = r * 1.12 + Math.sin(now * 0.002 + i * 2.4) * r * 0.28;
        const mx = Math.cos(a) * ar;
        const my = Math.sin(a * 1.35) * ar * 0.85;
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(1.2, r * 0.055), 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.restore();
    }

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

    drawSlimeFace(ctx, slime, now, sizeX, sizeY);
    drawAccessory(ctx, slime, sizeX, sizeY, glowColor);

    ctx.restore();
  }
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

  for (const s of [-1, 1]) {
    const ex = s * eyeSpacing * 0.5 + lx * eyeSpacing * 0.15;
    const ey = eyeY + ly * eyeSpacing * 0.15;

    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = SCLERA;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, eyeR * 0.12);
    ctx.strokeStyle = RIM;
    ctx.stroke();

    const px = ex + lx * eyeR * 0.4;
    const py = ey + ly * eyeR * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = PUPIL;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + eyeR * 0.18, py - eyeR * 0.18, eyeR * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = SCLERA;
    ctx.fill();
  }

  ctx.restore();
}

function drawAccessory(ctx, slime, sizeX, sizeY, glowColor) {
  const acc = slime.accessory;
  if (!acc) return;
  const topY = -sizeY / 2;

  ctx.save();
  ctx.strokeStyle = glowColor;
  ctx.fillStyle = glowColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 9;

  if (acc === 'horns') {
    const hx = sizeX * 0.26, hy = sizeY * 0.17;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * hx, topY + 1);
      ctx.lineTo(s * hx + s * sizeX * 0.11, topY - hy);
      ctx.lineTo(s * hx + s * sizeX * 0.06, topY + 1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (acc === 'catEars') {
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
  } else if (acc === 'glasses') {
    const eyeY = -sizeY * 0.05;
    const eyeSpacing = sizeX * 0.28;
    const gR = sizeX * 0.145;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * eyeSpacing * 0.5, eyeY, gR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-eyeSpacing * 0.5 + gR, eyeY);
    ctx.lineTo(eyeSpacing * 0.5 - gR, eyeY);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * eyeSpacing * 0.5 + s * gR, eyeY);
      ctx.lineTo(s * eyeSpacing * 0.5 + s * (gR + sizeX * 0.12), eyeY + sizeY * 0.05);
      ctx.stroke();
    }
  }

  ctx.restore();
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