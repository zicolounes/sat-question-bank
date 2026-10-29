import React from 'react';
import clsx from 'clsx';

/**
 * Off-screen-friendly card captured with html2canvas for milestones (levels 10, 25, 50).
 */
export const MilestoneShareCard = React.forwardRef(function MilestoneShareCard(
  { username, level, activeTitle, strongestSubject, milestone },
  ref
) {
  return (
    <div
      ref={ref}
      className={clsx(
        'box-border w-[540px] rounded-3xl border border-ink/10 p-10 text-ink shadow-lift',
        'bg-gradient-to-br from-paper via-canvas to-paper'
      )}
    >
      <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-mist">SAT Bank</div>
      <div className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink">Level {milestone}</div>
      <div className="mt-2 text-lg font-semibold text-mist">Milestone unlocked</div>
      <div className="mt-8 border-t border-ink/10 pt-8">
        <div className="text-sm font-semibold text-mist">Learner</div>
        <div className="mt-1 font-display text-2xl font-bold text-ink">{username || 'Student'}</div>
        {activeTitle ? (
          <div className="mt-2 inline-flex rounded-full border border-accent/25 bg-accent-glow px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
            {activeTitle}
          </div>
        ) : null}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-ink p-4 text-paper">
          <div className="text-[10.63px] font-bold uppercase tracking-wide text-paper/60">Current level</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">{level}</div>
        </div>
        <div className="rounded-2xl border border-jade/25 bg-jade-soft p-4">
          <div className="text-[10.63px] font-bold uppercase tracking-wide text-jade">Strongest subject</div>
          <div className="mt-1 text-lg font-bold text-ink">{strongestSubject || '—'}</div>
        </div>
      </div>
      <div className="mt-10 text-center text-xs text-mist">sat-bank · keep the reps rolling</div>
    </div>
  );
});
