import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DashProgressBar } from './DashProgressBar';

function practiceHref(topic) {
  const s = encodeURIComponent(topic.subject);
  const sk = encodeURIComponent(topic.skill);
  return `/practice?subject=${s}&skill=${sk}`;
}

export function TopicStrengthCard({ title, topics, variant, className }) {
  const improve = variant === 'improve';

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-baseline justify-between px-5 py-3">
        <div className="kicker">{title}</div>
        <div className={clsx('text-[11.69px]', improve ? 'text-accent' : 'text-jade')}>
          {improve ? 'Needs reps' : 'Strong'}
        </div>
      </div>

      {!topics.length ? (
        <p className="px-5 py-6 text-sm leading-relaxed text-mist">
          {improve
            ? 'Once you have a few attempts this week, we’ll spotlight skills that need reps.'
            : 'Strong topics show up after enough practice in the same skill — keep going.'}
        </p>
      ) : (
        <ul className="divide-y divide-rule">
          {topics.map((t) => (
            <li key={`${t.label}-${t.skill}`} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-ink">{t.label}</span>
                <span className="shrink-0 stat-num text-sm font-semibold text-ink">
                  {t.pct}<span className="text-[10.63px] text-mist">%</span>
                </span>
              </div>
              <div className="mt-2">
                <DashProgressBar
                  value={t.pct}
                  max={100}
                  height="h-px"
                  palette={improve ? 'accent' : 'jade'}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="truncate text-[10.63px] uppercase tracking-kicker text-mist">
                  {t.subject}
                </span>
                {improve ? (
                  <Link to={practiceHref(t)}>
                    <Button size="sm" variant="secondary" className="h-7 px-2.5 text-[11.69px]">
                      Practice ›
                    </Button>
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
