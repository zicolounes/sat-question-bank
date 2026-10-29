/**
 * ARCHIVED — copy back into ProfilePage when restoring streak shields.
 * See RESTORE.txt in this folder.
 */
import React from 'react';
import clsx from 'clsx';

export function TokenConsumableRow({ label, unlockLevel, progLevel, current, cap }) {
  const unlocked = progLevel >= unlockLevel;
  return (
    <li
      className={clsx(
        'border px-4 py-4 transition-colors',
        unlocked ? 'border-jade bg-jade-soft' : 'border-rule bg-canvas/40'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={clsx('kicker', unlocked ? 'text-jade' : 'text-mist')}>
          {unlocked ? 'Unlocked' : 'Locked'}
        </div>
        <div className="text-[11.69px] uppercase tracking-kicker text-mist">
          {unlocked ? 'Daily' : `Lv ${unlockLevel}`}
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold text-ink">{label}</div>
      <div className="mt-2">
        {unlocked ? (
          <div className="flex items-baseline gap-2">
            <span className="stat-num text-2xl font-semibold text-ink">{current ?? 0}</span>
            <span className="text-[12.75px] text-mist">/ {cap}</span>
          </div>
        ) : (
          <div className="text-[12.75px] text-mist">
            Unlocks at <span className="font-semibold text-ink">Lv {unlockLevel}</span>
            <span className="text-mist/70"> · you are Lv {progLevel}</span>
          </div>
        )}
      </div>
    </li>
  );
}
