import React from 'react';
import clsx from 'clsx';
import { Card } from '../ui/Card';

/** Editorial pulse — kicker per kind, mono timestamps. */
const KIND_KICKER = {
  practice: { label: 'Practice', tone: 'text-accent' },
  review: { label: 'Review', tone: 'text-iris' },
  challenge: { label: 'Challenge', tone: 'text-honey' },
  score: { label: 'Score', tone: 'text-jade' },
};

export function RecentActivityCard({ items, loading, className }) {
  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-baseline justify-between px-5 py-3">
        <div className="kicker">Pulse</div>
        <div className="text-[11.69px] text-mist">Recent</div>
      </div>

      {loading ? (
        <ul className="divide-y divide-rule">
          {[0, 1, 2].map((i) => (
            <li key={i} className="px-5 py-4">
              <div className="h-3 w-1/4 animate-pulse rounded-sm bg-ink/[0.06]" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded-sm bg-ink/[0.06]" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="px-5 py-8">
          <p className="font-display text-sm font-semibold text-ink">No log yet</p>
          <p className="mt-1.5 text-sm text-mist">
            Finish a short practice set — this feed fills from your real attempts.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {items.map((item) => {
            const k = KIND_KICKER[item.kind] ?? KIND_KICKER.practice;
            return (
              <li key={item.id} className="px-5 py-4 transition-colors hover:bg-canvas/40">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={clsx('kicker', k.tone)}>{k.label}</span>
                  <span className="text-[10.63px] uppercase tracking-kicker text-mist">
                    {item.timeLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-ink">{item.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
