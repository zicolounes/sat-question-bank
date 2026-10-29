/**
 * Badge ids stored in Firestore `badges: string[]`.
 * Each row uses exactly one threshold field (minCurrentStreak, minLongestStreak, etc.).
 */
export const BADGE_DEFS = [
  {
    id: 'grinder',
    title: 'Grinder',
    description: 'Hit a 7-day practice streak (at least one question each calendar day).',
    minCurrentStreak: 7,
  },
  {
    id: 'kindling',
    title: 'Kindling',
    description: 'Keep the fire going — 14-day practice streak.',
    minCurrentStreak: 14,
  },
  {
    id: 'streak_king',
    title: 'Streak King',
    description: '30-day practice streak. Miss a calendar day and the count resets.',
    minCurrentStreak: 30,
  },
  {
    id: 'endurance',
    title: 'Endurance',
    description: 'Your longest streak ever reaches 45 days.',
    minLongestStreak: 45,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Answer 100 questions total (counts every attempt, including wrong answers).',
    minQuestionsAnswered: 100,
  },
  {
    id: 'marksman',
    title: 'Marksman',
    description: 'Get 100 questions correct in total.',
    minCorrectTotal: 100,
  },
  {
    id: 'deadeye',
    title: 'Deadeye',
    description: '500 lifetime correct answers.',
    minCorrectTotal: 500,
  },
  {
    id: 'mythic',
    title: 'Mythic',
    description: '1,000 lifetime correct answers.',
    minCorrectTotal: 1000,
  },
  {
    id: 'math_century',
    title: 'Math Century',
    description: '100 correct Math questions.',
    minCorrectMath: 100,
  },
  {
    id: 'rw_century',
    title: 'R&W Century',
    description: '100 correct Reading & Writing (English) questions.',
    minCorrectEnglish: 100,
  },
  {
    id: 'elite',
    title: 'Elite',
    description: 'Reach account level 20.',
    minLevel: 20,
  },
  {
    id: 'regular',
    title: 'Regular',
    description: 'Practice on at least 18 different days in the last 30 days.',
    minActiveDays30: 18,
  },
  {
    id: 'machine',
    title: 'Machine',
    description: 'Practice on at least 26 different days in the last 30 days.',
    minActiveDays30: 26,
  },
];

const PRIORITY = {
  mythic: 100,
  deadeye: 96,
  elite: 94,
  machine: 90,
  math_century: 86,
  rw_century: 85,
  marksman: 82,
  streak_king: 78,
  endurance: 74,
  regular: 70,
  centurion: 66,
  kindling: 52,
  grinder: 48,
};

function badgeMeets(b, m) {
  const {
    currentStreak = 0,
    longestStreak = 0,
    questionsAnswered = 0,
    level = 1,
    correctTotal = 0,
    correctMath = 0,
    correctEnglish = 0,
    activeDaysLast30 = 0,
  } = m;
  if (b.minCurrentStreak != null) return currentStreak >= b.minCurrentStreak;
  if (b.minLongestStreak != null) return longestStreak >= b.minLongestStreak;
  if (b.minQuestionsAnswered != null) return questionsAnswered >= b.minQuestionsAnswered;
  if (b.minCorrectTotal != null) return correctTotal >= b.minCorrectTotal;
  if (b.minCorrectMath != null) return correctMath >= b.minCorrectMath;
  if (b.minCorrectEnglish != null) return correctEnglish >= b.minCorrectEnglish;
  if (b.minActiveDays30 != null) return activeDaysLast30 >= b.minActiveDays30;
  if (b.minLevel != null) return level >= b.minLevel;
  return false;
}

/**
 * @param {{ badges?: string[], currentStreak?: number, longestStreak?: number, questionsAnswered?: number, level?: number, correctTotal?: number, correctMath?: number, correctEnglish?: number, activeDaysLast30?: number }} metrics
 */
export function computeNewBadgeIds(metrics) {
  const { badges = [], ...m } = metrics;
  const have = new Set(badges);
  const next = [];
  for (const b of BADGE_DEFS) {
    if (have.has(b.id)) continue;
    if (badgeMeets(b, m)) next.push(b.id);
  }
  return next;
}

/** Progress toward one badge for UI (current vs target). */
export function getBadgeProgress(def, m) {
  const {
    currentStreak = 0,
    longestStreak = 0,
    questionsAnswered = 0,
    level = 1,
    correctTotal = 0,
    correctMath = 0,
    correctEnglish = 0,
    activeDaysLast30 = 0,
  } = m;
  if (def.minCurrentStreak != null) return { current: currentStreak, target: def.minCurrentStreak };
  if (def.minLongestStreak != null) return { current: longestStreak, target: def.minLongestStreak };
  if (def.minQuestionsAnswered != null) return { current: questionsAnswered, target: def.minQuestionsAnswered };
  if (def.minCorrectTotal != null) return { current: correctTotal, target: def.minCorrectTotal };
  if (def.minCorrectMath != null) return { current: correctMath, target: def.minCorrectMath };
  if (def.minCorrectEnglish != null) return { current: correctEnglish, target: def.minCorrectEnglish };
  if (def.minActiveDays30 != null) return { current: activeDaysLast30, target: def.minActiveDays30 };
  if (def.minLevel != null) return { current: level, target: def.minLevel };
  return { current: 0, target: 1 };
}

/** Default active title to highest-priority newly earned badge, else keep existing if still valid. */
export function pickDefaultActiveTitle(badgeIds, previousTitle) {
  const set = new Set(badgeIds);
  const titles = BADGE_DEFS.filter((b) => set.has(b.id)).sort(
    (a, b) => (PRIORITY[b.id] ?? 0) - (PRIORITY[a.id] ?? 0)
  );
  if (!titles.length) return null;
  const stillValid = titles.some((t) => t.title === previousTitle);
  if (previousTitle && stillValid) return previousTitle;
  return titles[0].title;
}

export function titleForBadgeId(id) {
  return BADGE_DEFS.find((b) => b.id === id)?.title ?? null;
}
