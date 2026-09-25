export const MAX_SLIME_LEVEL = 128;
export const BLAST_RADIUS = 150;
export const BLAST_FORCE_MULTIPLIER = 0.008;
export const MERGE_COOLDOWN = 100;

export const IRIDESCENT_LEVEL = 12;
export const GOLDEN_LEVEL = 9;

const LEVEL_THEMES = {
  1: { color: '#00e8ff', glow: '#5af0ff' }, // starter (neon cyan accent)
  2: { color: '#14ff62', glow: '#74ff90' }, // Neon Green
  3: { color: '#ffdf1f', glow: '#fff07a' }, // Yellow
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
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    from: 6,
    to: 11,
    levels: {
      6: 'turtle',
      7: 'lion',
      8: 'zebra',
      9: 'monkey',
      10: 'elephant',
      11: 'flamingo'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    from: 6,
    to: 8,
    levels: {
      6: 'octopus',
      7: 'crabby',
      8: 'squid'
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

const ANIMALS = {
  turtle: {
    name: 'Froggy',
    base: '#61E375',
    dark: '#2CB843',
    light: '#A8FFB5',
    rim: '#84FF96',
    glow: '#5DFF74',
    aura: 0.55,
    glowBlur: 44,
    surface: 'smooth',
    features: {
      belly: { x: 0, y: 0.2, width: 0.68, height: 0.48, color: '#DCFFDF' },
      ears: [
        { x: -0.31, y: -0.44, r: 0.19, color: '#61E375', innerColor: '#A8FFB5' },
        { x: 0.31, y: -0.44, r: 0.19, color: '#61E375', innerColor: '#A8FFB5' }
      ],
      cheeks: [
        { x: -0.31, y: 0.12, r: 0.095, color: '#FF9EBF' },
        { x: 0.31, y: 0.12, r: 0.095, color: '#FF9EBF' }
      ],
      mouth: { type: 'smile', x: 0, y: 0.1, width: 0.22, height: 0.1, strokeColor: '#1B6327', lineWidth: 3 },
      eyeStyle: { width: 0.16, height: 0.22, pupilColor: '#1A291E', highlights: true },
      eyeOffset: { x: 0.31, y: -0.43 }
    }
  },
  lion: {
    name: 'Teddy Bear',
    base: '#FF9E3B',
    dark: '#C86200',
    light: '#FFCB8B',
    rim: '#FFB860',
    glow: '#FFA642',
    aura: 0.55,
    glowBlur: 46,
    surface: 'smooth',
    features: {
      ears: [
        { x: -0.38, y: -0.42, r: 0.19, color: '#FF9E3B', innerColor: '#FFCB8B' },
        { x: 0.38, y: -0.42, r: 0.19, color: '#FF9E3B', innerColor: '#FFCB8B' }
      ],
      snout: { x: 0, y: 0.12, width: 0.44, height: 0.3, color: '#FFE0B8', noseColor: '#4A2500', noseSize: 0.075 },
      cheeks: [
        { x: -0.35, y: 0.08, r: 0.085, color: '#FF8585' },
        { x: 0.35, y: 0.08, r: 0.085, color: '#FF8585' }
      ],
      mouth: { type: 'bear_snout', x: 0, y: 0.16, strokeColor: '#4A2500' },
      eyeStyle: { width: 0.15, height: 0.2, pupilColor: '#2B1400', highlights: true },
      eyeOffset: { x: 0.22, y: -0.1 }
    }
  },
  zebra: {
    name: 'Chick',
    base: '#FFDC43',
    dark: '#C99E00',
    light: '#FFF09E',
    rim: '#FFE66F',
    glow: '#FFDF4D',
    aura: 0.55,
    glowBlur: 44,
    surface: 'smooth',
    features: {
      tuft: [
        { x: 0, y: -0.48, r: 0.13, color: '#FFDC43' },
        { x: -0.1, y: -0.44, r: 0.1, color: '#FFDC43' },
        { x: 0.1, y: -0.44, r: 0.1, color: '#FFDC43' }
      ],
      wings: [
        { x: -0.43, y: 0.02, rx: 0.13, ry: 0.22, angle: -18, color: '#FFC928' },
        { x: 0.43, y: 0.02, rx: 0.13, ry: 0.22, angle: 18, color: '#FFC928' }
      ],
      beak: { x: 0, y: 0.08, width: 0.17, height: 0.12, color: '#FF8A00' },
      cheeks: [
        { x: -0.32, y: 0.1, r: 0.095, color: '#FF889B' },
        { x: 0.32, y: 0.1, r: 0.095, color: '#FF889B' }
      ],
      eyeStyle: { width: 0.18, height: 0.24, pupilColor: '#261C00', highlights: true },
      eyeOffset: { x: 0.24, y: -0.12 }
    }
  },
  monkey: {
    name: 'Bunny',
    base: '#FF94B9',
    dark: '#C7386B',
    light: '#FFC8DC',
    rim: '#FFAEC8',
    glow: '#FF8CB4',
    aura: 0.58,
    glowBlur: 46,
    surface: 'smooth',
    features: {
      ears: [
        { x: -0.28, y: -0.56, rx: 0.105, ry: 0.25, color: '#FF94B9', innerColor: '#FFC8DC' },
        { x: 0.28, y: -0.56, rx: 0.105, ry: 0.25, color: '#FF94B9', innerColor: '#FFC8DC' }
      ],
      snout: { x: 0, y: 0.1, width: 0.31, height: 0.22, color: '#FFF0F6', noseColor: '#FF548E', noseSize: 0.06 },
      cheeks: [
        { x: -0.32, y: 0.12, r: 0.09, color: '#FF548E' },
        { x: 0.32, y: 0.12, r: 0.09, color: '#FF548E' }
      ],
      tail: { x: 0.48, y: 0.3, r: 0.14, color: '#FFC8DC' },
      eyeStyle: { width: 0.16, height: 0.22, pupilColor: '#30101C', highlights: true },
      eyeOffset: { x: 0.22, y: -0.12 }
    }
  },
  elephant: {
    name: 'Birdie',
    base: '#4DE1FF',
    dark: '#128BB5',
    light: '#B2F4FF',
    rim: '#7EEAFF',
    glow: '#45DDFF',
    aura: 0.55,
    glowBlur: 44,
    surface: 'smooth',
    features: {
      belly: { x: 0, y: 0.22, width: 0.65, height: 0.48, color: '#FFFFFF' },
      wings: [
        { x: -0.43, y: 0.03, rx: 0.13, ry: 0.21, angle: -18, color: '#25BBD9' },
        { x: 0.43, y: 0.03, rx: 0.13, ry: 0.21, angle: 18, color: '#25BBD9' }
      ],
      beak: { x: 0, y: 0.06, width: 0.15, height: 0.1, color: '#FF9E2C' },
      cheeks: [
        { x: -0.3, y: 0.08, r: 0.08, color: '#FF88B8' },
        { x: 0.3, y: 0.08, r: 0.08, color: '#FF88B8' }
      ],
      eyeStyle: { width: 0.16, height: 0.22, pupilColor: '#0B2933', highlights: true },
      eyeOffset: { x: 0.23, y: -0.12 }
    }
  },
  flamingo: {
    name: 'Bee',
    base: '#FFCE3B',
    dark: '#B88B00',
    light: '#FFE794',
    rim: '#FFDA66',
    glow: '#FFCC2F',
    aura: 0.65,
    glowBlur: 50,
    surface: 'smooth',
    features: {
      antenna: [
        { x: -0.2, y: -0.48, rx: 0.03, ry: 0.12, color: '#332300', ballR: 0.06 },
        { x: 0.2, y: -0.48, rx: 0.03, ry: 0.12, color: '#332300', ballR: 0.06 }
      ],
      stripes: [
        { y: -0.12, height: 0.1, color: '#332300' },
        { y: 0.1, height: 0.1, color: '#332300' }
      ],
      wings: [
        { x: -0.48, y: -0.1, rx: 0.14, ry: 0.22, angle: -25, color: 'rgba(255, 255, 255, 0.72)' },
        { x: 0.48, y: -0.1, rx: 0.14, ry: 0.22, angle: 25, color: 'rgba(255, 255, 255, 0.72)' }
      ],
      cheeks: [
        { x: -0.3, y: 0.12, r: 0.09, color: '#FF7D7D' },
        { x: 0.3, y: 0.12, r: 0.09, color: '#FF7D7D' }
      ],
      mouth: { type: 'smile', x: 0, y: 0.12, width: 0.18, height: 0.08, strokeColor: '#332300', lineWidth: 3 },
      eyeStyle: { width: 0.16, height: 0.22, pupilColor: '#261A00', highlights: true },
      eyeOffset: { x: 0.22, y: -0.1 }
    }
  }
};

const FISH = {
  octopus: {
    name: 'Octo',
    base: '#FF5C8D',
    dark: '#B82350',
    light: '#FFB8D0',
    rim: '#FF8DAF',
    glow: '#FF477E',
    aura: 0.65,
    glowBlur: 50,
    surface: 'smooth',
    features: {
      cheeks: [
        { x: -0.32, y: 0.08, r: 0.09, color: '#FF2A6D' },
        { x: 0.32, y: 0.08, r: 0.09, color: '#FF2A6D' }
      ],
      mouth: { type: 'small_o', x: 0, y: 0.12, width: 0.12, height: 0.12, strokeColor: '#7A1031', lineWidth: 3 },
      tentacles: [
        { x: 0, y: 0.42, r: 0.075, color: '#D62861' },
        { x: -0.13, y: 0.4, r: 0.07, color: '#E03168' },
        { x: 0.13, y: 0.4, r: 0.07, color: '#E03168' },
        { x: -0.24, y: 0.36, r: 0.06, color: '#A31242' },
        { x: 0.24, y: 0.36, r: 0.06, color: '#A31242' }
      ],
      eyeStyle: { width: 0.17, height: 0.23, pupilColor: '#380515' },
      eyeOffset: { x: 0.22, y: -0.12 }
    }
  },
  crabby: {
    name: 'Crabby',
    base: '#FF5252',
    dark: '#B31212',
    light: '#FFB0B0',
    rim: '#FF7D7D',
    glow: '#FF3838',
    aura: 0.6,
    glowBlur: 48,
    surface: 'smooth',
    features: {
      claws: [
        { x: -0.34, y: 0.12, rx: 0.09, ry: 0.16, angle: -40, color: '#FF7D7D' },
        { x: 0.34, y: 0.12, rx: 0.09, ry: 0.16, angle: 40, color: '#FF7D7D' }
      ],
      legs: [
        { x: -0.26, y: 0.38, rx: 0.055, ry: 0.15, angle: -20, color: '#FF7D7D' },
        { x: 0.26, y: 0.38, rx: 0.055, ry: 0.15, angle: 20, color: '#FF7D7D' },
        { x: -0.13, y: 0.4, rx: 0.055, ry: 0.15, angle: -10, color: '#FF7D7D' },
        { x: 0.13, y: 0.4, rx: 0.055, ry: 0.15, angle: 10, color: '#FF7D7D' }
      ],
      cheeks: [
        { x: -0.3, y: 0.08, r: 0.08, color: '#FF1F1F' },
        { x: 0.3, y: 0.08, r: 0.08, color: '#FF1F1F' }
      ],
      mouth: { type: 'smile', x: 0, y: 0.14, width: 0.18, height: 0.08, strokeColor: '#6B0000', lineWidth: 3 },
      eyeStyle: { width: 0.16, height: 0.22, pupilColor: '#2B0000' },
      eyeOffset: { x: 0.22, y: -0.12 }
    }
  },
  squid: {
    name: 'Squiddy',
    base: '#A78BFA',
    dark: '#5B21B6',
    light: '#E9D5FF',
    rim: '#C4B5FD',
    glow: '#8B5CF6',
    aura: 0.7,
    glowBlur: 52,
    surface: 'smooth',
    features: {
      hatFin: [
        { x: -0.24, y: -0.5, rx: 0.1, ry: 0.2, angle: -35, color: '#A78BFA' },
        { x: 0.24, y: -0.5, rx: 0.1, ry: 0.2, angle: 35, color: '#A78BFA' }
      ],
      belly: { x: 0, y: 0.18, width: 0.52, height: 0.36, color: '#F3E8FF' },
      tentacles: [
        { x: 0, y: 0.42, width: 0.05, height: 0.28, color: '#A78BFA' },
        { x: -0.13, y: 0.4, width: 0.04, height: 0.24, color: '#7C5CF0' },
        { x: 0.13, y: 0.4, width: 0.04, height: 0.24, color: '#7C5CF0' }
      ],
      mouth: { type: 'tiny_smile', x: 0, y: 0.12, width: 0.12, height: 0.06, strokeColor: '#4C1D95', lineWidth: 2.5 },
      eyeStyle: { width: 0.18, height: 0.24, pupilColor: '#1E1B4B' },
      eyeOffset: { x: 0.24, y: -0.12 }
    }
  }
};

const BASE_CONFIGS = [
  { level: 1, name: 'Micro Slime', radius: 19.845, chamfer: 6, density: 0.003, restitution: 0.1, friction: 0.25, scoreValue: 10 },
  { level: 2, name: 'Tiny Slime', radius: 26.46, chamfer: 8, density: 0.004, restitution: 0.1, friction: 0.3, scoreValue: 30 },
  { level: 3, name: 'Small Slime', radius: 34.18, chamfer: 10, density: 0.005, restitution: 0.1, friction: 0.35, scoreValue: 60 },
  { level: 4, name: 'Medium Slime', radius: 43.0, chamfer: 12, density: 0.006, restitution: 0.1, friction: 0.4, scoreValue: 120 },
  { level: 5, name: 'Large Slime', radius: 52.92, chamfer: 14, density: 0.01, restitution: 0.08, friction: 0.55, scoreValue: 250 },
  { level: 6, name: 'Mega Slime', radius: 66.15, chamfer: 16, density: 0.014, restitution: 0.08, friction: 0.6, scoreValue: 500 }
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

function buildVisuals(level, noPlanet) {
  const legendary = level >= MAX_SLIME_LEVEL;
  const planetKey = !noPlanet && (level >= COLLECTIONS.solarSystem.from && level <= COLLECTIONS.solarSystem.to)
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
    radius = Math.min(95, Math.round(66.15 * Math.pow(1.045, level - 6)));
  }

  if (level % 10 === 0) {
    radius = Math.round(radius * 0.82);
  }

  const chamfer = Math.round(Math.min(24, Math.max(10, radius * 0.32)));
  const legendary = level >= MAX_SLIME_LEVEL;

  // Физика тяжести после 6 уровня: масса растёт экспоненциально,
  // чтобы маленькие слаймы не могли легко сдвинуть крупные
  const density = Math.min(0.09, 0.015 * Math.pow(1.12, level - 6));
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
  const cfg = { ...base, ...buildVisuals(level) };
  if (cfg.isPlanet) cfg.radius = Math.round(cfg.radius * 0.9);
  return cfg;
});

function buildAnimalVisuals(level, key) {
  const a = ANIMALS[key];
  return {
    color: a.base,
    glowColor: a.glow,
    glowBlur: a.glowBlur,
    darkColor: a.dark,
    lightColor: a.light,
    rimColor: a.rim,
    aura: a.aura,
    visualStyle: 'animal',
    particleType: null,
    innerCore: true,
    legendary: false,
    iridescent: false,
    golden: false,
    collection: 'animals',
    planet: null,
    isPlanet: false,
    isAnimal: true,
    surface: a.surface,
    ring: false,
    palette: a,
    features: a.features || null,
    name: a.name,
    animal: key
  };
}

const THEMED_CONFIGS = new Map();

function buildFishVisuals(level, key) {
  const f = FISH[key];
  return {
    color: f.base,
    glowColor: f.glow,
    glowBlur: f.glowBlur,
    darkColor: f.dark,
    lightColor: f.light,
    rimColor: f.rim,
    aura: f.aura,
    visualStyle: 'animal',
    particleType: null,
    innerCore: true,
    legendary: false,
    iridescent: false,
    golden: false,
    collection: 'ocean',
    planet: null,
    isPlanet: false,
    isAnimal: true,
    surface: f.surface,
    ring: false,
    palette: f,
    features: f.features || null,
    name: f.name,
    animal: key
  };
}

function themedConfig(level, themeId) {
  const key = `${themeId}:${level}`;
  let cfg = THEMED_CONFIGS.get(key);
  if (cfg) return cfg;

  const base = level <= BASE_CONFIGS.length ? { ...BASE_CONFIGS[level - 1] } : makeConfig(level);
  const animalKey = themeId === 'animals' ? COLLECTIONS.animals.levels[level] : null;
  const fishKey = themeId === 'ocean' ? COLLECTIONS.ocean.levels[level] : null;

  if (animalKey) {
    cfg = { ...base, ...buildAnimalVisuals(level, animalKey) };
  } else if (fishKey) {
    cfg = { ...base, ...buildFishVisuals(level, fishKey) };
  } else if (themeId === 'animals' || themeId === 'ocean') {
    cfg = { ...base, ...buildVisuals(level, true) };
  } else {
    cfg = { ...base, ...buildVisuals(level) };
    if (cfg.isPlanet) cfg.radius = Math.round(cfg.radius * 0.9);
  }

  THEMED_CONFIGS.set(key, cfg);
  return cfg;
}

let activeTheme = null;

export function setActiveTheme(themeId) {
  activeTheme = themeId || null;
}

export function getSlimeConfig(level, themeId) {
  const index = Math.min(Math.max(level, 1), SLIME_CONFIGS.length);
  const effective = themeId || activeTheme;
  if (effective && effective !== 'space') {
    return themedConfig(index, effective);
  }
  return SLIME_CONFIGS[index - 1];
}

export function getRandomSlimeConfig() {
  return SLIME_CONFIGS[Math.floor(Math.random() * SLIME_CONFIGS.length)];
}

export function getCollectionName(level, themeId) {
  const collection = COLLECTIONS[themeId];
  if (collection && level >= collection.from && level <= collection.to) return collection.name;
  for (const item of Object.values(COLLECTIONS)) {
    if (level >= item.from && level <= item.to) return item.name;
  }
  return null;
}

export function collectionLevels(themeId) {
  const collection = COLLECTIONS[themeId] || COLLECTIONS.solarSystem;
  return collection.levels;
}