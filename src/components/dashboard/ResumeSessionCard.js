import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { DashProgressBar } from './DashProgressBar';
import { GET_STARTED_SESSION } from '../../lib/lastSession';

export function ResumeSessionCard({ session, loading, className, stacked = false, distinct = false }) {
  const shellClass = distinct
    ? 'mt-4 border-t border-ink/[0.08] pt-4 sm:mt-6 sm:pt-6 lg:mt-7 lg:pt-7'
    : '';

  const cardClass = clsx(
    'flex flex-col gap-3 border-l-[3px] border-l-accent bg-canvas-deep p-4 sm:gap-4 sm:p-6',
    stacked ? 'items-stretch' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-6',
    className
  );

  if (loading) {
    return (
      <div className={shellClass}>
        <Card className={cardClass} aria-hidden>
          <div className="h-3 w-20 animate-pulse rounded-sm bg-ink/[0.06]" />
          <div className="h-6 w-56 animate-pulse rounded-sm bg-ink/[0.06]" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-sm bg-ink/[0.06]" />
        </Card>
      </div>
    );
  }

  const data = session ?? GET_STARTED_SESSION;
  const isNew = data.variant === 'getStarted';
  const showProgress = !isNew && Number(data.progress) > 0;

  return (
    <div className={shellClass}>
      <Card className={cardClass}>
        <div className="min-w-0 flex-1">
          <div className="kicker text-accent">{data.kicker}</div>
          <h3 className="font-display mt-1 text-lg font-bold tracking-tight text-ink sm:text-xl">
            {data.label}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-mist">{data.detail}</p>
          {showProgress ? (
            <div className="mt-3 max-w-md">
              <DashProgressBar
                value={Math.round(Number(data.progress) * 100)}
                max={100}
                height="h-1"
                palette="byPercent"
              />
            </div>
          ) : null}
        </div>
        <Link
          to={data.href}
          state={data.linkState}
          className={clsx(
            'inline-flex h-11 items-center justify-center gap-2 rounded-sm px-5',
            stacked ? 'w-full shrink-0' : 'shrink-0',
            'text-[15.94px] font-medium tracking-tight transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            isNew
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'border border-ink bg-paper text-ink hover:bg-canvas/60'
          )}
        >
          {data.cta}
          <span aria-hidden>→</span>
        </Link>
      </Card>
    </div>
  );
}
