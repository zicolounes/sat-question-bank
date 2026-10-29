import React from 'react';
import { listResponsesForStudentSince } from '../lib/firebase';
import {
  coerceFirestoreDate,
  readDashStatsCache,
  writeDashStatsCache,
} from '../lib/firestoreDates';
import {
  formatDayKey,
  startOfLocalDay,
  computeCurrentStreak,
  computeLongestStreak,
} from '../lib/practiceStreaks';
import { emptyStudentDashboard } from '../data/studentDashboardDefaults';
import { getLastSessionCard } from '../lib/lastSession';

function seededRng(seedStr) {
  // xmur3 + mulberry32 combo, deterministic for a given seed string
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i += 1) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}

/** Shown under the hub headline; one line per local calendar day (deterministic). */
const DASH_SUBTITLE_NO_PROGRESS = [
  'No practice logged yet today.',
  'Your daily goal is 15 questions.',
  'Start a practice set when you are ready.',
  'Pick a subject and skill from Practice, or browse the bank.',
  'Short sessions still count toward your daily goal.',
  'Full-length tests and quick sets are both available.',
  'Your streak updates when you answer at least one question today.',
  'Review past mistakes anytime from the Review tab.',
  'Progress saves automatically as you go.',
  'Stats below update once you start answering.',
];

const DASH_SUBTITLE_HAS_PROGRESS = [
  'You have practiced today. Keep going or stop anytime.',
  'Progress toward your daily goal updates as you answer.',
  'You can do another set or pick this up later.',
  'Today’s accuracy and streak are reflected in the stats below.',
  'You are working toward today’s 15-question goal.',
  'Your answers today are already counted.',
  'Continue practice or come back later — both are fine.',
  'Come back tomorrow to keep your streak going.',
  'More questions today will move your stats further.',
  'You are partway through today’s goal.',
  'Weekly accuracy is based on your last seven days.',
  'Nice start today. Add another set if you have time.',
];

function pickDashboardSubtitle(todayKey, hasProgressToday) {
  const list = hasProgressToday ? DASH_SUBTITLE_HAS_PROGRESS : DASH_SUBTITLE_NO_PROGRESS;
  const rng = seededRng(`${todayKey}|dash-subtitle|${hasProgressToday ? 'p' : 'z'}`);
  const idx = Math.floor(rng() * list.length);
  return list[idx] ?? list[0];
}

function startOfWeekMonday(date) {
  const d = startOfLocalDay(date);
  const day = d.getDay(); // 0 Sun, 1 Mon
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

function toPct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function groupAccuracy(responses, keyFn) {
  const m = new Map();
  for (const r of responses) {
    const k = keyFn(r);
    if (!k) continue;
    const prev = m.get(k) ?? { correct: 0, total: 0 };
    m.set(k, {
      correct: prev.correct + (r.is_correct ? 1 : 0),
      total: prev.total + 1,
    });
  }
  return Array.from(m.entries()).map(([key, v]) => ({
    key,
    pct: toPct(v.correct, v.total),
    correct: v.correct,
    total: v.total,
  }));
}

function statsHasSignal(stats) {
  if (!stats?.dailyProgress) return false;
  if (Number(stats.dailyProgress.completed) > 0) return true;
  if (Number(stats.currentStreak) > 0) return true;
  if (Number(stats.weekAccuracyPct) > 0) return true;
  if (Array.isArray(stats.weekPracticeDays) && stats.weekPracticeDays.some(Boolean)) return true;
  return false;
}

function coerceBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/** Stable id for de-duping “questions done today” (numeric or string bank ids). */
function responseQuestionKey(r) {
  if (!r || typeof r !== 'object') return '';
  const raw = r.question_id ?? r.questionId ?? r.q_id ?? r.questionID;
  if (raw == null || raw === '') return '';
  return String(raw).trim();
}

/** Distinct questions whose latest wrong attempt (in window) is still “in review” — mirrors ReviewMistakesPage. */
function countMistakeReviewQueue(parsed) {
  const wrongRows = [];
  for (const r of parsed) {
    if (r.is_correct) continue;
    const qid = Number(responseQuestionKey(r));
    if (!Number.isFinite(qid)) continue;
    const ts =
      r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp ?? '');
    wrongRows.push({ questionId: qid, ts });
  }
  const latest = new Map();
  for (const r of wrongRows) {
    const prev = latest.get(r.questionId);
    if (!prev || r.ts > prev) latest.set(r.questionId, r.ts);
  }
  return latest.size;
}

function recentSliceForSkill(weekResponses, subject, skillLabel, maxN) {
  const cap = Math.max(1, Math.min(20, Number(maxN) || 6));
  const rows = weekResponses
    .filter((r) => String(r.subject) === String(subject) && String(r.skill) === String(skillLabel))
    .sort((a, b) => {
      const dt = b.timestamp - a.timestamp;
      if (dt !== 0) return dt;
      return String(responseQuestionKey(b)).localeCompare(String(responseQuestionKey(a)));
    })
    .slice(0, cap);
  const wrong = Math.min(rows.length, rows.filter((r) => !r.is_correct).length);
  return { attempted: rows.length, wrong, right: rows.length - wrong };
}

/** Pick one weak skill to feature today — deterministic per local day + student, varies by day. */
function pickDailyFeaturedWeak(displayWeak, studentId, todayKey) {
  if (!displayWeak.length) return { featured: null, index: 0 };
  const poolN = Math.min(displayWeak.length, 5);
  const pool = displayWeak.slice(0, poolN);
  const rng = seededRng(`${String(studentId)}|${todayKey}|rec-pick-v1`);
  const j = Math.floor(rng() * pool.length);
  const featured = pool[j] ?? pool[0];
  const index = displayWeak.findIndex(
    (t) => String(t.subject) === String(featured.subject) && String(t.skill) === String(featured.skill)
  );
  return { featured, index: index >= 0 ? index : 0 };
}

function buildRecommendedWhy(featured, slice) {
  if (!featured) return '';
  if (slice.attempted >= 2 && slice.wrong > 0) {
    const w = Math.min(slice.wrong, slice.attempted);
    return `You missed ${w} of your last ${slice.attempted} in this skill.`;
  }
  if (slice.attempted >= 2 && slice.wrong === 0) {
    return `Your last ${slice.attempted} tries in this skill are clean — keep the reps going while accuracy is still ${featured.pct}% for the week.`;
  }
  if (Number(featured.pct) < 50) {
    return `This skill is at ${featured.pct}% accuracy this week (${featured.total} attempts) — a focused set will move the needle.`;
  }
  return `Among your weekly practice, this lane is softest at ${featured.pct}% across ${featured.total} tries.`;
}

function deriveRecentActivity(todayCompleted, weekCorrect, weekTotal, streak) {
  const items = [];
  if (todayCompleted > 0) {
    items.push({
      id: 'a-today',
      kind: 'practice',
      text: `Completed ${todayCompleted} questions today`,
      timeLabel: 'Today',
    });
  }
  if (weekTotal > 0) {
    items.push({
      id: 'a-week',
      kind: 'score',
      text: `This week accuracy: ${toPct(weekCorrect, weekTotal)}%`,
      timeLabel: 'This week',
    });
  }
  if (streak > 0) {
    items.push({
      id: 'a-streak',
      kind: 'challenge',
      text: `Kept your streak alive (${streak} days)`,
      timeLabel: 'Today',
    });
  }
  items.push({
    id: 'a-tip',
    kind: 'review',
    text: 'Tip: review one missed question before you stop',
    timeLabel: 'Any time',
  });
  return items.slice(0, 4);
}

function buildDailyChallenges({
  rng,
  todayResponses,
  todayCompleted,
  todayCorrect,
  todayHardCorrectStreak,
  todayAccuracyPct,
  weekResponses,
  parsed,
  todayKey,
}) {
  const dailyTarget = 15;

  // Algebra accuracy today (Math domain === 'Algebra')
  const algebraToday = todayResponses.filter(
    (r) => String(r.subject) === 'Math' && String(r.domain) === 'Algebra'
  );
  const algebraPct = algebraToday.length
    ? toPct(algebraToday.filter((r) => r.is_correct).length, algebraToday.length)
    : 0;

  // Review count: questions that were wrong before today, answered today
  const todayQIds = new Set(todayResponses.map(responseQuestionKey).filter(Boolean));
  const hadWrongBeforeToday = new Set();
  for (const r of parsed) {
    if (formatDayKey(r.timestamp) === todayKey) continue;
    if (!r.is_correct) {
      const qid = responseQuestionKey(r);
      if (qid) hadWrongBeforeToday.add(qid);
    }
  }
  let reviewedCount = 0;
  for (const qid of todayQIds) {
    if (hadWrongBeforeToday.has(qid)) reviewedCount += 1;
  }

  // R&W drill: answer 10 English questions today
  const englishTodayCount = todayResponses.filter((r) => String(r.subject) === 'English').length;

  const xpBase = 20 + Math.floor(rng() * 6) * 5;

  const list = [
    {
      id: 'c-hard',
      title: 'Hard streak',
      description: 'Get 5 Hard questions correct in a row.',
      current: Math.min(todayHardCorrectStreak, 5),
      target: 5,
      xp: xpBase + 20,
      status: todayHardCorrectStreak >= 5 ? 'complete' : todayResponses.length ? 'in_progress' : 'locked',
    },
    {
      id: 'c-volume',
      title: 'Complete 15 today',
      description: 'Finish your daily goal: 15 questions.',
      current: Math.min(todayCompleted, dailyTarget),
      target: dailyTarget,
      xp: xpBase + 10,
      status: todayCompleted >= dailyTarget ? 'complete' : 'in_progress',
    },
    {
      id: 'c-algebra',
      title: 'Algebra 80%+',
      description: 'Score 80%+ on Algebra practice today.',
      current: algebraToday.length >= 5 && algebraPct >= 80 ? 1 : 0,
      target: 1,
      xp: xpBase + 15,
      status: algebraToday.length >= 5 ? (algebraPct >= 80 ? 'complete' : 'in_progress') : 'locked',
    },
    {
      id: 'c-review',
      title: 'Review 3 misses',
      description: 'Revisit 3 questions you previously missed.',
      current: Math.min(reviewedCount, 3),
      target: 3,
      xp: xpBase,
      status: reviewedCount >= 3 ? 'complete' : hadWrongBeforeToday.size ? 'in_progress' : 'locked',
    },
    {
      id: 'c-rw',
      title: 'R&W drill',
      description: 'Answer 10 Reading & Writing questions today.',
      current: Math.min(englishTodayCount, 10),
      target: 10,
      xp: xpBase,
      status: englishTodayCount >= 10 ? 'complete' : 'in_progress',
    },
  ];

  // If the student is already done with the day, reward accuracy with a subtle “complete” feel via status.
  if (todayCompleted >= dailyTarget && todayAccuracyPct >= 85) {
    list[1] = { ...list[1], xp: list[1].xp + 10 };
  }

  return list;
}

export function useStudentDashboardStats({ studentId, streakGraceDayKey } = {}) {
  const lastGoodStatsRef = React.useRef(null);

  const [state, setState] = React.useState(() => {
    const disk = studentId ? readDashStatsCache(studentId) : null;
    if (disk) lastGoodStatsRef.current = disk;
    return {
      loading: !disk,
      error: null,
      stats: disk,
    };
  });

  React.useLayoutEffect(() => {
    if (!studentId) {
      lastGoodStatsRef.current = null;
      return;
    }
    lastGoodStatsRef.current = readDashStatsCache(studentId) ?? null;
  }, [studentId]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!studentId) {
        setState({ loading: false, error: null, stats: null });
        return;
      }

      setState((s) => ({
        ...s,
        loading: s.stats == null,
        error: null,
      }));
      try {
        const now = new Date();
        const since = new Date(now);
        since.setDate(since.getDate() - 30);
        const responses = await listResponsesForStudentSince(studentId, since.toISOString(), 3000);
        if (cancelled) return;

        const parsed = responses
          .map((r) => {
            const ts = coerceFirestoreDate(
              r.timestamp ?? r.created_at ?? r.createdAt ?? r.answered_at
            );
            if (!ts) return null;
            return {
              ...r,
              timestamp: ts,
              is_correct: coerceBool(r.is_correct),
              difficulty: String(r.difficulty ?? ''),
              subject: String(r.subject ?? ''),
              domain: String(r.domain ?? ''),
              skill: String(r.skill ?? ''),
            };
          })
          .filter(Boolean);

        const responseDayKeySet = new Set(parsed.map((r) => formatDayKey(r.timestamp)));
        const practiceDaysLast30 = responseDayKeySet.size;

        const dayKeys = new Set(responseDayKeySet);
        if (streakGraceDayKey) dayKeys.add(String(streakGraceDayKey));
        const todayKey = formatDayKey(now);
        const todayResponses = parsed.filter((r) => formatDayKey(r.timestamp) === todayKey);

        const uniqueTodayQ = new Set(todayResponses.map(responseQuestionKey).filter(Boolean));
        const todayCompleted = Array.from(uniqueTodayQ).filter(Boolean).length;

        function uniqueTodayWhere(pred) {
          const keys = new Set();
          for (const r of todayResponses) {
            if (!pred(r)) continue;
            const k = responseQuestionKey(r);
            if (k) keys.add(k);
          }
          return keys.size;
        }
        const progressToday = {
          math: uniqueTodayWhere((r) => String(r.subject) === 'Math'),
          readingWriting: uniqueTodayWhere((r) => String(r.subject) === 'English'),
          mixed: uniqueTodayWhere((r) => {
            const s = String(r.subject ?? '');
            return s !== '' && s !== 'Math' && s !== 'English';
          }),
        };

        function subjectBucket(r) {
          const s = String(r.subject ?? '');
          if (s === 'Math') return 'math';
          if (s === 'English') return 'readingWriting';
          return 'mixed';
        }

        const todaySubjectAttempts = {
          math: { attempts: 0, correct: 0 },
          readingWriting: { attempts: 0, correct: 0 },
          mixed: { attempts: 0, correct: 0 },
        };
        for (const r of todayResponses) {
          const b = subjectBucket(r);
          todaySubjectAttempts[b].attempts += 1;
          if (r.is_correct) todaySubjectAttempts[b].correct += 1;
        }
        function accPctFor(attempts, correct) {
          return attempts > 0 ? toPct(correct, attempts) : null;
        }
        const todaySubjectAccuracyPct = {
          math: accPctFor(todaySubjectAttempts.math.attempts, todaySubjectAttempts.math.correct),
          readingWriting: accPctFor(
            todaySubjectAttempts.readingWriting.attempts,
            todaySubjectAttempts.readingWriting.correct
          ),
          mixed: accPctFor(todaySubjectAttempts.mixed.attempts, todaySubjectAttempts.mixed.correct),
        };

        const todayDifficultyLive = { easy: 0, medium: 0, hard: 0 };
        for (const r of todayResponses) {
          const d = String(r.difficulty ?? '');
          if (d === 'Easy') todayDifficultyLive.easy += 1;
          else if (d === 'Medium') todayDifficultyLive.medium += 1;
          else if (d === 'Hard') todayDifficultyLive.hard += 1;
        }

        const tcUnique = todayCompleted || 0;
        const shareOfUnique = {
          math: tcUnique ? Math.round((progressToday.math / tcUnique) * 100) : 0,
          readingWriting: tcUnique ? Math.round((progressToday.readingWriting / tcUnique) * 100) : 0,
          mixed: tcUnique ? Math.round((progressToday.mixed / tcUnique) * 100) : 0,
        };

        const todayCorrect = todayResponses.filter((r) => r.is_correct).length;
        const todayAccuracyPct = todayResponses.length
          ? toPct(todayCorrect, todayResponses.length)
          : 0;

        // compute current hard correct streak for today (ordered oldest->newest)
        const todayChrono = [...todayResponses].sort((a, b) => a.timestamp - b.timestamp);
        let hardStreak = 0;
        for (let i = todayChrono.length - 1; i >= 0; i -= 1) {
          const r = todayChrono[i];
          if (String(r.difficulty) !== 'Hard') continue;
          if (!r.is_correct) break;
          hardStreak += 1;
        }

        const currentStreak = computeCurrentStreak(dayKeys, now);
        const longestStreak = computeLongestStreak(dayKeys);

        const weekStart = startOfWeekMonday(now);
        const weekDays = [];
        for (let i = 0; i < 7; i += 1) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          weekDays.push(dayKeys.has(formatDayKey(d)));
        }

        const weekKeyCutoff = new Date(now);
        weekKeyCutoff.setDate(weekKeyCutoff.getDate() - 7);
        const weekResponses = parsed.filter((r) => r.timestamp >= weekKeyCutoff);
        const weekCorrect = weekResponses.filter((r) => r.is_correct).length;
        const weekTotal = weekResponses.length;
        const weekAccuracyPct = weekTotal ? toPct(weekCorrect, weekTotal) : 0;

        function weekUniqueWhere(pred) {
          const set = new Set();
          for (const r of weekResponses) {
            if (!pred(r)) continue;
            const k = responseQuestionKey(r);
            if (k) set.add(k);
          }
          return set.size;
        }
        const weekUniqueSubjects = {
          math: weekUniqueWhere((r) => String(r.subject) === 'Math'),
          readingWriting: weekUniqueWhere((r) => String(r.subject) === 'English'),
          mixed: weekUniqueWhere((r) => {
            const s = String(r.subject ?? '');
            return s !== '' && s !== 'Math' && s !== 'English';
          }),
        };

        // topic strengths based on skill accuracy this week, require at least 4 attempts
        const bySkill = groupAccuracy(weekResponses, (r) => `${r.subject}|${r.skill}`);
        const eligible = bySkill.filter((x) => x.total >= 4);
        eligible.sort((a, b) => b.pct - a.pct);
        const best = eligible.slice(0, 3).map((x) => {
          const [subject, skill] = x.key.split('|');
          return { label: skill, pct: x.pct, subject, skill };
        });
        const weak = [...eligible].reverse().slice(0, 5).map((x) => {
          const [subject, skill] = x.key.split('|');
          return { label: skill, pct: x.pct, subject, skill, total: x.total };
        });

        const displayWeak = weak.length
          ? weak
          : [...bySkill]
              .filter((x) => x.total >= 2)
              .sort((a, b) => a.pct - b.pct)
              .slice(0, 5)
              .map((x) => {
                const [subject, skill] = x.key.split('|');
                return { label: skill, pct: x.pct, subject, skill, total: x.total };
              });

        let recommendedPractice = null;
        let dailyRecommendedWeakIndex = 0;
        if (displayWeak.length) {
          const { featured: top, index: featIdx } = pickDailyFeaturedWeak(
            displayWeak,
            studentId,
            todayKey
          );
          dailyRecommendedWeakIndex = featIdx;
          const slice = recentSliceForSkill(weekResponses, top.subject, top.label, 6);
          const why = buildRecommendedWhy(top, slice);
          recommendedPractice = {
            subject: top.subject,
            skill: top.skill,
            label: top.label,
            pct: top.pct,
            total: top.total,
            why,
            suggestedDifficulty: 'Medium',
            suggestedCount: 8,
            recentWrong: slice.wrong,
            recentAttempted: slice.attempted,
          };
        }

        const mistakeReviewQueueCount = countMistakeReviewQueue(parsed);

        // daily plan: 5/5/5, completion from todayCompleted
        const dailyGoal = 15;
        const dailyPlan = {
          math: 5,
          readingWriting: 5,
          mixed: 5,
          completedInPlan: Math.min(todayCompleted, dailyGoal),
          totalInPlan: dailyGoal,
          difficultySplit: { easy: 5, medium: 6, hard: 4 },
          progressToday,
          todaySubjectAttempts,
          todaySubjectAccuracyPct,
          weekUniqueSubjects,
          todayDifficultyLive,
          shareOfUnique,
        };

        const seedKey = `${String(studentId)}|${todayKey}`;
        const rng = seededRng(seedKey);
        const challenges = buildDailyChallenges({
          rng,
          todayResponses,
          todayCompleted,
          todayCorrect,
          todayHardCorrectStreak: hardStreak,
          todayAccuracyPct,
          weekResponses,
          parsed,
          todayKey,
        });

        const activity = deriveRecentActivity(todayCompleted, weekCorrect, weekTotal, currentStreak);

        // headline/subtitle derived but kept simple
        const stats = {
          headline: "Today's SAT Practice",
          subtitle: pickDashboardSubtitle(todayKey, todayCompleted > 0),
          dailyProgress: { completed: todayCompleted, goal: dailyGoal },
          todayAccuracyPct,
          weekAccuracyPct,
          currentStreak,
          longestStreak,
          weekPracticeDays: weekDays,
          dailyPlan,
          bestTopics: best.length ? best : [],
          weakTopics: displayWeak,
          recommendedPractice,
          dailyRecommendedWeakIndex,
          commandCenterDayKey: todayKey,
          mistakeReviewQueueCount,
          challenges,
          recentActivity: activity,
          practiceDaysLast30,
          responseRows: parsed,
          lastSession: getLastSessionCard(studentId, { responses: parsed }),
        };

        const prev = lastGoodStatsRef.current;
        const rawRows = responses.length;
        const parseDroppedAll = rawRows > 0 && parsed.length === 0;
        const emptySnapshot = parsed.length === 0 && !statsHasSignal(stats);
        if ((parseDroppedAll || emptySnapshot) && prev && statsHasSignal(prev)) {
          setState({ loading: false, error: null, stats: prev });
          return;
        }

        lastGoodStatsRef.current = stats;
        writeDashStatsCache(studentId, stats);
        setState({ loading: false, error: null, stats });
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({
          loading: false,
          error: e,
          stats: s.stats,
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [studentId, streakGraceDayKey]);

  // Ensure arrays exist even if empty, keep UI stable
  const mergedStats = React.useMemo(() => {
    if (!state.stats) return null;
    const dp = state.stats.dailyPlan ?? {};
    const basePlan = emptyStudentDashboard.dailyPlan;
    return {
      ...state.stats,
      bestTopics: state.stats.bestTopics ?? [],
      weakTopics: state.stats.weakTopics ?? [],
      recommendedPractice: state.stats.recommendedPractice ?? null,
      dailyRecommendedWeakIndex: Number(state.stats.dailyRecommendedWeakIndex) || 0,
      commandCenterDayKey: state.stats.commandCenterDayKey ?? '',
      mistakeReviewQueueCount: Number(state.stats.mistakeReviewQueueCount) || 0,
      challenges: state.stats.challenges ?? [],
      recentActivity: state.stats.recentActivity ?? [],
      responseRows: state.stats.responseRows ?? [],
      lastSession: state.stats.lastSession ?? null,
      dailyPlan: {
        ...basePlan,
        ...dp,
        progressToday: {
          ...basePlan.progressToday,
          ...(dp.progressToday ?? {}),
        },
      },
    };
  }, [state.stats]);

  /** Never regress UI to “empty” after a good snapshot (bad fetch / parse / cache). */
  const displayStats = React.useMemo(() => {
    const m = mergedStats;
    const p = lastGoodStatsRef.current;
    if (m && statsHasSignal(m)) return m;
    if (m && !statsHasSignal(m) && p && statsHasSignal(p)) return p;
    if (m && m.dailyProgress && Number.isFinite(Number(m.dailyProgress.completed))) return m;
    if (p && p.dailyProgress) return p;
    const fromDisk = readDashStatsCache(studentId);
    if (fromDisk && fromDisk.dailyProgress) return fromDisk;
    return m;
  }, [mergedStats, studentId]);

  return { ...state, stats: displayStats };
}
