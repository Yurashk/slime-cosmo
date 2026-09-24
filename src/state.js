import { THEMES, THEME_ORDER, themeSlimeLevels, entityIdOf } from './themes/registry.js';

const STORAGE_KEY = 'neon-slime-progress-v1';
const LEGACY_HIGHSCORE_KEY = 'neon-slime-highscore';
const BASE_LEVELS = [1, 2, 3, 4, 5];

let state = null;

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

export const progress = {
  isSlimeUnlocked(entityId) {
    return state.unlockedSlimes.includes(entityId);
  },

  markSlimeUnlocked(entityId) {
    if (!state.unlockedSlimes.includes(entityId)) {
      state.unlockedSlimes.push(entityId);
      persist();
    }
  },

  getThemeMaxLevel(themeId) {
    let max = 0;
    for (const lv of themeSlimeLevels(themeId)) {
      if (state.unlockedSlimes.includes(entityIdOf(themeId, lv))) max = lv;
    }
    return max;
  },

  isThemeUnlocked(themeId) {
    const theme = THEMES[themeId];
    if (!theme || !theme.unlockRequirement) return true;
    const req = theme.unlockRequirement;
    return state.unlockedSlimes.includes(entityIdOf(req.themeId, req.requiredLevel));
  },

  getHighScore(themeId) {
    return Math.max(0, Math.floor(Number(state.highScores[themeId]) || 0));
  },

  setHighScore(themeId, score) {
    const s = Math.max(0, Math.floor(Number(score) || 0));
    if (s > (Number(state.highScores[themeId]) || 0)) {
      state.highScores[themeId] = s;
      persist();
    }
  },

  getSelectedTheme() {
    if (!THEMES[state.selectedTheme]) resetToFirstUnlocked();
    return state.selectedTheme;
  },

  setSelectedTheme(themeId) {
    if (THEMES[themeId] && state.selectedTheme !== themeId) {
      state.selectedTheme = themeId;
      persist();
    }
  }
};

function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
  const s = raw && typeof raw === 'object' ? raw : {};
  s.unlockedSlimes = Array.isArray(s.unlockedSlimes)
    ? s.unlockedSlimes.filter(id => typeof id === 'string')
    : [];
  s.highScores = s.highScores && typeof s.highScores === 'object' ? s.highScores : {};
  if (typeof s.selectedTheme !== 'string' || !THEMES[s.selectedTheme]) s.selectedTheme = 'space';

  for (const lv of BASE_LEVELS) {
    if (!s.unlockedSlimes.includes('base:' + lv)) s.unlockedSlimes.push('base:' + lv);
  }

  try {
    const legacy = parseInt(localStorage.getItem(LEGACY_HIGHSCORE_KEY) || '0', 10);
    if (Number.isFinite(legacy) && legacy > (Number(s.highScores.space) || 0)) {
      s.highScores.space = legacy;
    }
  } catch (e) {}

  return s;
}

function resetToFirstUnlocked() {
  for (const id of THEME_ORDER) {
    if (progress.isThemeUnlocked(id)) {
      state.selectedTheme = id;
      return;
    }
  }
}

state = load();
if (!THEMES[state.selectedTheme]) resetToFirstUnlocked();
persist();
