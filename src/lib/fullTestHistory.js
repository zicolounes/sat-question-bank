const HISTORY_VERSION = 1;

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  // Short, URL-safe id (good enough for local history)
  return `ft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function keyForStudent(studentId) {
  return `sat-full-test-history:${studentId || 'anon'}`;
}

function safeParseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function listFullTestAttempts({ studentId }) {
  const key = keyForStudent(studentId);
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const parsed = safeParseJson(raw, null);
  if (!parsed || !Array.isArray(parsed.attempts)) return [];
  return parsed.attempts;
}

export function getFullTestAttempt({ studentId, attemptId }) {
  const attempts = listFullTestAttempts({ studentId });
  return attempts.find((a) => a?.id === attemptId) || null;
}

export function saveFullTestAttempt({ studentId, attempt }) {
  const key = keyForStudent(studentId);
  const existing = listFullTestAttempts({ studentId });

  const normalized = {
    version: HISTORY_VERSION,
    id: attempt?.id || makeId(),
    createdAt: attempt?.createdAt || nowIso(),
    completedAt: attempt?.completedAt || nowIso(),
    meta: attempt?.meta || {},
    results: attempt?.results || null,
    modules: attempt?.modules || null,
    answers: attempt?.answers || {},
    flagged: attempt?.flagged || [],
  };

  const next = [normalized, ...existing.filter((a) => a?.id !== normalized.id)].slice(0, 50);
  localStorage.setItem(key, JSON.stringify({ version: HISTORY_VERSION, attempts: next }));
  return normalized;
}

export function deleteFullTestAttempt({ studentId, attemptId }) {
  const key = keyForStudent(studentId);
  const existing = listFullTestAttempts({ studentId });
  const next = existing.filter((a) => a?.id !== attemptId);
  localStorage.setItem(key, JSON.stringify({ version: HISTORY_VERSION, attempts: next }));
}

