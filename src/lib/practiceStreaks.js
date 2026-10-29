/** Calendar-day streak helpers for practice responses (local timezone). */

export function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDayKey(date) {
  const d = startOfLocalDay(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Current streak: consecutive calendar days with ≥1 response, walking backward from today.
 * If today has no activity yet, counting starts from yesterday so the streak is not
 * zeroed until a full day is missed after your last practice day.
 */
export function computeCurrentStreak(dayKeysSet, refDate = new Date()) {
  let streak = 0;
  const d = startOfLocalDay(refDate);
  if (!dayKeysSet.has(formatDayKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  for (;;) {
    const key = formatDayKey(d);
    if (!dayKeysSet.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function computeLongestStreak(dayKeysSet) {
  const keys = Array.from(dayKeysSet.values()).sort();
  if (!keys.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < keys.length; i += 1) {
    const prev = new Date(`${keys[i - 1]}T00:00:00`);
    const cur = new Date(`${keys[i]}T00:00:00`);
    const diffDays = Math.round((cur - prev) / 86400000);
    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}
