import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { DashProgressBar } from './DashProgressBar';
import { ResumeSessionCard } from './ResumeSessionCard';
import { useLastSessionCard } from '../../hooks/useLastSessionCard';

function SkeletonLine({ className }) {
  return (
    <div
      className={clsx('animate-pulse rounded-sm bg-ink/[0.06]', className)}
      aria-hidden
    />
  );
}

const MIX_ROW_TONE = {
  math: { label: 'text-accent', track: 'bg-accent/[0.14]' },
  rw: { label: 'text-iris', track: 'bg-iris/[0.12]' },
  mixed: { label: 'text-sky', track: 'bg-sky-soft/30' },
};

function accuracyTone(pct) {
  if (pct >= 70) return 'text-jade';
  if (pct >= 40) return 'text-accent';
  return 'text-ink';
}

function DailyMixRow({ label, done, target, loading, tone = 'math' }) {
  const mixGoal = Math.max(1, Number(target) || 1);
  const mixDone = Math.min(Math.max(0, Number(done) || 0), mixGoal);
  const t = MIX_ROW_TONE[tone] ?? MIX_ROW_TONE.math;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={clsx(
            'text-[11.69px] font-semibold uppercase tracking-kicker',
            loading ? 'text-mist' : t.label
          )}
        >
          {label}
        </span>
        <span className="text-xs font-medium tabular-nums text-ink">
          {loading ? '—' : `${mixDone}/${mixGoal}`}
        </span>
      </div>
      <DashProgressBar
        value={mixDone}
        max={mixGoal}
        height="h-1"
        palette="byPercent"
        trackClassName={loading ? undefined : t.track}
        className="mt-2"
      />
    </div>
  );
}

/**
 * Editorial intro block — left: kicker + display headline + dek.
 * Right: compact today snapshot card (stats + daily mix).
 */
export function DashboardHero({ data, loading, studentId, questionsAnswered = 0, className }) {
  const lastSession = useLastSessionCard(studentId, {
    questionsAnswered,
    responseRows: data?.responseRows,
    statsLoading: loading,
  });
  const goalRaw = Number(data?.dailyProgress?.goal);
  const doneRaw = Number(data?.dailyProgress?.completed);
  const goal = Number.isFinite(goalRaw) && goalRaw > 0 ? goalRaw : 15;
  const completed = Number.isFinite(doneRaw) ? Math.max(0, doneRaw) : 0;
  const pct = goal <= 0 ? 0 : Math.min(100, Math.round((completed / goal) * 100));
  const todayAcc = Number.isFinite(Number(data.todayAccuracyPct)) ? Number(data.todayAccuracyPct) : 0;
  const weekAcc = Number.isFinite(Number(data.weekAccuracyPct)) ? Number(data.weekAccuracyPct) : 0;
  const leftToday = Math.max(0, goal - completed);
  const plan = data?.dailyPlan ?? {};
  const progressToday = plan.progressToday ?? {};
  const mixMath = Number(plan.math) || 5;
  const mixRw = Number(plan.readingWriting) || 5;
  const mixMixed = Number(plan.mixed) || 5;

  return (
    <section className={clsx('relative', className)}>
      <div className="flex items-baseline justify-end pb-0.5">
        <div className="kicker hidden sm:block">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid gap-4 pt-1 sm:gap-5 sm:pt-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,44rem)] lg:items-start lg:gap-8 xl:gap-10">
        <div className="flex flex-col pt-2 sm:pt-4 lg:pt-12">
          <div>
            <div className="kicker">{loading ? 'Syncing' : '01 / Today'}</div>
            {loading ? (
            <div className="space-y-3">
              <SkeletonLine className="h-12 w-[88%] max-w-2xl" />
              <SkeletonLine className="h-12 w-[64%] max-w-xl" />
              <SkeletonLine className="mt-6 h-4 w-full max-w-lg" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-display text-balance text-3xl font-bold leading-[1.05] tracking-tight text-ink sm:text-4xl lg:text-5xl xl:text-[59.5px]">
                {data.headline}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist sm:mt-4 sm:text-[15.94px]">
                {data.subtitle}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                <Link
                  to="/full-test"
                  className="type-nav-cta col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm leading-none text-white shadow-sm preserve-brand-colors transition-colors hover:bg-accent-hover active:bg-accent-deep ring-1 ring-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:col-span-1 sm:h-12 sm:px-6"
                >
                  Full practice test
                  <span aria-hidden className="leading-none">
                    →
                  </span>
                </Link>
                <Link
                  to="/practice"
                  className="type-nav-cta inline-flex h-10 items-center justify-center gap-2 rounded-sm border-2 border-accent px-3 text-sm leading-none text-accent sm:h-12 sm:px-6 transition-colors hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Practice
                </Link>
                <Link
                  to="/tests"
                  className="type-nav-cta inline-flex h-10 items-center justify-center rounded-sm bg-paper px-3 text-sm text-ink shadow-soft sm:h-12 sm:px-6 transition-colors hover:bg-canvas/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Past tests
                </Link>
                <Link
                  to="/review"
                  className="type-nav-cta col-span-2 inline-flex h-10 items-center justify-center rounded-sm border border-ink px-3 text-sm text-ink transition-colors hover:bg-ink hover:text-white sm:col-span-1 sm:h-12 sm:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Review mistakes
                </Link>
              </div>
            </motion.div>
          )}
          </div>

          <ResumeSessionCard session={lastSession} loading={loading} stacked distinct />
        </div>

        <aside className="lg:pt-5 lg:self-stretch">
          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-4 shadow-soft ring-1 ring-accent/[0.12] sm:p-6 lg:p-7">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-sm bg-accent/[0.07] px-3 py-3 ring-1 ring-accent/[0.14]">
                <div className="kicker text-accent">Today</div>
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-24" />
                ) : (
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="stat-num text-2xl font-semibold text-accent sm:text-3xl">{completed}</span>
                    <span className="text-xs text-mist tabular-nums">/ {goal}</span>
                  </div>
                )}
                {!loading ? (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-accent/[0.12]">
                    <div
                      className="h-1 rounded-sm bg-accent"
                      style={{ width: `${pct}%`, minWidth: pct > 0 ? 2 : 0 }}
                    />
                  </div>
                ) : null}
                <div className="mt-1.5 text-[11px] tabular-nums text-mist">
                  {loading ? '—' : `${pct}% · ${leftToday} left`}
                </div>
              </div>

              <div className="rounded-sm bg-jade/[0.06] px-3 py-3 ring-1 ring-jade/[0.12]">
                <div className="kicker text-jade">Streak</div>
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-20" />
                ) : (
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span
                      className={clsx(
                        'stat-num text-2xl font-semibold sm:text-3xl',
                        data.currentStreak > 0 ? 'text-jade' : 'text-ink'
                      )}
                    >
                      {data.currentStreak}
                    </span>
                    <span className="text-xs text-mist">
                      day{data.currentStreak === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
                <div className="mt-1.5 text-[11px] text-mist">
                  Best · {loading ? '—' : data.longestStreak}
                </div>
              </div>

              <div className="rounded-sm bg-paper px-3 py-3 ring-1 ring-rule/80">
                <div className="kicker">Today acc</div>
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(todayAcc))}>
                      {todayAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  </div>
                )}
                <div className="mt-1.5 text-[11px] text-mist">
                  This session
                </div>
              </div>

              <div className="rounded-sm bg-paper px-3 py-3 ring-1 ring-rule/80">
                <div className="kicker">Week acc</div>
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(weekAcc))}>
                      {weekAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  </div>
                )}
                <div className="mt-1.5 text-[11px] text-mist">
                  Last 7 days
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-accent/[0.12] pt-4 lg:mt-5 lg:pt-5">
              <div className="kicker text-accent">Today&apos;s mix</div>
              <p className="mt-1 text-[12.75px] leading-snug text-mist">
                Spread reps across Math, R&amp;W, and mixed sets.
              </p>
              <div className="mt-4 space-y-4">
                <DailyMixRow
                  label="Math"
                  done={progressToday.math}
                  target={mixMath}
                  loading={loading}
                  tone="math"
                />
                <DailyMixRow
                  label="R&W"
                  done={progressToday.readingWriting}
                  target={mixRw}
                  loading={loading}
                  tone="rw"
                />
                <DailyMixRow
                  label="Mixed"
                  done={progressToday.mixed}
                  target={mixMixed}
                  loading={loading}
                  tone="mixed"
                />
              </div>
            </div>

            {!loading && leftToday > 0 ? (
              <p className="mt-3 rounded-sm bg-accent/[0.05] px-3 py-2 text-[12.75px] leading-snug text-mist ring-1 ring-accent/[0.1]">
                <span className="font-semibold text-accent">{leftToday}</span> more unique{' '}
                {leftToday === 1 ? 'question' : 'questions'} to hit today&apos;s goal.
              </p>
            ) : !loading && completed >= goal ? (
              <p className="mt-3 text-[12.75px] font-medium text-jade">Today&apos;s goal complete — nice work.</p>
            ) : null}
          </Card>
        </aside>
      </div>
    </section>
  );
}
