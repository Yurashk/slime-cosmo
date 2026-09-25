export const THEME_BASE_FROM = 6;
export const THEME_SLIME_COUNT = 9;

export const THEMES = {
  space: {
    id: 'space',
    title: 'Космос',
    accent: '#c781ff',
    accentGlow: 'rgba(151, 90, 255, 0.5)',
    lockShape: 'planet',
    unlockRequirement: null,
    playable: true,
    bowl: {
      theme: 'space',
      shell: ['rgba(46, 74, 168, 0.32)', 'rgba(24, 38, 108, 0.42)', 'rgba(8, 13, 46, 0.62)'],
      bottomGlow: ['rgba(150, 92, 255, $A)', 'rgba(52, 150, 255, 0.12)', 'rgba(24, 34, 130, 0)'],
      arch: ['rgba(205, 140, 255, 0.18)', 'rgba(160, 100, 255, 0.06)', 'rgba(160, 100, 255, 0)'],
      pane: ['rgba(200, 150, 255, 0.07)', 'rgba(150, 90, 255, 0.04)', 'rgba(220, 170, 255, 0.08)'],
      bloom: ['124, 219, 255', '60, 140, 255'],
      moteFill: '159, 219, 255',
      moteShadow: '#3fc6ff',
      rim: '#79e6ff',
      rimGlow: '#3fc6ff',
      outer: 'rgba(0, 175, 245, 0.55)',
      outerGlow: '#0099ff'
    },
    renderer: () => import('./space.js')
  },
  animals: {
    id: 'animals',
    title: 'Зверюшки',
    accent: '#46ff9a',
    accentGlow: 'rgba(80, 255, 150, 0.45)',
    lockShape: 'animal',
    unlockRequirement: { themeId: 'space', requiredLevel: 8 },
    playable: true,
    bowl: {
      theme: 'meadow',
      shell: ['rgba(34, 122, 82, 0.30)', 'rgba(16, 72, 52, 0.40)', 'rgba(4, 22, 18, 0.60)'],
      bottomGlow: ['rgba(70, 255, 150, $A)', 'rgba(40, 190, 110, 0.12)', 'rgba(10, 40, 26, 0)'],
      arch: ['rgba(110, 255, 170, 0.14)', 'rgba(70, 220, 130, 0.05)', 'rgba(70, 220, 130, 0)'],
      pane: ['rgba(120, 255, 170, 0.06)', 'rgba(80, 200, 130, 0.04)', 'rgba(150, 255, 190, 0.07)'],
      bloom: ['150, 255, 170', '70, 190, 110'],
      moteFill: '190, 255, 140',
      moteShadow: '#7afc66',
      rim: '#7fffa8',
      rimGlow: '#3ffc7a',
      outer: 'rgba(120, 255, 165, 0.5)',
      outerGlow: '#2ee66a'
    },
    renderer: () => import('./animals.js')
  },
  ocean: {
    id: 'ocean',
    title: 'Океан',
    accent: '#45ccff',
    accentGlow: 'rgba(70, 190, 255, 0.45)',
    lockShape: 'fish',
    unlockRequirement: { themeId: 'animals', requiredLevel: 8 },
    playable: true,
    bowl: {
      theme: 'ocean',
      shell: ['rgba(16, 84, 140, 0.32)', 'rgba(8, 46, 96, 0.42)', 'rgba(2, 14, 38, 0.62)'],
      bottomGlow: ['rgba(70, 190, 255, $A)', 'rgba(30, 130, 210, 0.14)', 'rgba(6, 20, 60, 0)'],
      arch: ['rgba(90, 200, 255, 0.16)', 'rgba(50, 150, 230, 0.06)', 'rgba(50, 150, 230, 0)'],
      pane: ['rgba(110, 210, 255, 0.07)', 'rgba(60, 160, 240, 0.05)', 'rgba(140, 220, 255, 0.08)'],
      bloom: ['130, 220, 255', '60, 150, 230'],
      moteFill: '170, 230, 255',
      moteShadow: '#57d4ff',
      rim: '#7fd8ff',
      rimGlow: '#2f9be8',
      outer: 'rgba(0, 190, 245, 0.5)',
      outerGlow: '#1fb0e8'
    },
    renderer: () => import('./ocean.js')
  }
};

export function bowlStyle(themeId) {
  const t = THEMES[themeId];
  return t && t.bowl ? t.bowl : THEMES.space.bowl;
}

export const THEME_ORDER = ['space', 'animals', 'ocean'];

export function themeSlimeLevels(themeId) {
  return Array.from({ length: THEME_SLIME_COUNT }, (_, i) => THEME_BASE_FROM + i);
}

export function entityIdOf(themeId, level) {
  return `${themeId}:${level}`;
}

const loadCache = new Map();
export function loadTheme(themeId) {
  const theme = THEMES[themeId];
  if (!theme) return Promise.resolve(null);
  if (!loadCache.has(themeId)) {
    loadCache.set(themeId, theme.renderer().catch((err) => {
      loadCache.delete(themeId);
      throw err;
    }));
  }
  return loadCache.get(themeId);
}