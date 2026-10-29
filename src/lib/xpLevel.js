/**
 * XP curve: XP required to advance **from** level N **to** level N+1 is
 * `N * 100 * 1.2^N` (N is current level, starting at 1).
 */

export function xpToAdvanceFromLevel(level) {
  const n = Math.max(1, Math.floor(level));
  return n * 100 * Math.pow(1.2, n);
}

/** Total XP accumulated in the bar for the current level (0 .. need-1). */
export function levelProgressFromTotalXp(totalXp) {
  let xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  for (;;) {
    const need = xpToAdvanceFromLevel(level);
    if (xp < need) {
      return {
        level,
        xpIntoLevel: xp,
        xpToNextLevel: need,
        progressRatio: need <= 0 ? 0 : Math.min(1, xp / need),
      };
    }
    xp -= need;
    level += 1;
    if (level > 9999) break;
  }
  return { level: 1, xpIntoLevel: 0, xpToNextLevel: xpToAdvanceFromLevel(1), progressRatio: 0 };
}

/** Level implied by total XP (single source of truth for ranking). */
export function levelFromTotalXp(totalXp) {
  return levelProgressFromTotalXp(totalXp).level;
}

