/** localStorage key for font preview (applies before React paints via index.js). */
export const FONT_LAB_STORAGE_KEY = 'satBank.fontLab.v1';

export function defaultFontStacks() {
  return {
    sans: "'Crimson Pro', ui-serif, Georgia, 'Times New Roman', serif",
    display: "'Crimson Pro', ui-serif, Georgia, 'Times New Roman', serif",
    mono: "'Crimson Pro', ui-serif, Georgia, 'Times New Roman', serif",
  };
}

export function readFontLabPrefs() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(FONT_LAB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFontLabPrefs(prefs) {
  window.localStorage.setItem(FONT_LAB_STORAGE_KEY, JSON.stringify(prefs));
}

export function clearFontLabPrefs() {
  window.localStorage.removeItem(FONT_LAB_STORAGE_KEY);
}

const GOOGLE_LINK_ID = 'font-lab-google-fonts';

/**
 * Apply CSS variables on <html> and optionally load a Google Fonts stylesheet.
 * @param {null | { sans?: string, display?: string, mono?: string, googleHref?: string }} prefs
 */
export function applyFontLabPrefsToDocument(prefs) {
  const base = defaultFontStacks();
  const merged = { ...base, ...(prefs || {}) };
  const root = document.documentElement;
  root.style.setProperty('--font-sans', merged.sans);
  root.style.setProperty('--font-display', merged.display || merged.sans);
  root.style.setProperty('--font-mono', merged.mono);

  const href = prefs && typeof prefs.googleHref === 'string' ? prefs.googleHref.trim() : '';
  const existing = document.getElementById(GOOGLE_LINK_ID);
  if (!href) {
    if (existing) existing.remove();
    return;
  }
  let link = existing;
  if (!link) {
    link = document.createElement('link');
    link.id = GOOGLE_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function fontLabNavVisible() {
  return (
    process.env.NODE_ENV === 'development' || process.env.REACT_APP_FONT_LAB === '1'
  );
}
