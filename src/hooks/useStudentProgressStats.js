import React from 'react';
import { listResponsesForStudentSince } from '../lib/firebase';
import {
  readProgressStatsCache,
  writeProgressStatsCache,
} from '../lib/firestoreDates';
import {
  computeProgressStats,
  computeCoverage,
  parseResponses,
} from '../lib/progressStats';

function statsHasSignal(s) {
  if (!s) return false;
  if (s.totalsLast30?.attempts > 0) return true;
  if (s.dailyVolume?.some((d) => d.count > 0)) return true;
  return false;
}

/**
 * Fetches last 30 days of responses and derives Progress page metrics.
 * @param {{ studentId?: string, questions?: unknown[] }} opts
 */
export function useStudentProgressStats({ studentId, questions = [] } = {}) {
  const lastGoodRef = React.useRef(null);
  const lastParsedRef = React.useRef(null);
  const questionsRef = React.useRef(questions);
  questionsRef.current = questions;

  const [state, setState] = React.useState(() => {
    const disk = studentId ? readProgressStatsCache(studentId) : null;
    if (disk) lastGoodRef.current = disk;
    return {
      loading: !disk,
      error: null,
      stats: disk,
    };
  });

  React.useLayoutEffect(() => {
    lastParsedRef.current = null;
    if (!studentId) {
      lastGoodRef.current = null;
      return;
    }
    lastGoodRef.current = readProgressStatsCache(studentId) ?? null;
  }, [studentId]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!studentId) {
        lastParsedRef.current = null;
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
        const raw = await listResponsesForStudentSince(
          studentId,
          since.toISOString(),
          3000
        );
        if (cancelled) return;

        const parsed = parseResponses(raw);
        lastParsedRef.current = parsed;
        const base = computeProgressStats(parsed, now);
        const stats = { ...base, coverage: computeCoverage(parsed, questionsRef.current) };

        const prev = lastGoodRef.current;
        const rawRows = raw.length;
        const parseDroppedAll = rawRows > 0 && parsed.length === 0;
        const emptySnapshot = parsed.length === 0 && !statsHasSignal(stats);
        if ((parseDroppedAll || emptySnapshot) && prev && statsHasSignal(prev)) {
          setState({ loading: false, error: null, stats: prev });
          return;
        }

        lastGoodRef.current = stats;
        writeProgressStatsCache(studentId, stats);
        setState({ loading: false, error: null, stats });
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({
          loading: false,
          error: e,
          stats: s.stats ?? lastGoodRef.current,
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  /** Re-merge coverage when the question bank finishes loading (no extra network). */
  React.useEffect(() => {
    if (!studentId || !lastParsedRef.current) return;
    const parsed = lastParsedRef.current;
    const now = new Date();
    const base = computeProgressStats(parsed, now);
    const stats = { ...base, coverage: computeCoverage(parsed, questions) };
    lastGoodRef.current = stats;
    writeProgressStatsCache(studentId, stats);
    setState((s) => ({ ...s, stats }));
  }, [studentId, questions]);

  return state;
}
