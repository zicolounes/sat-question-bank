const STORAGE_VERSION = 1;
const FULL_TEST_STORAGE_KEY = 'sat-full-test-session';

export const GET_STARTED_SESSION = {
  variant: 'getStarted',
  kicker: 'Get started',
  label: 'Your first practice set',
  detail:
    'Choose a topic and work through questions one at a time. After your first round, your last session will show up here.',
  href: '/practice',
  cta: 'Start practicing',
  linkState: undefined,
};

function storageKey(studentId) {
  return `sat-last-session-${String(studentId)}`;
}

function formatWhen(ts) {
  const t = Number(ts);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h ago`;
  return new Date(t).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function subjectLabel(subject) {
  if (subject === 'English') return 'R&W';
  if (subject === 'Math') return 'Math';
  return subject || '';
}

export function buildPracticeSessionLabel(questions) {
  const q = questions?.[0];
  if (!q) return 'Practice set';
  const parts = [];
  const sub = subjectLabel(q.subject);
  if (sub) parts.push(sub);
  if (q.skill) parts.push(q.skill);
  else if (q.domain) parts.push(q.domain);
  if (q.difficulty) parts.push(q.difficulty);
  return parts.length ? parts.join(' · ') : 'Practice set';
}

function uniqueQuestionIds(questionsOrRows) {
  const seen = new Set();
  const ids = [];
  for (const item of questionsOrRows ?? []) {
    const id = Number(item.id ?? item.question_id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function fullTestPhaseLabel(mode) {
  const map = {
    'rw-1': 'Reading & Writing · Module 1',
    'rw-2': 'Reading & Writing · Module 2',
    break: 'Break',
    'math-1': 'Math · Module 1',
    'math-2': 'Math · Module 2',
    starting: 'Starting test',
  };
  return map[mode] || 'In progress';
}

/** Active full-length test saved by FullTestPage (not yet submitted). */
export function loadInProgressFullTest() {
  try {
    const raw = localStorage.getItem(FULL_TEST_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.mode || data.mode === 'intro' || data.mode === 'results') return null;
    return {
      mode: data.mode,
      savedAt: Number(data.savedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function buildResumeNavigation(last) {
  if (!last) return { href: '/practice', state: undefined };

  if (last.kind === 'fullTest') {
    if (last.inProgress || loadInProgressFullTest()) {
      return { href: '/full-test', state: undefined };
    }
    return { href: last.href ?? '/tests', state: undefined };
  }

  if (last.inProgress && last.session?.questionIds?.length) {
    return { href: '/practice', state: { resumePractice: true } };
  }

  const ids = last.questionIds ?? last.session?.questionIds;
  if (Array.isArray(ids) && ids.length) {
    return { href: '/practice', state: { resumeAuto: { ids } } };
  }

  return { href: last.href ?? '/practice', state: undefined };
}

function toResumeCard(last, { inProgress = false } = {}) {
  const nav = buildResumeNavigation(last);
  const kind = last.kind ?? 'practice';
  return {
    variant: 'last',
    kicker: 'Resume last session',
    kind,
    label: last.label ?? (kind === 'fullTest' ? 'Full-length SAT practice' : 'Practice set'),
    detail: last.detail ?? '',
    href: nav.href,
    linkState: nav.state,
    cta:
      kind === 'fullTest'
        ? inProgress
          ? 'Resume test'
          : 'View past tests'
        : inProgress
          ? 'Resume last session'
          : 'Practice again',
    progress: Number(last.progress) || 0,
    savedAt: last.savedAt,
    inProgress,
  };
}

export function saveLastSession(studentId, payload) {
  if (!studentId || !payload) return;
  try {
    localStorage.setItem(
      storageKey(studentId),
      JSON.stringify({
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        ...payload,
      })
    );
  } catch {
    /* quota */
  }
}

export function loadLastSession(studentId) {
  if (!studentId) return null;
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== STORAGE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

/** Persist live practice so dashboard resume returns to the same question. */
export function saveInProgressPractice(studentId, session) {
  if (!studentId || !session?.questions?.length) return;
  const total = session.questions.length;
  const idx = Math.min(Math.max(0, Number(session.idx) || 0), total - 1);
  const answered = Object.keys(session.answers ?? {}).length;
  saveLastSession(studentId, {
    inProgress: true,
    kind: 'practice',
    session: {
      session_id: session.session_id,
      questionIds: uniqueQuestionIds(session.questions),
      idx,
      answers: session.answers ?? {},
      eliminated: session.eliminated ?? {},
      scoreByDomain: session.scoreByDomain ?? {},
    },
    label: buildPracticeSessionLabel(session.questions),
    detail: `Question ${idx + 1} of ${total}${answered ? ` · ${answered} answered` : ''}`,
    savedAt: Date.now(),
  });
}

/** Build a card payload from Firestore practice responses (grouped by session_id). */
export function deriveLastSessionFromResponses(responses) {
  if (!Array.isArray(responses) || !responses.length) return null;

  const bySession = new Map();
  for (const r of responses) {
    const sid = String(r.session_id ?? '').trim() || `orphan-${r.timestamp}`;
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid).push(r);
  }

  let bestRows = null;
  let bestTs = 0;
  for (const rows of bySession.values()) {
    const ts = Math.max(...rows.map((r) => Number(r.timestamp) || 0));
    if (ts > bestTs) {
      bestTs = ts;
      bestRows = rows;
    }
  }
  if (!bestRows?.length) return null;

  const sorted = [...bestRows].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const total = sorted.length;
  const correct = sorted.filter((r) => r.is_correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const label = buildPracticeSessionLabel(sorted);
  const when = formatWhen(bestTs);
  const questionIds = uniqueQuestionIds(sorted);

  return {
    kind: 'practice',
    savedAt: bestTs,
    label,
    detail: `${correct}/${total} correct (${pct}%)${when ? ` · ${when}` : ''}`,
    href: '/practice',
    cta: 'Practice again',
    progress: pct / 100,
    questionIds,
  };
}

function pickNewer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (Number(a.savedAt) || 0) >= (Number(b.savedAt) || 0) ? a : b;
}

/**
 * Always returns a card model for the dashboard — last activity or get-started.
 */
export function getLastSessionCard(studentId, { responses = [], questionsAnswered = 0 } = {}) {
  const inProgressTest = loadInProgressFullTest();
  if (inProgressTest) {
    const when = formatWhen(inProgressTest.savedAt);
    return toResumeCard(
      {
        kind: 'fullTest',
        inProgress: true,
        label: 'Full-length SAT practice',
        detail: `${fullTestPhaseLabel(inProgressTest.mode)}${when ? ` · ${when}` : ''}`,
        savedAt: inProgressTest.savedAt,
      },
      { inProgress: true }
    );
  }

  const stored = studentId ? loadLastSession(studentId) : null;
  if (stored?.inProgress && stored.session?.questionIds?.length) {
    const idx = Number(stored.session.idx) || 0;
    const total = stored.session.questionIds.length;
    return toResumeCard(
      {
        ...stored,
        detail: `Question ${Math.min(idx + 1, total)} of ${total} · in progress`,
      },
      { inProgress: true }
    );
  }

  const derived = deriveLastSessionFromResponses(responses);
  const completedStored = stored && !stored.inProgress ? stored : null;
  const last = pickNewer(completedStored, derived);

  const hasActivity =
    Number(questionsAnswered) > 0 || (Array.isArray(responses) && responses.length > 0) || Boolean(last);

  if (!hasActivity) {
    return { ...GET_STARTED_SESSION };
  }

  if (!last) {
    return {
      variant: 'last',
      kicker: 'Resume last session',
      label: 'Practice',
      detail: 'Pick up with another focused set whenever you are ready.',
      href: '/practice',
      cta: 'Resume last session',
      linkState: undefined,
    };
  }

  return toResumeCard(last, { inProgress: false });
}

export function saveLastPracticeRound(studentId, session) {
  if (!studentId || !session?.questions?.length) return;
  const total = session.questions.length;
  const correct = Object.values(session.answers ?? {}).filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const questionIds = uniqueQuestionIds(session.questions);
  saveLastSession(studentId, {
    inProgress: false,
    kind: 'practice',
    label: buildPracticeSessionLabel(session.questions),
    detail: `${correct}/${total} correct (${pct}%) · Just now`,
    href: '/practice',
    cta: 'Practice again',
    progress: pct / 100,
    questionIds,
  });
}

export function saveLastFullTest(studentId, { scoreLabel, detail, href = '/tests' }) {
  if (!studentId) return;
  saveLastSession(studentId, {
    inProgress: false,
    kind: 'fullTest',
    label: scoreLabel || 'Full practice test',
    detail: detail || 'Completed · Just now',
    href,
    cta: 'View past tests',
    progress: 0,
  });
}
