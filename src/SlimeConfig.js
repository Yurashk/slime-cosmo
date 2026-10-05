export const MAX_SLIME_LEVEL = 128;
export const BLAST_RADIUS = 150;
export const BLAST_FORCE_MULTIPLIER = 0.008;
export const MERGE_COOLDOWN = 100;

export const IRIDESCENT_LEVEL = 12;
export const GOLDEN_LEVEL = 9;

const LEVEL_THEMES = {
  1: { color: '#00f0ff', glow: '#8ff9ff', visualStyle: 'solid', innerCore: true, aura: 0.5 }, // starter (neon cyan accent)
  2: { color: '#0dff4f', glow: '#8dffab', visualStyle: 'solid', innerCore: true, aura: 0.55 }, // Neon Green
  3: { color: '#ffd400', glow: '#fff38c', visualStyle: 'solid', innerCore: true, aura: 0.6 }, // Yellow
  4: { color: '#ff7a12', glow: '#ffc98a', visualStyle: 'solid', innerCore: true, aura: 0.65 }, // Orange
  5: { color: '#ff1f7a', glow: '#ff9ad2', visualStyle: 'solid', innerCore: true, aura: 0.7 }  // Hot Pink
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
    name: 'Emoji',
    from: 6,
    to: 10,
    levels: {
      6: 'heart',
      7: 'fire',
      8: 'devil',
      9: 'angel',
      10: 'surprised'
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
  sun: { name: 'Sun', base: '#FFC83D', dark: '#c5761b', light: '#fff3a6', rim: '#fff7cc', glow: '#ffb347', surface: 'corona', aura: 1, glowBlur: 60, particles: 'solar_flare', golden: true }
};

const PLANET_BANDS = {
  jupiter: ['#e8c291', '#c7874c', '#a5633e', '#e2bc8e', '#b27147', '#d8a36a'],
  saturn: ['#e8d7a0', '#cbb67a', '#e2ce93', '#bfa76a', '#d6c088']
};

// sway: { amp, speed, phase?, mirror? } на ушах, крыльях, усиках, перьях и жале —
// деталь покачивается на amp градусов; левая/правая зеркалятся, если mirror !== false.
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
      belly: {
        x: 0, y: 0.16, width: 0.8, height: 0.6,
        gradient: { from: '#F6FFFA', fromAlpha: 1, mid: '#D8F7E1', midAlpha: 0.95, midAt: 0.62, to: '#B4EEC6', toAlpha: 0 }
      },
      spots: [
        { x: -0.2, y: -0.16, r: 0.055, color: '#2CB843', alpha: 0.32 },
        { x: 0.14, y: -0.26, r: 0.042, color: '#2CB843', alpha: 0.28 },
        { x: 0.28, y: 0.02, r: 0.05, color: '#2CB843', alpha: 0.28 },
        { x: -0.3, y: 0.06, r: 0.036, color: '#2CB843', alpha: 0.24 }
      ],
      earEdge: '#1B6327',
      ears: [
        { x: -0.24, y: -0.27, r: 0.12, color: '#5ADA70', innerColor: '#C8FFD4', edgeColor: '#1B6327', edgeAlpha: 0.7 },
        { x: 0.24, y: -0.27, r: 0.12, color: '#5ADA70', innerColor: '#C8FFD4', edgeColor: '#1B6327', edgeAlpha: 0.7 }
      ],
      nostrils: [
        { x: -0.075, y: -0.03, r: 0.022, color: '#1B6327' },
        { x: 0.075, y: -0.03, r: 0.022, color: '#1B6327' }
      ],
      mouth: { type: 'wide_smile', x: 0, y: 0.06, width: 0.5, height: 0.13, strokeColor: '#08330F', alpha: 1, lineWidth: 3.6, halo: '#F7FFFA', haloAlpha: 0.95, haloSpread: 4.5 },
      cheeks: [
        { x: -0.34, y: -0.17, r: 0.13, color: '#FF6E9E', alpha: 1, soft: true, softStop: 0.32, softMid: 0.55 },
        { x: 0.34, y: -0.17, r: 0.13, color: '#FF6E9E', alpha: 1, soft: true, softStop: 0.32, softMid: 0.55 }
      ],
      feet: [
        { x: -0.2, y: 0.33, rx: 0.115, ry: 0.065, angle: -16, color: '#4FD162', edgeColor: '#2CB843', edgeAlpha: 0.45, toes: 3, toeColor: '#1B6327' },
        { x: 0.2, y: 0.33, rx: 0.115, ry: 0.065, angle: 16, color: '#4FD162', edgeColor: '#2CB843', edgeAlpha: 0.45, toes: 3, toeColor: '#1B6327' }
      ],
      eyeStyle: { width: 0.185, height: 0.24, pupilColor: '#12301A', highlights: true },
      eyeOffset: { x: 0.235, y: -0.255 }
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
      mane: { color: '#FFD79E', count: 20, radiusOffset: -0.12, length: 0.1, width: 0.075, alpha: 0.9 },
      ears: [
        { x: -0.3, y: -0.33, r: 0.09, color: '#F09029', innerColor: '#FFCFA0', edgeColor: '#A85600', edgeAlpha: 0.5 },
        { x: 0.3, y: -0.33, r: 0.09, color: '#F09029', innerColor: '#FFCFA0', edgeColor: '#A85600', edgeAlpha: 0.5 }
      ],
      belly: { x: 0, y: 0.27, width: 0.54, height: 0.3, color: '#FFDCA8', edgeColor: '#A85600', edgeAlpha: 0.45 },
      snout: {
        x: 0, y: 0.14, width: 0.5, height: 0.36, color: '#FFE6C4', edgeColor: '#A85600', edgeAlpha: 0.5,
        muzzleColor: '#FFF8EC', muzzleAlpha: 0.75, noseColor: '#331600', noseSize: 0.052
      },
      cheeks: [
        { x: -0.35, y: 0.09, r: 0.095, color: '#FF8585', alpha: 0.5 },
        { x: 0.35, y: 0.09, r: 0.095, color: '#FF8585', alpha: 0.5 }
      ],
      mouth: { type: 'w_mouth', x: 0, y: 0.215, width: 0.15, height: 0.055, strokeColor: '#331600', lineWidth: 2.4 },
      feet: [
        { x: -0.19, y: 0.325, rx: 0.105, ry: 0.068, angle: -12, color: '#F09029', edgeColor: '#A85600', edgeAlpha: 0.45, toes: 3, toeColor: '#8A4300' },
        { x: 0.19, y: 0.325, rx: 0.105, ry: 0.068, angle: 12, color: '#F09029', edgeColor: '#A85600', edgeAlpha: 0.45, toes: 3, toeColor: '#8A4300' }
      ],
      eyeStyle: { width: 0.155, height: 0.205, pupilColor: '#241000', highlights: true },
      eyeOffset: { x: 0.23, y: -0.12 }
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
      belly: { x: 0, y: 0.23, width: 0.56, height: 0.36, color: '#FFFBE8', edgeColor: '#B8860B', edgeAlpha: 0.45 },
      crest: [
        { x: -0.08, y: -0.32, angle: -26, length: 0.11, width: 0.045, color: '#F07C00', tipColor: '#FFC928', sway: { amp: 7, speed: 0.005, mirror: false } },
        { x: 0, y: -0.35, angle: 0, length: 0.14, width: 0.05, color: '#F59300', tipColor: '#FFD84A', sway: { amp: 7, speed: 0.005, mirror: false } },
        { x: 0.08, y: -0.32, angle: 26, length: 0.11, width: 0.045, color: '#F07C00', tipColor: '#FFC928', sway: { amp: 7, speed: 0.005, mirror: false } }
      ],
      wings: [
        { x: -0.33, y: 0.1, rx: 0.11, ry: 0.165, angle: -20, color: '#F5A800', rimColor: '#A97400', rimAlpha: 0.5, veins: 2, veinColor: '#A97400', veinAlpha: 0.34, sway: { amp: 9, speed: 0.009 } },
        { x: 0.33, y: 0.1, rx: 0.11, ry: 0.165, angle: 20, color: '#F5A800', rimColor: '#A97400', rimAlpha: 0.5, veins: 2, veinColor: '#A97400', veinAlpha: 0.34, sway: { amp: 9, speed: 0.009 } }
      ],
      beak: { x: 0, y: 0.08, width: 0.22, height: 0.15, color: '#FF8A00', tipColor: '#C24A00' },
      nostrils: [
        { x: -0.045, y: -0.01, r: 0.018, color: '#B8860B' },
        { x: 0.045, y: -0.01, r: 0.018, color: '#B8860B' }
      ],
      cheeks: [
        { x: -0.32, y: 0.11, r: 0.1, color: '#FF889B', alpha: 0.55 },
        { x: 0.32, y: 0.11, r: 0.1, color: '#FF889B', alpha: 0.55 }
      ],
      feet: [
        { x: -0.145, y: 0.35, rx: 0.08, ry: 0.05, angle: -14, color: '#FF9E1B', edgeColor: '#C96A00', edgeAlpha: 0.7, toes: 3, toeColor: '#C96A00' },
        { x: 0.145, y: 0.35, rx: 0.08, ry: 0.05, angle: 14, color: '#FF9E1B', edgeColor: '#C96A00', edgeAlpha: 0.7, toes: 3, toeColor: '#C96A00' }
      ],
      eyeStyle: { width: 0.2, height: 0.26, pupilColor: '#1E1600', highlights: true },
      eyeOffset: { x: 0.25, y: -0.14 }
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
      belly: { x: 0, y: 0.26, width: 0.54, height: 0.32, color: '#FFDDE9', edgeColor: '#C7386B', edgeAlpha: 0.45 },
      earEdge: '#B32C5C',
      ears: [
        { x: -0.25, y: -0.28, rx: 0.08, ry: 0.13, color: '#FF94B9', innerColor: '#FF6FA0', sway: { amp: 6, speed: 0.004 } },
        { x: 0.25, y: -0.28, rx: 0.08, ry: 0.13, color: '#FF94B9', innerColor: '#FF6FA0', sway: { amp: 6, speed: 0.004 } }
      ],
      snout: {
        x: 0, y: 0.09, width: 0.34, height: 0.25, color: '#FFF4F8', edgeColor: '#C7386B', edgeAlpha: 0.45,
        noseColor: '#FF3D80', noseSize: 0.065
      },
      mouth: { type: 'w_mouth', x: 0, y: 0.2, width: 0.15, height: 0.06, strokeColor: '#7A1639', lineWidth: 2.6 },
      teeth: { x: 0, y: 0.29, width: 0.088, height: 0.078, color: '#FFFDF8', lineColor: '#7A1639', lineAlpha: 0.45 },
      whiskers: {
        color: '#4A0820', alpha: 0.9, width: 0.02,
        items: [
          { x1: -0.13, y1: 0.08, x2: -0.4, y2: 0.0, bend: -0.02 },
          { x1: -0.13, y1: 0.1, x2: -0.39, y2: 0.1, bend: -0.02 },
          { x1: -0.13, y1: 0.12, x2: -0.38, y2: 0.19, bend: -0.02 },
          { x1: 0.13, y1: 0.08, x2: 0.4, y2: 0.0, bend: 0.02 },
          { x1: 0.13, y1: 0.1, x2: 0.39, y2: 0.1, bend: 0.02 },
          { x1: 0.13, y1: 0.12, x2: 0.38, y2: 0.19, bend: 0.02 }
        ]
      },
      cheeks: [
        { x: -0.33, y: 0.12, r: 0.1, color: '#FF548E', alpha: 0.5 },
        { x: 0.33, y: 0.12, r: 0.1, color: '#FF548E', alpha: 0.5 }
      ],
      feet: [
        { x: -0.18, y: 0.335, rx: 0.1, ry: 0.065, angle: -10, color: '#FFB0CD', edgeColor: '#C7386B', edgeAlpha: 0.4, toes: 3, toeColor: '#C7386B' },
        { x: 0.18, y: 0.335, rx: 0.1, ry: 0.065, angle: 10, color: '#FFB0CD', edgeColor: '#C7386B', edgeAlpha: 0.4, toes: 3, toeColor: '#C7386B' }
      ],
      tail: { x: 0.33, y: 0.21, r: 0.105, color: '#FFF4F8' },
      eyeStyle: { width: 0.19, height: 0.25, pupilColor: '#2A0C1A', highlights: true },
      eyeOffset: { x: 0.225, y: -0.115 }
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
      belly: { x: 0, y: 0.23, width: 0.56, height: 0.36, color: '#FFFFFF', edgeColor: '#0E7FA8', edgeAlpha: 0.4 },
      crest: [
        { x: -0.07, y: -0.32, angle: -30, length: 0.12, width: 0.045, color: '#25BBD9', tipColor: '#B2F4FF', sway: { amp: 8, speed: 0.006, mirror: false } },
        { x: 0.01, y: -0.35, angle: -4, length: 0.145, width: 0.05, color: '#37CDF0', tipColor: '#B2F4FF', sway: { amp: 8, speed: 0.006, phase: 0.6, mirror: false } }
      ],
      wings: [
        { x: -0.33, y: 0.12, rx: 0.11, ry: 0.16, angle: -20, color: '#25BBD9', rimColor: '#0E7FA8', rimAlpha: 0.45, veins: 2, veinColor: '#0E7FA8', veinAlpha: 0.32, sway: { amp: 12, speed: 0.011 } },
        { x: 0.33, y: 0.12, rx: 0.11, ry: 0.16, angle: 20, color: '#25BBD9', rimColor: '#0E7FA8', rimAlpha: 0.45, veins: 2, veinColor: '#0E7FA8', veinAlpha: 0.32, sway: { amp: 12, speed: 0.011 } }
      ],
      tailFeathers: [
        { x: -0.02, y: 0.3, angle: 212, length: 0.13, width: 0.05, color: '#25BBD9', tipColor: '#B2F4FF', sway: { amp: 6, speed: 0.007, mirror: false } },
        { x: 0.02, y: 0.33, angle: 180, length: 0.16, width: 0.055, color: '#37CDF0', tipColor: '#B2F4FF', sway: { amp: 6, speed: 0.007, phase: 0.5, mirror: false } },
        { x: 0.02, y: 0.3, angle: 148, length: 0.13, width: 0.05, color: '#25BBD9', tipColor: '#B2F4FF', sway: { amp: 6, speed: 0.007, phase: 1, mirror: false } }
      ],
      beak: { x: 0, y: 0.07, width: 0.3, height: 0.2, color: '#FF8A00', tipColor: '#C24A00' },
      nostrils: [
        { x: -0.047, y: -0.012, r: 0.018, color: '#0E7FA8' },
        { x: 0.047, y: -0.012, r: 0.018, color: '#0E7FA8' }
      ],
      cheeks: [
        { x: -0.31, y: 0.09, r: 0.09, color: '#FF88B8', alpha: 0.5 },
        { x: 0.31, y: 0.09, r: 0.09, color: '#FF88B8', alpha: 0.5 }
      ],
      feet: [
        { x: -0.145, y: 0.35, rx: 0.08, ry: 0.05, angle: -14, color: '#FF9E1B', edgeColor: '#D96A00', edgeAlpha: 0.7, toes: 3, toeColor: '#D96A00' },
        { x: 0.145, y: 0.35, rx: 0.08, ry: 0.05, angle: 14, color: '#FF9E1B', edgeColor: '#D96A00', edgeAlpha: 0.7, toes: 3, toeColor: '#D96A00' }
      ],
      eyeStyle: { width: 0.195, height: 0.26, pupilColor: '#06222B', highlights: true },
      eyeOffset: { x: 0.24, y: -0.15 }
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
        { x: -0.15, y: -0.31, rx: 0.032, ry: 0.11, color: '#332300', ballR: 0.045, sway: { amp: 10, speed: 0.006 } },
        { x: 0.15, y: -0.31, rx: 0.032, ry: 0.11, color: '#332300', ballR: 0.045, sway: { amp: 10, speed: 0.006 } }
      ],
      stripes: [
        { y: 0.22, height: 0.08, color: '#332300' },
        { y: 0.38, height: 0.08, color: '#332300' }
      ],
      wings: [
        { x: -0.37, y: -0.34, rx: 0.07, ry: 0.11, angle: -50, color: 'rgba(255, 255, 255, 0.66)', rimColor: '#7EEAFF', rimAlpha: 0.35, veins: 2, veinColor: '#5CC6E0', veinAlpha: 0.3, sway: { amp: 7, speed: 0.06 } },
        { x: 0.37, y: -0.34, rx: 0.07, ry: 0.11, angle: 50, color: 'rgba(255, 255, 255, 0.66)', rimColor: '#7EEAFF', rimAlpha: 0.35, veins: 2, veinColor: '#5CC6E0', veinAlpha: 0.3, sway: { amp: 7, speed: 0.06 } }
      ],
      stinger: { x: 0, y: 0.36, angle: 96, length: 0.115, width: 0.07, color: '#332300', sway: { amp: 8, speed: 0.005, mirror: false } },
      cheeks: [
        { x: -0.31, y: 0.13, r: 0.095, color: '#FF7D7D', alpha: 0.55 },
        { x: 0.31, y: 0.13, r: 0.095, color: '#FF7D7D', alpha: 0.55 }
      ],
      mouth: { type: 'open_smile', x: 0, y: 0.06, width: 0.16, height: 0.08, strokeColor: '#332300', tongueColor: '#FF8FA8' },
      feet: [
        { x: -0.13, y: 0.35, rx: 0.062, ry: 0.04, angle: -8, color: '#4A3300' },
        { x: 0.13, y: 0.35, rx: 0.062, ry: 0.04, angle: 8, color: '#4A3300' }
      ],
      eyeStyle: { width: 0.185, height: 0.25, pupilColor: '#170F00', highlights: true },
      eyeOffset: { x: 0.23, y: -0.14 }
    }
  }
};

// Эмодзи в привычном виде: объёмное жёлтое лицо (у чертёнка — фиолетовое), у огня — пламя,
// сердце — просто красное сердце без лица.
// base/dark/light — тон лица для превью и закрытых слотов, glow — мягкое свечение вокруг.
const EMOJI = {
  heart: {
    name: 'Heart',
    face: '❤️',
    shape: 'heart',
    faceStyle: null,
    hue: 348,
    base: '#FF2D55',
    dark: '#A80F33',
    light: '#FF9DB0',
    rim: '#FF6F8C',
    glow: '#FF4D79',
    aura: 0.8,
    glowBlur: 40,
    surface: 'smooth'
  },
  fire: {
    name: 'Fire',
    face: '🔥',
    shape: 'flame',
    faceStyle: 'eager',
    hue: 26,
    base: '#FF8A00',
    dark: '#D1300F',
    light: '#FFE45C',
    rim: '#FFC233',
    glow: '#FF6A1A',
    aura: 0.9,
    glowBlur: 46,
    surface: 'smooth'
  },
  devil: {
    name: 'Devil',
    face: '😈',
    shape: 'devil',
    faceStyle: 'sly',
    hue: 275,
    base: '#AD6BE6',
    dark: '#5E2A93',
    light: '#EBD2FF',
    rim: '#C9A0F5',
    glow: '#B266FF',
    aura: 0.8,
    glowBlur: 40,
    surface: 'smooth'
  },
  angel: {
    name: 'Angel',
    face: '😇',
    shape: 'angel',
    faceStyle: 'happy',
    hue: 48,
    base: '#FFD84A',
    dark: '#D98A0B',
    light: '#FFF7C2',
    rim: '#FFE9A0',
    glow: '#7FE3FF',
    aura: 0.8,
    glowBlur: 44,
    surface: 'smooth'
  },
  surprised: {
    name: 'Surprised',
    face: '😮',
    shape: 'surprised',
    faceStyle: 'wow',
    hue: 48,
    base: '#FFD84A',
    dark: '#D98A0B',
    light: '#FFF7C2',
    rim: '#FFE9A0',
    glow: '#FFC93C',
    aura: 0.8,
    glowBlur: 40,
    surface: 'smooth'
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
    golden: !!(planet ? planet.golden : theme && theme.golden),
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

// Размеры планет — отдельная пологая лестница. С общей формулой цепочка Меркурий–Нептун
// занимала ~97% площади чаши, и собрать Солнце было почти невозможно; теперь ~84%.
// Каждая планета чуть крупнее предыдущей и всё равно больше самого крупного кубика (53).
const PLANET_RADIUS = { 6: 56, 7: 58, 8: 60, 9: 63, 10: 65, 11: 67, 12: 69, 13: 71, 14: 75 };

function planetRadius(level, fallback) {
  return PLANET_RADIUS[level] || Math.round(fallback * 0.9);
}

export const SLIME_CONFIGS = Array.from({ length: MAX_SLIME_LEVEL }, (_, i) => {
  const level = i + 1;
  const base = level <= BASE_CONFIGS.length ? { ...BASE_CONFIGS[i] } : makeConfig(level);
  const cfg = { ...base, ...buildVisuals(level) };
  if (cfg.isPlanet) cfg.radius = planetRadius(level, cfg.radius);
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

function buildEmojiVisuals(level, key) {
  const e = EMOJI[key];
  return {
    color: e.base,
    glowColor: e.glow,
    glowBlur: e.glowBlur,
    darkColor: e.dark,
    lightColor: e.light,
    rimColor: e.rim,
    baseHue: e.hue,
    aura: e.aura,
    visualStyle: 'emoji',
    particleType: null,
    innerCore: true,
    legendary: false,
    iridescent: false,
    golden: false,
    collection: 'ocean',
    planet: null,
    isPlanet: false, // Гарантирует, что объект не будет рендериться как круглый планетарный элемент
    isAnimal: false,
    isFish: false,
    isEmoji: true,
    translucent: false,
    surface: e.surface,
    ring: false,
    palette: e,
    features: null,
    name: e.name,
    emoji: e.face,
    emojiKey: key,
    shape: e.shape,
    faceStyle: e.faceStyle
  };
}

function themedConfig(level, themeId) {
  const key = `${themeId}:${level}`;
  let cfg = THEMED_CONFIGS.get(key);
  if (cfg) return cfg;

  const base = level <= BASE_CONFIGS.length ? { ...BASE_CONFIGS[level - 1] } : makeConfig(level);
  const animalKey = themeId === 'animals' ? COLLECTIONS.animals.levels[level] : null;
  const emojiKey = themeId === 'ocean' ? COLLECTIONS.ocean.levels[level] : null;

  if (animalKey) {
    cfg = { ...base, ...buildAnimalVisuals(level, animalKey) };
  } else if (emojiKey) {
    cfg = { ...base, ...buildEmojiVisuals(level, emojiKey) };
  } else if (themeId === 'animals' || themeId === 'ocean') {
    cfg = { ...base, ...buildVisuals(level, true) };
  } else {
    cfg = { ...base, ...buildVisuals(level) };
    if (cfg.isPlanet) cfg.radius = planetRadius(level, cfg.radius);
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
