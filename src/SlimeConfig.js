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
  5: { color: '#ff3399', glow: '#ff7ec9' } // Hot Pink
};

export const COLLECTIONS = {
  solarSystem: {
    id: 'solar-system',
    name: 'Solar System',
    from: 6,
    to: 14,
    levels: {
      6: 'mercury',
      7: 'venus',
      8: 'earth',
      9: 'mars',
      10: 'jupiter',
      11: 'saturn',
      12: 'uranus',
      13: 'neptune',
      14: 'sun'
    }
  }
};

const PLANETS = {
  mercury: { name: 'Mercury', base: '#8A8F98', dark: '#4f545b', light: '#d3d8df', rim: '#6ef4ff', glow: '#bcd4ff', surface: 'craters', aura: 0.2, glowBlur: 40 },
  venus: { name: 'Venus', base: '#E8B85A', dark: '#8a5c22', light: '#ffefa8', rim: '#ffe08a', glow: '#ffd97a', surface: 'clouds', aura: 0.4, glowBlur: 44 },
  earth: { name: 'Earth', base: '#3D9BE9', dark: '#174c8c', light: '#a2daff', rim: '#8ef5ff', glow: '#7fc8ff', surface: 'continents', aura: 0.45, glowBlur: 46 },
  mars: { name: 'Mars', base: '#D95B45', dark: '#6f2a1e', light: '#ff9f7e', rim: '#ffb59a', glow: '#ff9d7a', surface: 'rocky', aura: 0.5, glowBlur: 46 },
  jupiter: { name: 'Jupiter', base: '#D8A36A', dark: '#64432a', light: '#ffe4b8', rim: '#ffcf8a', glow: '#ffc97e', surface: 'bands', aura: 0.6, glowBlur: 50 },
  saturn: { name: 'Saturn', base: '#D6B875', dark: '#77603a', light: '#ffefc4', rim: '#ffe9a8', glow: '#ffe2a0', surface: 'bands', ring: true, aura: 0.5, glowBlur: 48 },
  uranus: { name: 'Uranus', base: '#76D9E8', dark: '#2b7d93', light: '#c9f8ff', rim: '#9fefff', glow: '#9feaff', surface: 'smooth', ring: true, aura: 0.45, glowBlur: 46 },
  neptune: { name: 'Neptune', base: '#356BD6', dark: '#14295e', light: '#7fb0ff', rim: '#6fb6ff', glow: '#7fb6ff', surface: 'storm', aura: 0.7, glowBlur: 52 },
  sun: { name: 'Sun', base: '#FFC83D', dark: '#c5761b', light: '#fff3a6', rim: '#fff7cc', glow: '#ffb347', surface: 'corona', aura: 1, glowBlur: 60, particles: 'solar_flare' }
};

const PLANET_BANDS = {
  jupiter: ['#e8c291', '#c7874c', '#a5633e', '#e2bc8e', '#b27147', '#d8a36a'],
  saturn: ['#e8d7a0', '#cbb67a', '#e2ce93', '#bfa76a', '#d6c088']
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
  const planetKey = (level >= COLLECTIONS.solarSystem.from && level <= COLLECTIONS.solarSystem.to)
    ? COLLECTIONS.solarSystem.levels[level]
    : null;
  const planet = planetKey ? PLANETS[planetKey] : null;
  const iridescent = !planet && level >= IRIDESCENT_LEVEL;
  const theme = LEVEL_THEMES[level];

  let baseHue;
  let color;
  let glowColor;

  if (planet) {
    color = planet.base;
    glowColor = planet.glow;
  } else if (legendary) {
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

  let glowBlur = planet
    ? planet.glowBlur
    : Math.min(55, 14 + level * 1.9) + (theme && theme.golden ? 6 : 0) + (iridescent ? 4 : 0);

  let visualStyle = planet ? 'planet' : (theme && theme.visualStyle) || (legendary ? 'singularity' : iridescent ? 'iridescent' : 'solid');
  let particleType = planet ? (planet.particles || null) : (theme && theme.particles) || (legendary ? 'hyper_sparkles' : iridescent ? 'prism_shimmer' : null);
  let innerCore = planet ? true : !!(theme && (theme.innerCore)) || legendary || iridescent;

  return {
    color,
    glowColor,
    glowBlur,
    baseHue,
    legendary,
    iridescent,
    golden: !!(theme && theme.golden),
    aura: planet ? (planet.aura || 0) : (theme && theme.aura) || (iridescent ? 1 : 0),
    visualStyle,
    particleType,
    innerCore,
    collection: planet ? 'solarSystem' : null,
    planet: planetKey,
    isPlanet: !!planet,
    surface: planet ? planet.surface : null,
    ring: planet ? !!planet.ring : false,
    palette: planet ? planet : null,
    ...(planet ? { name: planet.name } : {})
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

  // Физика тяжести после 6 уровня: масса и трение растут умеренно, отскок гасится
  const density = Math.min(0.03, 0.015 + (level - 6) * 0.0003);
  const restitution = Math.max(0.01, 0.07 - (level - 6) * 0.005);
  const friction = Math.min(0.85, 0.62 + (level - 6) * 0.004);

  return {
    level,
    name: legendary ? 'Prism Slime' : (LEVEL_THEMES[level] && LEVEL_THEMES[level].golden ? 'Golden Slime' : `Neon Cub-${level}`),
    radius,
    chamfer,
    density,
    restitution,
    friction,
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

export function getCollectionName(level) {
  for (const collection of Object.values(COLLECTIONS)) {
    if (level >= collection.from && level <= collection.to) return collection.name;
  }
  return null;
}