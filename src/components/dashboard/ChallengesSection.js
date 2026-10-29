import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { DashProgressBar } from './DashProgressBar';

const STATUS = {
  in_progress: { label: 'Active', tone: 'text-accent', rule: 'bg-accent' },
  locked: { label: 'Locked', tone: 'text-mist', rule: 'bg-rule' },
  complete: { label: 'Done', tone: 'text-jade', rule: 'bg-jade' },
};

function ChallengeSkeleton() {
  return (
    <div className="animate-pulse rounded-md bg-paper p-4 shadow-soft">
      <div className="h-3 w-1/3 rounded-sm bg-ink/[0.06]" />
      <div className="mt-3 h-4 w-2/3 rounded-sm bg-ink/[0.06]" />
      <div className="mt-2 h-3 w-full rounded-sm bg-ink/[0.06]" />
      <div className="mt-4 h-px w-full bg-ink/[0.06]" />
    </div>
  );
}

export function ChallengesSection({ challenges, loading, className }) {
  return (
    <section className={clsx('space-y-4', className)}>
      <div className="flex items-baseline justify-between pb-2">
        <div>
          <div className="kicker">02 / Challenges</div>
          <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">
            Built from today’s reps
          </h2>
        </div>
        <div className="hidden text-[11.69px] uppercase tracking-kicker text-mist sm:block">
          No filler XP
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <ChallengeSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {challenges.map((c, idx) => {
            const st = STATUS[c.status] ?? STATUS.in_progress;
            const max = Math.max(1, c.target);
            const prog = c.status === 'locked' ? 0 : Math.min(c.current, c.target);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card
                  className={clsx(
                    'group relative flex h-full flex-col transition-colors',
                    'hover:border-ink',
                    c.status === 'locked' && 'opacity-[0.85]'
                  )}
                >
                  <div className={clsx('h-px w-full', st.rule)} aria-hidden />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className={clsx('kicker', st.tone)}>{st.label}</div>
                      <div className="text-[11.69px] text-accent">+{c.xp} XP</div>
                    </div>
                    <h3 className="font-display mt-3 text-base font-bold leading-snug text-ink">
                      {c.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-mist">{c.description}</p>
                    <div className="mt-4 flex items-baseline justify-between text-[11.69px] text-mist">
                      <span className="stat-num text-ink">
                        {c.status === 'locked' ? '—' : `${prog} / ${c.target}`}
                      </span>
                      <span className="uppercase tracking-kicker">
                        {Math.round((prog / max) * 100)}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <DashProgressBar
                        value={prog}
                        max={max}
                        height="h-px"
                        palette={c.status === 'complete' ? 'jade' : 'accent'}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
