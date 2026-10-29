import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { AdminProvider } from '../context/AdminContext';
import { useUserProfile } from '../context/UserProfileContext';
import { fontLabNavVisible } from '../fontLab/fontLabPrefs';
import { useFullTestLockOptional } from '../context/FullTestLockContext';
import { MobileBottomNav } from './MobileBottomNav';

const CORE_NAV = [
  { to: '/progress', label: 'Progress' },
  { to: '/tests', label: 'Tests' },
  { to: '/profile', label: 'Profile' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

/** One content band site-wide — wide enough to avoid empty side gutters on desktop. */
const APP_CONTENT_MAX = 'max-w-[min(94vw,calc(100vw-1rem))]';

function ChromeSecondaryStrip({ ariaLabel, children, className }) {
  return (
    <div className={clsx('border-b border-white/[0.06] bg-black/20', className)}>
      <nav
        className={clsx(
          'mx-auto flex items-center gap-x-4 overflow-x-auto px-4 py-2 sm:px-6 xl:gap-x-5',
          APP_CONTENT_MAX
        )}
        aria-label={ariaLabel}
      >
        {children}
      </nav>
    </div>
  );
}

/** Nav link for dark chrome — muted white, full white + underline when active. */
function NavItem({ to, children, end = false, subdued = false }) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <span
          data-active={isActive ? 'true' : 'false'}
          className={clsx(
            'nav-underline relative whitespace-nowrap py-1 type-nav-cta transition-colors',
            subdued && 'text-[13px]',
            isActive
              ? 'text-white'
              : subdued
                ? 'text-white/45 hover:text-white/70'
                : 'text-white/55 hover:text-white/90'
          )}
        >
          {children}
        </span>
      )}
    </NavLink>
  );
}

/** Primary nav tab — only accent-filled control besides the logo tile. */
function PracticeNavTab({ id, className }) {
  return (
    <NavLink
      id={id}
      to="/practice"
      className={({ isActive }) =>
        clsx(
          'nav-practice-tab inline-flex shrink-0 items-center justify-center gap-1 rounded-sm px-3.5 py-2',
          'type-nav-cta leading-none text-white preserve-brand-colors',
          'bg-accent transition-colors hover:bg-accent-hover active:bg-accent-deep',
          'shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(0,0,0,0.3)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-ink focus-visible:outline-white/80',
          isActive && 'ring-2 ring-white/30',
          className
        )
      }
    >
      Practice
      <span aria-hidden className="text-white/80">
        →
      </span>
    </NavLink>
  );
}

export function AppShell({
  children,
  studentFirstName,
  isAdmin,
  questionReportsNavVisible = false,
  onLogout,
}) {
  const { publicProfile } = useUserProfile();
  const fullTestLock = useFullTestLockOptional();
  const testLocked = Boolean(fullTestLock?.locked);
  const activeTitle = publicProfile?.activeTitle;
  const displayName = String(studentFirstName ?? '').trim();
  const firstName = displayName.split(/\s+/)[0] || '';
  const showAdminStrip =
    isAdmin || questionReportsNavVisible || (isAdmin && fontLabNavVisible());
  const brandKicker = isAdmin
    ? 'Instructor console'
    : firstName
      ? `${firstName}'s hub`
      : 'Practice hub';

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="app-header sticky top-0 z-40">
        {/* Primary chrome row */}
        <div
          className={clsx(
            'mx-auto flex w-full items-center gap-3 border-b border-white/[0.08] px-4 py-2.5 sm:gap-5 sm:px-6 lg:gap-4 lg:py-3',
            APP_CONTENT_MAX
          )}
        >
          <NavLink to="/" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <div
              id="sat-brand-mark"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm preserve-brand-colors"
            >
              <span className="text-[14px] font-bold tracking-tight">LL</span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-display text-[15px] font-bold leading-none tracking-tight text-white sm:text-[17px]">
                SAT Bank
              </span>
              <span className="hidden kicker-on-dark leading-none sm:block">{brandKicker}</span>
            </div>
          </NavLink>

          {testLocked ? (
            <nav
              className="hidden min-w-0 flex-1 items-center gap-4 lg:flex"
              aria-label="Test lock"
            >
              <span className="type-nav-cta text-white/55">
                Practice test in progress
              </span>
              <button
                type="button"
                onClick={() => fullTestLock?.promptLeaveTest?.()}
                className="chrome-ghost-btn"
              >
                Leave test…
              </button>
            </nav>
          ) : (
            <nav
              className="hidden min-w-0 flex-1 items-center gap-x-4 gap-y-1 lg:flex xl:gap-x-5"
              aria-label="Main"
            >
              <NavItem to="/" end>
                Home
              </NavItem>
              <PracticeNavTab id="sat-nav-practice" />
              {CORE_NAV.map(({ to, label }) => (
                <NavItem key={to} to={to}>
                  {label}
                </NavItem>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {displayName ? (
              <div className="hidden max-w-[14rem] text-right md:block lg:max-w-[16rem]">
                <div className="kicker-on-dark leading-none">Signed in</div>
                <div className="mt-1 truncate text-[15px] font-semibold leading-tight text-white">
                  {displayName}
                  {activeTitle ? (
                    <span className="chrome-title-badge ml-1.5">{activeTitle}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <button type="button" onClick={onLogout} className="chrome-ghost-btn">
              Log out
            </button>
          </div>
        </div>

        {!testLocked && showAdminStrip ? (
          <ChromeSecondaryStrip ariaLabel="Instructor tools" className="hidden lg:block">
            {isAdmin ? (
              <>
                <NavItem to="/students" subdued>
                  Students
                </NavItem>
                <NavItem to="/browse" subdued>
                  Browse
                </NavItem>
                <NavItem to="/add" subdued>
                  Add
                </NavItem>
              </>
            ) : null}
            {questionReportsNavVisible ? (
              <NavItem to="/question-reports" subdued>
                Reports
              </NavItem>
            ) : null}
            {isAdmin && fontLabNavVisible() ? (
              <NavItem to="/font-lab" subdued>
                Fonts
              </NavItem>
            ) : null}
          </ChromeSecondaryStrip>
        ) : null}

        {testLocked ? (
          <nav className="border-b border-white/[0.08] lg:hidden" aria-label="Test lock">
            <div
              className={clsx(
                'mx-auto flex w-full items-center justify-between gap-3 px-4 py-2 sm:px-6',
                APP_CONTENT_MAX
              )}
            >
              <span className="text-sm text-white/55">Practice test in progress</span>
              <button
                type="button"
                onClick={() => fullTestLock?.promptLeaveTest?.()}
                className="chrome-ghost-btn shrink-0"
              >
                Leave test…
              </button>
            </div>
          </nav>
        ) : showAdminStrip ? (
          <ChromeSecondaryStrip ariaLabel="Instructor tools" className="lg:hidden">
            {isAdmin ? (
              <>
                <NavItem to="/students" subdued>
                  Students
                </NavItem>
                <NavItem to="/browse" subdued>
                  Browse
                </NavItem>
                <NavItem to="/add" subdued>
                  Add
                </NavItem>
              </>
            ) : null}
            {questionReportsNavVisible ? (
              <NavItem to="/question-reports" subdued>
                Reports
              </NavItem>
            ) : null}
            {isAdmin && fontLabNavVisible() ? (
              <NavItem to="/font-lab" subdued>
                Fonts
              </NavItem>
            ) : null}
          </ChromeSecondaryStrip>
        ) : null}

      </header>

      <main className="app-main app-main--with-mobile-nav w-full bg-canvas-dim">
        <AdminProvider isAdmin={isAdmin}>{children}</AdminProvider>
      </main>

      {!testLocked ? <MobileBottomNav /> : null}

      <footer className="band-bleed hidden bg-canvas lg:block">
        <div
          className={clsx(
            'mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6',
            APP_CONTENT_MAX
          )}
        >
          <div className="kicker">SAT Bank · {new Date().getFullYear()}</div>
          <div className="kicker">
            {isAdmin ? 'Built for focused reps · Firebase' : 'Built for focused SAT practice'}
          </div>
        </div>
      </footer>
    </div>
  );
}
