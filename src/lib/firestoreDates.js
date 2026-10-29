/** Normalize Firestore timestamp field (string | Timestamp | Date | number | plain seconds object) to Date or null. */
export function coerceFirestoreDate(value) {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    const ms = value.seconds * 1000 + (Number(value.nanoseconds) || 0) / 1e6;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dashStatsCacheKey(studentId) {
  return `llDashStats:${String(studentId ?? '')}`;
}

export function readDashStatsCache(studentId) {
  if (!studentId) return null;
  try {
    const raw = sessionStorage.getItem(dashStatsCacheKey(studentId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : null;
  } catch {
    return null;
  }
}

export function writeDashStatsCache(studentId, stats) {
  if (!studentId || !stats) return;
  try {
    sessionStorage.setItem(dashStatsCacheKey(studentId), JSON.stringify(stats));
  } catch {
    /* quota / private mode */
  }
}

export function progressStatsCacheKey(studentId) {
  return `progress-stats:${String(studentId ?? '')}`;
}

export function readProgressStatsCache(studentId) {
  if (!studentId) return null;
  try {
    const raw = sessionStorage.getItem(progressStatsCacheKey(studentId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : null;
  } catch {
    return null;
  }
}

export function writeProgressStatsCache(studentId, stats) {
  if (!studentId || !stats) return;
  try {
    sessionStorage.setItem(progressStatsCacheKey(studentId), JSON.stringify(stats));
  } catch {
    /* quota / private mode */
  }
}
