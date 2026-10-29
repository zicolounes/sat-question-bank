import React from 'react';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { DashProgressBar } from './DashProgressBar';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakCard({ data, loading, className }) {
  const days = data.weekPracticeDays ?? [];
  const activeThisWeek = days.filter(Boolean).length;

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-baseline justify-between px-5 py-3">
        <div className="kicker">Rhythm</div>
        <div className="text-[11.69px] font-semibold tracking-[0.08em] uppercase text-mist tabular-nums">
          {activeThisWeek} / 7 days
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-rule">
        <div className="px-4 py-5">
          <div className="kicker text-accent">Current</div>
          {loading ? (
            <div className="mt-2 h-7 w-10 animate-pulse rounded-sm bg-ink/[0.06]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="stat-num text-2xl font-semibold text-ink">{data.currentStreak}</span>
              <span className="text-[11.69px] text-mist tabular-nums">d</span>
            </div>
          )}
        </div>
        <div className="px-4 py-5">
          <div className="kicker">Best</div>
          {loading ? (
            <div className="mt-2 h-7 w-10 animate-pulse rounded-sm bg-ink/[0.06]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="stat-num text-2xl font-semibold text-ink">{data.longestStreak}</span>
              <span className="text-[11.69px] text-mist tabular-nums">d</span>
            </div>
          )}
        </div>
        <div className="px-4 py-5">
          <div className="kicker text-jade">This wk</div>
          {loading ? (
            <div className="mt-2 h-7 w-10 animate-pulse rounded-sm bg-ink/[0.06]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="stat-num text-2xl font-semibold text-ink">{activeThisWeek}</span>
              <span className="text-[11.69px] text-mist tabular-nums">on</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {!loading ? (
          <DashProgressBar value={activeThisWeek} max={7} height="h-px" palette="jade" />
        ) : null}
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <div key={`${label}-${i}`} className="flex flex-col items-center gap-1.5">
              <span className="text-[10.63px] font-semibold tracking-[0.08em] uppercase text-mist">
                {label}
              </span>
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-sm border text-[11.69px] transition-colors',
                  loading
                    ? 'border-rule bg-canvas/40'
                    : days[i]
                      ? 'border-jade bg-jade text-white'
                      : 'border-rule bg-paper text-mist/40'
                )}
                title={loading ? '' : days[i] ? 'You practiced' : 'No log'}
              >
                {!loading && days[i] ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
