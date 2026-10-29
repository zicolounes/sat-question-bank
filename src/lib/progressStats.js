import { coerceFirestoreDate } from './firestoreDates';
import { formatDayKey, startOfLocalDay } from './practiceStreaks';

function coerceBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/** Stable id for de-duping attempts per question. */
export function responseQuestionKey(r) {
  if (!r || typeof r !== 'object') return '';
  const raw = r.question_id ?? r.questionId ?? r.q_id ?? r.questionID;
  if (raw == null || raw === '') return '';
  return String(raw).trim();
}

export function parseResponses(rawRows) {
  return (rawRows ?? [])
    .map((r) => {
      const ts = coerceFirestoreDate(
        r.timestamp ?? r.created_at ?? r.createdAt ?? r.answered_at
      );
      if (!ts) return null;
      const sec = Number(r.time_spent_seconds ?? r.timeSpentSeconds);
      return {
        ...r,
        timestamp: ts,
        is_correct: coerceBool(r.is_correct),
        difficulty: String(r.difficulty ?? ''),
        subject: String(r.subject ?? ''),
        domain: String(r.domain ?? ''),
        skill: String(r.skill ?? ''),
        time_spent_seconds: Number.isFinite(sec) ? sec : NaN,
        answer_changed: Boolean(r.answer_changed),
      };
    })
    .filter(Boolean);
}

function toPct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function startOfWeekMonday(date) {
  const d = startOfLocalDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** Last `days` calendar days ending at `now`, oldest first. Each: { dayKey, count } unique questions that day. */
export function dailyVolumeSeries(parsed, now = new Date(), days = 30) {
  const end = startOfLocalDay(now);
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = formatDayKey(d);
    const dayStart = startOfLocalDay(d);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const uniq = new Set();
    for (const r of parsed) {
      if (r.timestamp < dayStart || r.timestamp >= dayEnd) continue;
      const qk = responseQuestionKey(r);
      if (qk) uniq.add(qk);
    }
    out.push({ dayKey: key, count: uniq.size });
  }
  return out;
}

export function subjectBreakdown(parsed) {
  const subjects = ['Math', 'English'];
  const out = {};
  for (const s of subjects) {
    const rows = parsed.filter((r) => String(r.subject) === s);
    const correct = rows.filter((r) => r.is_correct).length;
    const total = rows.length;
    out[s] = { attempts: total, correct, pct: toPct(correct, total) };
  }
  return out;
}

const DIFF_ORDER = ['Easy', 'Medium', 'Hard'];

export function difficultyBreakdown(parsed) {
  const out = {};
  for (const d of DIFF_ORDER) {
    const rows = parsed.filter((r) => String(r.difficulty) === d);
    const correct = rows.filter((r) => r.is_correct).length;
    const total = rows.length;
    out[d] = { attempts: total, correct, pct: toPct(correct, total) };
  }
  return out;
}

export function skillBreakdown(parsed) {
  const m = new Map();
  for (const r of parsed) {
    const sub = String(r.subject ?? '');
    const dom = String(r.domain ?? '');
    const sk = String(r.skill ?? '');
    if (!sub || !dom || !sk) continue;
    const key = `${sub}|${dom}|${sk}`;
    const prev = m.get(key) ?? { subject: sub, domain: dom, skill: sk, attempts: 0, correct: 0 };
    prev.attempts += 1;
    if (r.is_correct) prev.correct += 1;
    m.set(key, prev);
  }
  return Array.from(m.values()).map((v) => ({
    subject: v.subject,
    domain: v.domain,
    skill: v.skill,
    attempts: v.attempts,
    correct: v.correct,
    pct: toPct(v.correct, v.attempts),
  }));
}

function avgSeconds(rows) {
  const vals = rows
    .map((r) => Number(r.time_spent_seconds))
    .filter((n) => Number.isFinite(n) && n >= 1);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 10) / 10;
}

export function pace(parsed) {
  const bySubject = {};
  for (const s of ['Math', 'English']) {
    const rows = parsed.filter((r) => String(r.subject) === s);
    bySubject[s] = { avgSeconds: avgSeconds(rows), attempts: rows.length };
  }
  const byDifficulty = {};
  for (const d of DIFF_ORDER) {
    const rows = parsed.filter((r) => String(r.difficulty) === d);
    byDifficulty[d] = { avgSeconds: avgSeconds(rows), attempts: rows.length };
  }
  return { bySubject, byDifficulty };
}

/** Four Monday-start weeks: oldest first (W-3 … this week). This week ends at `now`. */
export function weeklyTrend(parsed, now = new Date(), weeks = 4) {
  const monThis = startOfWeekMonday(now);
  const out = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    const start = new Date(monThis);
    start.setDate(start.getDate() - w * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const upper = w === 0 ? new Date(Math.min(now.getTime(), end.getTime())) : end;
    const slice = parsed.filter((r) => r.timestamp >= start && r.timestamp < upper);
    const correct = slice.filter((r) => r.is_correct).length;
    const total = slice.length;
    out.push({
      weekStart: formatDayKey(start),
      attempts: total,
      correct,
      pct: toPct(correct, total),
    });
  }
  return out;
}

/** Oldest → newest: 30 booleans, true if unique questions that day ≥ goal. */
export function goalHitRate(parsed, now = new Date(), days = 30, goal = 15) {
  const series = dailyVolumeSeries(parsed, now, days);
  return series.map((d) => d.count >= goal);
}

export function comebackRate(parsed) {
  const byQ = new Map();
  for (const r of [...parsed].sort((a, b) => a.timestamp - b.timestamp)) {
    const qk = responseQuestionKey(r);
    if (!qk) continue;
    let st = byQ.get(qk) ?? { everWrong: false, recovered: false };
    if (r.is_correct) {
      if (st.everWrong) st = { ...st, recovered: true };
    } else {
      st = { ...st, everWrong: true };
    }
    byQ.set(qk, st);
  }
  let everMissed = 0;
  let recovered = 0;
  for (const st of byQ.values()) {
    if (st.everWrong) {
      everMissed += 1;
      if (st.recovered) recovered += 1;
    }
  }
  return {
    everMissed,
    recovered,
    pct: everMissed ? Math.round((recovered / everMissed) * 100) : 0,
  };
}

export function bestDay(parsed, now = new Date(), days = 30) {
  const series = dailyVolumeSeries(parsed, now, days);
  let best = { dayKey: '', count: 0 };
  for (const d of series) {
    if (d.count > best.count) best = { dayKey: d.dayKey, count: d.count };
  }
  return best;
}

/** First chronological attempt per question in window: % correct. */
export function firstTryAccuracy(parsed) {
  const byQ = new Map();
  const chrono = [...parsed].sort((a, b) => a.timestamp - b.timestamp);
  for (const r of chrono) {
    const qk = responseQuestionKey(r);
    if (!qk || byQ.has(qk)) continue;
    byQ.set(qk, r.is_correct);
  }
  let correct = 0;
  let total = 0;
  for (const ok of byQ.values()) {
    total += 1;
    if (ok) correct += 1;
  }
  return { firstTry: total, correct, pct: toPct(correct, total) };
}

export function totalsLast30(parsed) {
  const attempts = parsed.length;
  const correct = parsed.filter((r) => r.is_correct).length;
  return { attempts, correct, pct: toPct(correct, attempts) };
}

/**
 * Full stats bundle for Progress page.
 */
export function computeProgressStats(parsed, now = new Date()) {
  const dailyVolume = dailyVolumeSeries(parsed, now, 30);
  return {
    totalsLast30: totalsLast30(parsed),
    dailyVolume,
    subject: subjectBreakdown(parsed),
    difficulty: difficultyBreakdown(parsed),
    skills: skillBreakdown(parsed),
    pace: pace(parsed),
    weekly: weeklyTrend(parsed, now, 4),
    goalHits: goalHitRate(parsed, now, 30, 15),
    comeback: comebackRate(parsed),
    bestDay: bestDay(parsed, now, 30),
    firstTry: firstTryAccuracy(parsed),
  };
}

/** Coverage: unique skills/domains attempted vs bank. */
export function computeCoverage(parsed, questions) {
  const skillKeys = new Set();
  const domainKeys = new Set();
  for (const r of parsed) {
    const sub = String(r.subject ?? '');
    const dom = String(r.domain ?? '');
    const sk = String(r.skill ?? '');
    if (sub && dom && sk) skillKeys.add(`${sub}|${dom}|${sk}`);
    if (sub && dom) domainKeys.add(`${sub}|${dom}`);
  }
  const bankSkills = new Set();
  const bankDomains = new Set();
  for (const q of questions ?? []) {
    if (q.subject && q.domain && q.skill) bankSkills.add(`${q.subject}|${q.domain}|${q.skill}`);
    if (q.subject && q.domain) bankDomains.add(`${q.subject}|${q.domain}`);
  }
  return {
    attemptedSkills: skillKeys.size,
    totalSkills: bankSkills.size || 0,
    attemptedDomains: domainKeys.size,
    totalDomains: bankDomains.size || 0,
  };
}
