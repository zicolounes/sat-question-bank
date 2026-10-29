import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/practice', label: 'Practice', accent: true },
  { to: '/progress', label: 'Progress' },
  { to: '/leaderboard', label: 'Ranks' },
  { to: '/profile', label: 'Profile' },
];

/** Thumb-friendly nav — mobile / tablet only; desktop uses header chrome. */
export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ to, label, end, accent }) => (
          <NavLink key={to} to={to} end={end} className="flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1">
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'text-[10px] font-semibold uppercase tracking-[0.06em]',
                    accent && !isActive && 'text-accent',
                    isActive ? 'text-white' : accent ? 'text-accent/80' : 'text-white/45'
                  )}
                >
                  {label}
                </span>
                <span
                  className={clsx(
                    'h-0.5 w-5 rounded-full transition-opacity',
                    isActive ? 'bg-accent opacity-100' : 'opacity-0'
                  )}
                  aria-hidden
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
