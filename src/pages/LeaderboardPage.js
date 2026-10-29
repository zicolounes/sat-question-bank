import React from 'react';
import clsx from 'clsx';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { PageBand, PageIntro } from '../components/PageBand';
import { fetchLeaderboardTop, syncProgressionFromXp } from '../lib/userProfile';
import { StudentAvatar } from '../components/StudentAvatar';

export function LeaderboardPage({ studentId }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (studentId) {
          await syncProgressionFromXp(studentId).catch(() => {});
        }
        const list = await fetchLeaderboardTop(60);
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <div className="pb-0">
      <PageBand tone="light" flushTop>
        <PageIntro
          kicker="Class / Leaderboard"
          title="Top of the class"
          sub="Ranked by total XP. Practice consistently and your name moves up — titles are earned from badges on your profile."
        />
      </PageBand>

      <PageBand tone="dark">
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center gap-3 text-sm text-mist">
              <Spinner />
              <span className="text-[11.69px] uppercase tracking-kicker">Loading ranks</span>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-6">
            <div className="kicker text-accent">Leaderboard error</div>
            <div className="mt-2 text-xs text-mist">{String(error?.message ?? error)}</div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_4rem_5rem] items-center gap-3 border-b border-rule px-5 py-3 text-[11.69px] uppercase tracking-kicker text-mist">
              <span>#</span>
              <span>Learner</span>
              <span className="text-right">Lv</span>
              <span className="text-right">XP</span>
            </div>
            <ul className="divide-y divide-rule">
              {rows.map((r, i) => {
                const isYou = r.id === studentId;
                return (
                  <li
                    key={r.id}
                    className={clsx(
                      'grid grid-cols-[3rem_1fr_4rem_5rem] items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas/40',
                      isYou && 'bg-accent-soft'
                    )}
                  >
                    <span className="stat-num text-sm text-mist">{i + 1}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      <StudentAvatar
                        avatarColor={r.avatarColor}
                        avatarSymbol={r.avatarSymbol}
                        size={32}
                        rounded="rounded-sm"
                        title={r.displayName || 'Student'}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-baseline gap-1.5">
                          <span className="truncate font-medium text-ink">
                            {r.displayName || 'Student'}
                          </span>
                          {r.activeTitle ? (
                            <span className="shrink-0 text-[10.63px] uppercase tracking-kicker text-accent">
                              · {r.activeTitle}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-[10.63px] uppercase tracking-kicker text-mist">
                          {isYou ? 'You' : r.id}
                        </div>
                      </div>
                    </div>
                    <div className="stat-num text-right text-sm text-ink">{r.level ?? 1}</div>
                    <div className="stat-num text-right text-sm font-semibold text-ink">
                      {r.xp ?? 0}
                    </div>
                  </li>
                );
              })}
            </ul>
            {!rows.length ? (
              <div className="px-6 py-10 text-center text-sm text-mist">
                No entries yet — practice to appear on the board.
              </div>
            ) : null}
          </Card>
        )}
      </PageBand>
    </div>
  );
}
