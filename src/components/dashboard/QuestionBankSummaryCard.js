import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

function countBy(questions, fn) {
  const m = new Map();
  for (const q of questions) {
    const k = fn(q);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function QuestionBankSummaryCard({ questions, isAdmin, className }) {
  const total = questions.length;
  const bySubject = countBy(questions, (q) => q.subject);
  const math = bySubject.get('Math') ?? 0;
  const english = bySubject.get('English') ?? 0;
  const byDiff = countBy(questions, (q) => q.difficulty);
  const easy = byDiff.get('Easy') ?? 0;
  const medium = byDiff.get('Medium') ?? 0;
  const hard = byDiff.get('Hard') ?? 0;
  const topicKeys = new Set();
  for (const q of questions) {
    if (q.subject && q.domain && q.skill) topicKeys.add(`${q.subject}|${q.domain}|${q.skill}`);
  }
  const topicsCovered = topicKeys.size;

  const diffTotal = easy + medium + hard || 1;

  const tiles = [
    { label: 'Total', value: total, tone: 'text-ink', rule: 'bg-ink' },
    { label: 'Math', value: math, tone: 'text-jade', rule: 'bg-jade' },
    { label: 'R&W', value: english, tone: 'text-iris', rule: 'bg-iris' },
    { label: 'Topics', value: topicsCovered, tone: 'text-accent', rule: 'bg-accent' },
  ];

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="flex items-baseline justify-between px-6 py-3">
        <div>
          <div className="kicker">Bank</div>
          <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">
            Question library
          </h2>
        </div>
        {isAdmin ? (
          <Link to="/browse">
            <Button variant="secondary" size="sm">
              Open ›
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-px bg-canvas-deep sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="relative bg-paper px-5 py-4">
            <div className={clsx('absolute left-0 top-0 h-full w-px', t.rule)} aria-hidden />
            <div className={clsx('kicker', t.tone)}>{t.label}</div>
            <div className="mt-2 stat-num text-2xl font-semibold text-ink">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="px-6 py-3">
        <div className="flex items-baseline justify-between">
          <div className="kicker">Difficulty mix</div>
          <div className="text-[11.69px]">
            <span className="text-emerald-700">E {easy}</span>
            <span className="text-mist/50"> · </span>
            <span className="text-amber-700">M {medium}</span>
            <span className="text-mist/50"> · </span>
            <span className="text-red-700">H {hard}</span>
          </div>
        </div>
        <div className="mt-3 flex h-1 overflow-hidden bg-ink/[0.07]">
          <div className="bg-emerald-500" style={{ width: `${(easy / diffTotal) * 100}%` }} />
          <div className="bg-amber-500" style={{ width: `${(medium / diffTotal) * 100}%` }} />
          <div className="bg-red-500" style={{ width: `${(hard / diffTotal) * 100}%` }} />
        </div>
      </div>
    </Card>
  );
}
