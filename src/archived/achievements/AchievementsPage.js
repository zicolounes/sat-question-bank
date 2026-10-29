/**
 * ARCHIVED — not imported by the app (no route / nav).
 * To restore: move this file to `src/pages/AchievementsPage.js`, change imports from `../../` to `../`,
 * then wire `AchievementsPage` in App.js (`/achievements` route) and AppShell nav.
 */
import React from 'react';
import clsx from 'clsx';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { useQuestions } from '../../context/QuestionsContext';
import { useStudentDashboardStats } from '../../hooks/useStudentDashboardStats';
import { useUserProfile } from '../../context/UserProfileContext';
import { DashProgressBar } from '../../components/dashboard/DashProgressBar';
import { BADGE_DEFS, getBadgeProgress } from '../../lib/badges';

function achievement(title, description, current, target) {
  const done = Math.min(current, target);
  const complete = done >= target;
  return { title, description, current: done, target, complete };
}

function BadgeCard({ title, description, current, target, complete }) {
  const pct = Math.round((Math.min(current, target) / Math.max(1, target)) * 100);
  return (
    <Card className={clsx('group relative flex h-full flex-col transition-colors hover:border-ink')}>
      <div className={clsx('h-px w-full', complete ? 'bg-jade' : 'bg-rule')} aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className={clsx('kicker', complete ? 'text-jade' : 'text-mist')}>
            {complete ? 'Unlocked' : 'Locked'}
          </div>
          <div className="text-[11.69px] text-mist">{pct}%</div>
        </div>
        <h3 className="font-display mt-2 text-base font-bold leading-snug text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-mist">{description}</p>
        <div className="mt-4 flex items-baseline justify-between text-[11.69px] text-mist">
          <span className="stat-num text-ink">
            {current} / {target}
          </span>
        </div>
        <div className="mt-1.5">
          <DashProgressBar
            value={current}
            max={target}
            height="h-px"
            palette={complete ? 'jade' : 'accent'}
          />
        </div>
      </div>
    </Card>
  );
}

export function AchievementsPage({ studentId }) {
  const { loading: qLoading, error: qError } = useQuestions();
  const { publicProfile } = useUserProfile();
  const { loading, error, stats } = useStudentDashboardStats({
    studentId,
    streakGraceDayKey: publicProfile?.streakGraceDayKey,
  });

  if (qLoading || loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-sm text-mist">
          <Spinner />
          <span className="text-[11.69px] uppercase tracking-kicker">Loading badges</span>
        </div>
      </Card>
    );
  }

  if (qError || error || !stats) {
    const msg = String((qError || error)?.message ?? (qError || error) ?? 'Missing stats');
    return (
      <Card className="p-6">
        <div className="kicker text-accent">Error</div>
        <div className="mt-2 text-sm text-ink">{msg}</div>
      </Card>
    );
  }

  const earned = new Set(publicProfile?.badges ?? []);

  const badgeMetrics = {
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    activeDaysLast30: stats.practiceDaysLast30 ?? 0,
    questionsAnswered: Number(publicProfile?.questionsAnswered) || 0,
    level: Number(publicProfile?.level) || 1,
    correctTotal: Number(publicProfile?.correctTotal) || 0,
    correctMath: Number(publicProfile?.correctMath) || 0,
    correctEnglish: Number(publicProfile?.correctEnglish) || 0,
  };

  const practiceCards = [
    achievement('Streak starter', 'Reach a 3-day streak.', stats.currentStreak, 3),
    achievement('Consistent', 'Reach a 7-day streak.', stats.currentStreak, 7),
    achievement('Locked in', 'Reach a 14-day streak.', stats.currentStreak, 14),
    achievement(
      'Daily finisher',
      'Complete today’s daily goal.',
      stats.dailyProgress.completed,
      stats.dailyProgress.goal
    ),
    achievement('Sharp day', 'Hit 80%+ accuracy today.', stats.todayAccuracyPct ?? 0, 80),
    achievement('Strong week', 'Hit 80%+ accuracy this week.', stats.weekAccuracyPct ?? 0, 80),
  ];

  return (
    <div className="space-y-14 pb-12">
      <div className="border-b border-rule pb-6">
        <div className="kicker">Account / Achievements</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Badges &amp; goals
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Practice goals are tracked from your responses. Named titles are awarded automatically and
          show up next to your name on the leaderboard.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-3">
          <div>
            <div className="kicker">01 / Named badges</div>
            <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">
              Earned automatically
            </h2>
          </div>
          <div className="hidden text-[11.69px] uppercase tracking-kicker text-mist sm:block">
            Live profile + 30d
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGE_DEFS.map((b) => {
            const { current, target } = getBadgeProgress(b, badgeMetrics);
            const complete = earned.has(b.id);
            return (
              <BadgeCard
                key={b.id}
                title={b.title}
                description={b.description}
                current={current}
                target={target}
                complete={complete}
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 border-b border-rule pb-3">
          <div className="kicker">02 / Practice goals</div>
          <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">
            What to chase next
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {practiceCards.map((a) => (
            <BadgeCard
              key={a.title}
              title={a.title}
              description={a.description}
              current={a.current}
              target={a.target}
              complete={a.complete}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
