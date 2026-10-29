/** Curated backgrounds — distinct hues, tuned for a light icon on top. */
export const AVATAR_PRESET_COLORS = [
  '#4F46E5',
  '#0D9488',
  '#CA8A04',
  '#C026D3',
  '#DC2626',
  '#2563EB',
  '#059669',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#0F766E',
  '#4338CA',
  '#B45309',
  '#0369A1',
];

/** Stable ids rendered by {@link StudentAvatar}. */
export const AVATAR_SYMBOL_IDS = [
  'hex',
  'triangle',
  'diamond',
  'ring',
  'star',
  'bolt',
  'plus',
  'square',
  'pentagon',
  'spark',
];

export const DEFAULT_AVATAR_COLOR = AVATAR_PRESET_COLORS[0];
export const DEFAULT_AVATAR_SYMBOL = 'hex';

export function randomAvatarDefaults() {
  const avatarColor = AVATAR_PRESET_COLORS[Math.floor(Math.random() * AVATAR_PRESET_COLORS.length)];
  const avatarSymbol = AVATAR_SYMBOL_IDS[Math.floor(Math.random() * AVATAR_SYMBOL_IDS.length)];
  return { avatarColor, avatarSymbol };
}

export function sanitizeAvatar({ avatarColor, avatarSymbol } = {}) {
  let hex = String(avatarColor || '').trim();
  if (!hex.startsWith('#')) hex = `#${hex}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    hex = DEFAULT_AVATAR_COLOR;
  }
  const color =
    AVATAR_PRESET_COLORS.find((c) => c.toUpperCase() === hex.toUpperCase()) ?? DEFAULT_AVATAR_COLOR;
  const sym = String(avatarSymbol || '').trim().toLowerCase();
  const symbol = AVATAR_SYMBOL_IDS.includes(sym) ? sym : DEFAULT_AVATAR_SYMBOL;
  return { avatarColor: color, avatarSymbol: symbol };
}
