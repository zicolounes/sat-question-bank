import React from 'react';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { DashProgressBar } from '../components/dashboard/DashProgressBar';
import { listResponsesForAdminSince } from '../lib/firebase';
import { coerceFirestoreDate } from '../lib/firestoreDates';
import { computeCurrentStreak, formatDayKey } from '../lib/practiceStreaks';

function toPct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function computeWeekAccuracy(responses, now) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  const week = responses.filter((r) => r.ts >= cutoff);
  const correct = week.filter((r) => r.isCorrect).length;
  return { pct: toPct(correct, week.length), total: week.length, wrong: week.length - correct };
}

function formatLastActive(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const sameDay = formatDayKey(d) === formatDayKey(now);
  if (sameDay) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (formatDayKey(d) === formatDayKey(y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatCell({ label, value, sub, tone = 'ink' }) {
  const toneClass =
    tone === 'jade' ? 'text-jade' : tone === 'accent' ? 'text-accent' : 'text-mist';
  return (
    <div className="px-3 py-3">
      <div className={`kicker ${toneClass}`}>{label}</div>
      <div className="mt-1 stat-num text-base font-semibold text-ink">{value}</div>
      {sub ? (
        <div className="mt-1 text-[10.63px] uppercase tracking-kicker text-mist">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function AdminStudentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [hitLimit, setHitLimit] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      setHitLimit(false);
      try {
        const now = new Date();
        const since = new Date(now);
        since.setDate(since.getDate() - 30);
        const res = await listResponsesForAdminSince(since.toISOString(), 10000);
        if (cancelled) return;

        if (res.length >= 10000) setHitLimit(true);

        const parsed = res
          .map((r) => {
            const ts = coerceFirestoreDate(r.timestamp);
            if (!ts) return null;
            const studentId = String(r.student_id ?? '');
            if (!studentId) return null;
            return {
              studentId,
              email: String(r.student_email ?? '').toLowerCase(),
              name: String(r.student_name ?? ''),
              isCorrect: Boolean(r.is_correct),
              qid: Number(r.question_id),
              ts,
            };
          })
          .filter(Boolean);

        const byStudent = new Map();
        for (const r of parsed) {
          const prev = byStudent.get(r.studentId) ?? [];
          prev.push(r);
          byStudent.set(r.studentId, prev);
        }

        const today = formatDayKey(now);
        const out = Array.from(byStudent.entries()).map(([studentId, attempts]) => {
          const days = new Set(attempts.map((a) => formatDayKey(a.ts)));
          const streak = computeCurrentStreak(days, now);
          const todayAttempts = attempts.filter((a) => formatDayKey(a.ts) === today);
          const todayUnique = new Set(todayAttempts.map((a) => a.qid).filter((n) => Number.isFinite(n)));
          const todayDone = todayUnique.size;
          const todayWrongAttempts = todayAttempts.filter((a) => !a.isCorrect).length;
          const todayRight = todayAttempts.filter((a) => a.isCorrect).length;
          const todayAcc = toPct(todayRight, todayAttempts.length);
          const week = computeWeekAccuracy(attempts, now);
          const monthWrong = attempts.filter((a) => !a.isCorrect).length;
          const monthRight = attempts.filter((a) => a.isCorrect).length;
          const lastTs = Math.max(...attempts.map((a) => a.ts.getTime()));

          const sorted = [...attempts].sort((a, b) => b.ts - a.ts);
          const latest = sorted.find((x) => x.email || x.name) ?? sorted[0];
          const email = latest?.email || '(missing email)';
          const name = latest?.name || email.split('@')[0] || 'Student';

          return {
            studentId,
            name,
            email,
            streak,
            todayDone,
            todayAttempts: todayAttempts.length,
            todayWrong: todayWrongAttempts,
            todayAcc,
            weekAcc: week.pct,
            weekTotal: week.total,
            weekWrong: week.wrong,
            totalAttempts: attempts.length,
            monthWrong,
            monthRight,
            lastActive: lastTs,
          };
        });

        out.sort((a, b) => b.lastActive - a.lastActive);
        setRows(out);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-sm text-mist">
          <Spinner />
          <span className="text-[11.69px] uppercase tracking-kicker">
            Loading practice logs
          </span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="kicker text-accent">Error</div>
        <div className="mt-2 text-sm font-semibold text-ink">Couldn’t load student progress.</div>
        <div className="mt-2 text-sm text-mist">{String(error?.message ?? error)}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="mb-6">
        <div className="kicker">Instructor / Class</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Class activity
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Everyone who logged practice in the last 30 days from the Firestore{' '}
          <span className="text-ink">responses</span> collection.
        </p>
      </div>

      {hitLimit ? (
        <Card className="p-4">
          <div className="kicker text-accent">Limit reached</div>
          <div className="mt-2 text-sm text-mist">
            Showing the latest <span className="font-semibold text-ink">10,000</span> response
            rows from this window. If your class is larger, totals may be slightly truncated.
          </div>
        </Card>
      ) : null}

      {!rows.length ? (
        <Card className="p-8">
          <div className="kicker">Empty</div>
          <div className="mt-2 text-sm text-ink">
            No responses in the last 30 days yet. When students practice, their rows show up here.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.studentId} className="overflow-hidden transition-colors hover:border-ink">
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="kicker">Student</div>
                  <div className="font-display mt-1 text-lg font-bold text-ink">{r.name}</div>
                  <div className="mt-0.5 truncate text-sm text-mist">{r.email}</div>
                  <div className="mt-2 text-[10.63px] uppercase tracking-kicker text-mist">
                    Last · {formatLastActive(r.lastActive)} · uid {r.studentId.slice(0, 8)}…
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 divide-x divide-y divide-rule border border-rule sm:grid-cols-3 lg:w-auto lg:min-w-[600px] lg:grid-cols-6 lg:divide-y-0">
                  <StatCell label="Today Q" value={r.todayDone} sub="unique" />
                  <StatCell label="Today try" value={r.todayAttempts} sub="attempts" />
                  <StatCell label="Wrong tdy" value={r.todayWrong} sub="misses" tone="accent" />
                  <StatCell label="Streak" value={`${r.streak}d`} tone="accent" />
                  <StatCell
                    label="30d"
                    value={`${r.monthRight}/${r.monthRight + r.monthWrong}`}
                    sub="right / total"
                    tone="jade"
                  />
                  <div className="px-3 py-3">
                    <div className="kicker">Week acc</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="min-w-0 flex-1 pt-1">
                        <DashProgressBar
                          value={r.weekAcc}
                          max={100}
                          height="h-px"
                          palette="accent"
                        />
                      </div>
                      <span className="stat-num text-sm text-ink">{r.weekAcc}%</span>
                    </div>
                    <div className="mt-1 text-[10.63px] uppercase tracking-kicker text-mist">
                      {r.weekTotal} tries
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
