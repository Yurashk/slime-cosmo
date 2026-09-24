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
    renderer: () => import('./space.js')
  },
  animals: {
    id: 'animals',
    title: 'Зверюшки',
    accent: '#46ff9a',
    accentGlow: 'rgba(80, 255, 150, 0.45)',
    lockShape: 'animal',
    unlockRequirement: { themeId: 'space', requiredLevel: 8 },
    playable: false,
    renderer: () => import('./animals.js')
  },
  ocean: {
    id: 'ocean',
    title: 'Океан',
    accent: '#45ccff',
    accentGlow: 'rgba(70, 190, 255, 0.45)',
    lockShape: 'fish',
    unlockRequirement: { themeId: 'animals', requiredLevel: 8 },
    playable: false,
    renderer: () => import('./ocean.js')
  }
};

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