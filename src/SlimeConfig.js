export const MAX_SLIME_LEVEL = 128;
export const BLAST_RADIUS = 150;
export const BLAST_FORCE_MULTIPLIER = 0.008;
export const MERGE_COOLDOWN = 100;

export const IRIDESCENT_LEVEL = 12;
export const GOLDEN_LEVEL = 9;

const LEVEL_THEMES = {
  1: { color: '#00e8ff', glow: '#5af0ff' }, // starter (neon cyan accent)
  2: { color: '#14ff62', glow: '#74ff90' }, // Neon Green
  3: { color: '#b6ff30', glow: '#e8ff6d' }, // Lime
  4: { color: '#ff9426', glow: '#ffc46e' }, // Orange
  5: { color: '#ff3399', glow: '#ff7ec9' }, // Hot Pink
  6: { color: '#a04bff', glow: '#c995ff' }, // Purple
  7: { color: '#2f7bff', glow: '#6fb2ff' }, // Electric Blue
  8: { color: '#29e0ff', glow: '#7df0ff', aura: 0.4 }, // Cyan — subtle aura from here
  9: { color: '#ffd54e', glow: '#ffec9e', aura: 0.7, golden: true }, // Golden milestone
  10: { color: '#ff5757', glow: '#ff958a', aura: 0.85 }, // Coral/Red
  11: { color: '#ff4bd6', glow: '#ff8aee', aura: 1 } // Violet/Magenta
};

const BASE_CONFIGS = [
  { level: 1, name: 'Micro Slime', radius: 18.9, chamfer: 6, density: 0.003, restitution: 0.1, friction: 0.25, scoreValue: 10 },
  { level: 2, name: 'Tiny Slime', radius: 25.2, chamfer: 8, density: 0.004, restitution: 0.1, friction: 0.3, scoreValue: 30 },
  { level: 3, name: 'Small Slime', radius: 32.55, chamfer: 10, density: 0.005, restitution: 0.1, friction: 0.35, scoreValue: 60 },
  { level: 4, name: 'Medium Slime', radius: 40.95, chamfer: 12, density: 0.006, restitution: 0.1, friction: 0.4, scoreValue: 120 },
  { level: 5, name: 'Large Slime', radius: 50.4, chamfer: 14, density: 0.01, restitution: 0.08, friction: 0.55, scoreValue: 250 },
  { level: 6, name: 'Mega Slime', radius: 63, chamfer: 16, density: 0.014, restitution: 0.08, friction: 0.6, scoreValue: 500 }
];

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function buildVisuals(level) {
  const legendary = level >= MAX_SLIME_LEVEL;
  const iridescent = level >= IRIDESCENT_LEVEL;
  const theme = LEVEL_THEMES[level];

  let baseHue;
  let color;
  let glowColor;
  if (legendary) {
    baseHue = 40;
    color = '#ffffff';
    glowColor = 'hsl(40, 100%, 64%)';
  } else if (iridescent) {
    baseHue = (level * 23) % 360;
    color = hslToHex(baseHue, 86, 58);
    glowColor = hslToHex(baseHue, 98, 64);
  } else if (theme) {
    color = theme.color;
    glowColor = theme.glow;
  } else {
    baseHue = (level * 137.508) % 360;
    color = hslToHex(baseHue, 86, 58);
    glowColor = hslToHex(baseHue, 96, 63);
  }

  let glowBlur = Math.min(55, 14 + level * 1.9);
  if (theme && theme.golden) glowBlur += 6;
  if (iridescent) glowBlur += 4;

  return {
    color,
    glowColor,
    glowBlur,
    baseHue,
    legendary,
    iridescent,
    golden: !!(theme && theme.golden),
    aura: (theme && theme.aura) || (iridescent ? 1 : 0)
  };
}

function makeConfig(level) {
  let radius;
  if (level <= 6) {
    radius = BASE_CONFIGS[level - 1].radius;
  } else {
    radius = Math.min(90, Math.round(63 * Math.pow(1.045, level - 6)));
  }

  if (level % 10 === 0) {
    radius = Math.round(radius * 0.82);
  }

  const chamfer = Math.round(Math.min(24, Math.max(10, radius * 0.32)));
  const legendary = level >= MAX_SLIME_LEVEL;

  return {
    level,
    name: legendary ? 'Prism Slime' : (LEVEL_THEMES[level] && LEVEL_THEMES[level].golden ? 'Golden Slime' : `Neon Cub-${level}`),
    radius,
    chamfer,
    density: Math.min(0.02, 0.014 + (level - 6) * 0.00006),
    restitution: 0.08,
    friction: Math.min(0.8, 0.6 + (level - 6) * 0.002),
    scoreValue: Math.round(500 * Math.pow(1.12, level - 6))
  };
}

export const SLIME_CONFIGS = Array.from({ length: MAX_SLIME_LEVEL }, (_, i) => {
  const level = i + 1;
  const base = level <= BASE_CONFIGS.length ? { ...BASE_CONFIGS[i] } : makeConfig(level);
  return { ...base, ...buildVisuals(level) };
});

export function getSlimeConfig(level) {
  const index = Math.min(Math.max(level, 1), SLIME_CONFIGS.length) - 1;
  return SLIME_CONFIGS[index];
}

export function getRandomSlimeConfig() {
  return SLIME_CONFIGS[Math.floor(Math.random() * SLIME_CONFIGS.length)];
}