export const MAX_SLIME_LEVEL = 128;
export const BLAST_RADIUS = 150;
export const BLAST_FORCE_MULTIPLIER = 0.055;
export const MERGE_COOLDOWN = 100;

const BASE_CONFIGS = [
  {
    level: 1,
    name: 'Micro Slime',
    radius: 18,
    chamfer: 6,
    color: '#00f0ff',
    glowColor: '#00f0ff',
    glowBlur: 15,
    density: 0.004,
    restitution: 0.2,
    friction: 0.35,
    scoreValue: 10
  },
  {
    level: 2,
    name: 'Tiny Slime',
    radius: 24,
    chamfer: 8,
    color: '#00ff38',
    glowColor: '#00ff38',
    glowBlur: 15,
    density: 0.005,
    restitution: 0.18,
    friction: 0.4,
    scoreValue: 30
  },
  {
    level: 3,
    name: 'Small Slime',
    radius: 31,
    chamfer: 10,
    color: '#ccff00',
    glowColor: '#ccff00',
    glowBlur: 18,
    density: 0.006,
    restitution: 0.15,
    friction: 0.45,
    scoreValue: 60
  },
  {
    level: 4,
    name: 'Medium Slime',
    radius: 39,
    chamfer: 12,
    color: '#ff7700',
    glowColor: '#ff7700',
    glowBlur: 20,
    density: 0.008,
    restitution: 0.12,
    friction: 0.5,
    scoreValue: 120
  },
  {
    level: 5,
    name: 'Large Slime',
    radius: 48,
    chamfer: 14,
    color: '#ff00a0',
    glowColor: '#ff00a0',
    glowBlur: 22,
    density: 0.01,
    restitution: 0.1,
    friction: 0.55,
    scoreValue: 250
  },
  {
    level: 6,
    name: 'Mega Slime',
    radius: 60,
    chamfer: 16,
    color: '#bd00ff',
    glowColor: '#bd00ff',
    glowBlur: 30,
    density: 0.014,
    restitution: 0.08,
    friction: 0.6,
    scoreValue: 500
  }
];

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function makeConfig(level) {
  const legendary = level >= MAX_SLIME_LEVEL;

  let radius;
  if (level <= 6) {
    radius = BASE_CONFIGS[level - 1].radius;
  } else {
    radius = Math.min(86, Math.round(60 * Math.pow(1.045, level - 6)));
  }

  if (level % 10 === 0) {
    radius = Math.round(radius * 0.82);
  }

  const chamfer = Math.round(Math.min(24, Math.max(10, radius * 0.32)));
  const hue = (level * 137.508) % 360;

  return {
    level,
    name: legendary ? 'Prism Slime' : `Neon Cub-${level}`,
    radius,
    chamfer,
    color: legendary ? '#ffffff' : hslToHex(hue, 92, 58),
    glowColor: legendary ? '#ffffff' : hslToHex(hue, 100, 62),
    glowBlur: Math.min(45, 30 + (level - 6) * 0.6),
    density: Math.min(0.02, 0.014 + (level - 6) * 0.00006),
    restitution: Math.max(0.02, 0.06 - (level - 6) * 0.0002),
    friction: Math.min(0.8, 0.6 + (level - 6) * 0.002),
    scoreValue: Math.round(500 * Math.pow(1.12, level - 6)),
    legendary
  };
}

export const SLIME_CONFIGS = [
  ...BASE_CONFIGS,
  ...Array.from(
    { length: MAX_SLIME_LEVEL - BASE_CONFIGS.length },
    (_, i) => makeConfig(BASE_CONFIGS.length + 1 + i)
  )
];

export function getSlimeConfig(level) {
  const index = Math.min(Math.max(level, 1), SLIME_CONFIGS.length) - 1;
  return SLIME_CONFIGS[index];
}

export function getRandomSlimeConfig() {
  return SLIME_CONFIGS[Math.floor(Math.random() * SLIME_CONFIGS.length)];
}