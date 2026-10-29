import { BADGE_DEFS, getBadgeProgress } from './badges';

/**
 * Single badge or daily challenge the student is closest to finishing
 * (highest progress ratio, then smallest remaining gap).
 *
 * @param {{
 *   badgesEarned?: Iterable<string>,
 *   badgeMetrics: Record<string, number>,
 *   challenges?: Array<{ title: string, description?: string, current: number, target: number, status?: string }>,
 * }} opts
 * @returns {{ kind: 'badge' | 'challenge', title: string, description: string, current: number, target: number } | null}
 */
export function pickClosestAchievementOrChallenge({ badgesEarned, badgeMetrics, challenges }) {
  const earned = badgesEarned instanceof Set ? badgesEarned : new Set(badgesEarned ?? []);
  const m = badgeMetrics ?? {};
  const candidates = [];

  for (const def of BADGE_DEFS) {
    if (earned.has(def.id)) continue;
    const { current, target } = getBadgeProgress(def, m);
    const t = Math.max(1, Number(target) || 0);
    const cur = Math.min(Number(current) || 0, t);
    if (cur >= t) continue;
    const ratio = cur / t;
    candidates.push({
      kind: 'badge',
      title: def.title,
      description: String(def.description ?? ''),
      current: cur,
      target: t,
      ratio,
      gap: t - cur,
    });
  }

  for (const c of challenges ?? []) {
    if (String(c?.status ?? '') === 'complete') continue;
    const target = Math.max(1, Number(c?.target) || 0);
    const current = Math.min(Number(c?.current) || 0, target);
    if (current >= target) continue;
    const ratio = current / target;
    candidates.push({
      kind: 'challenge',
      title: String(c?.title ?? 'Challenge'),
      description: String(c?.description ?? ''),
      current,
      target,
      ratio,
      gap: target - current,
    });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (a.gap !== b.gap) return a.gap - b.gap;
    return String(a.title).localeCompare(String(b.title));
  });

  const top = candidates[0];
  return {
    kind: top.kind,
    title: top.title,
    description: top.description,
    current: top.current,
    target: top.target,
  };
}
