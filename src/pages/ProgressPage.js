import React from 'react';
import clsx from 'clsx';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useQuestions } from '../context/QuestionsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useStudentProgressStats } from '../hooks/useStudentProgressStats';
import { DashProgressBar } from '../components/dashboard/DashProgressBar';
import { PageBand, PageIntro } from '../components/PageBand';
import { HoverTip } from '../components/ui/HoverTip';
import { computeCurrentStreak, computeLongestStreak } from '../lib/practiceStreaks';

function SectionLabel({ index, title, sub }) {
  return (
    <div className="mb-3">
      <div className="kicker">
        <span className="text-accent">{index}</span>
        <span className="text-mist/90"> / {title}</span>
      </div>
      {sub ? (
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">{sub}</h2>
      ) : null}
    </div>
  );
}

const STAT_COLUMN_PANEL =
  'overflow-hidden rounded-md border border-rule bg-gradient-to-b from-paper to-canvas-deep shadow-soft ring-1 ring-accent/[0.14]';

const PACE_MINI_CARD =
  'rounded-md border border-rule bg-paper/95 p-5 shadow-soft ring-1 ring-accent/[0.1]';

const DIFF_BAR = {
  Easy: 'bg-emerald-600',
  Medium: 'bg-amber-500',
  Hard: 'bg-red-600',
};

const DIFF_ROW_BG = {
  Easy: 'bg-emerald-50/80',
  Medium: 'bg-amber-50/70',
  Hard: 'bg-red-50/60',
};

const DIFF_KICKER = {
  Easy: 'text-emerald-800',
  Medium: 'text-amber-900',
  Hard: 'text-red-800',
};

/** `YYYY-MM-DD` → short label for heatmap cells */
function heatmapDayLabel(dayKey) {
  try {
    const [y, m, d] = String(dayKey).split('-').map((n) => Number(n));
    if (!y || !m || !d) return String(dayKey);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  } catch {
    return String(dayKey);
  }
}

function heatmapDayTooltip(dayKey, count) {
  try {
    const [y, m, d] = String(dayKey).split('-').map((n) => Number(n));
    if (!y || !m || !d) return `${dayKey} · ${count} questions`;
    const dt = new Date(y, m - 1, d);
    const dateStr = dt.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const q =
      count === 0
        ? 'No questions'
        : count === 1
          ? '1 question'
          : `${count} questions`;
    return `${dateStr} · ${q}`;
  } catch {
    return `${dayKey} · ${count} questions`;
  }
}

export function ProgressPage({ studentId }) {
  const { questions, loading: qLoading, error: qError } = useQuestions();
  const { publicProfile } = useUserProfile();
  const { loading, error, stats } = useStudentProgressStats({ studentId, questions });

  const [skillSort, setSkillSort] = React.useState({
    key: 'attempts',
    dir: 'desc',
  });

  const sortedSkills = React.useMemo(() => {
    const rows = [...(stats?.skills ?? [])];
    const { key, dir } = skillSort;
    const mul = dir === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      if (key === 'subject' || key === 'domain' || key === 'skill') {
        const cmp = String(a[key]).localeCompare(String(b[key]));
        return cmp * mul;
      }
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;
      return (av - bv) * mul;
    });
    return rows;
  }, [stats?.skills, skillSort]);

  function toggleSkillSort(key) {
    setSkillSort((s) =>
      s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }
    );
  }

  const streakMeta = React.useMemo(() => {
    if (!stats?.dailyVolume) return { current: 0, longest: 0 };
    const dayKeys = new Set(
      stats.dailyVolume.filter((d) => d.count > 0).map((d) => d.dayKey)
    );
    if (publicProfile?.streakGraceDayKey) {
      dayKeys.add(String(publicProfile.streakGraceDayKey));
    }
    const now = new Date();
    return {
      current: computeCurrentStreak(dayKeys, now),
      longest: computeLongestStreak(dayKeys),
    };
  }, [stats?.dailyVolume, publicProfile?.streakGraceDayKey]);

  if (qLoading || loading) {
    return (
      <div className="pb-0">
        <PageBand tone="light" flushTop>
          <Card className="p-6">
            <div className="flex items-center gap-3 text-sm text-mist">
              <Spinner />
              <span className="text-[11.69px] uppercase tracking-kicker">Loading progress</span>
            </div>
          </Card>
        </PageBand>
      </div>
    );
  }

  if (qError || error || !stats) {
    const msg = String((qError || error)?.message ?? (qError || error) ?? 'Missing stats');
    return (
      <div className="pb-0">
        <PageBand tone="light" flushTop>
          <Card className="p-6">
            <div className="kicker text-accent">Error</div>
            <div className="mt-2 text-sm text-ink">{msg}</div>
          </Card>
        </PageBand>
      </div>
    );
  }

  const vol = stats.dailyVolume ?? [];
  const maxVol = Math.max(1, ...vol.map((d) => d.count));
  const lifeQ = Number(publicProfile?.questionsAnswered) || 0;
  const lifeCorrect = Number(publicProfile?.correctTotal) || 0;
  const lifePct = lifeQ ? Math.round((lifeCorrect / lifeQ) * 100) : 0;
  const paceSub = stats.pace?.bySubject ?? {};
  const paceDiff = stats.pace?.byDifficulty ?? {};

  function fmtPace(avg) {
    if (avg == null || !Number.isFinite(avg)) return '—';
    return `${avg}s`;
  }

  function accuracyTone(pct) {
    if (pct >= 70) return 'text-jade';
    if (pct >= 40) return 'text-accent';
    return 'text-mist';
  }

  return (
    <div className="pb-0">
      <PageBand tone="light" flushTop>
        <PageIntro
          kicker="Account / Progress"
          title="Where you are"
          sub="Your last 30 days and lifetime totals — depth without noise."
        />
      </PageBand>

      <PageBand tone="dark">
        {/* 01 Lifetime */}
        <section>
        <SectionLabel index="01" title="Lifetime" sub="Profile totals" />
        <div className="grid grid-cols-2 divide-x divide-rule border border-rule bg-paper">
          {[
            {
              k: 'Total Q',
              v: <span className="stat-num">{lifeQ}</span>,
              accent: true,
            },
            {
              k: 'Lifetime accuracy',
              v: (
                <span className="stat-num">
                  {lifeCorrect}/{lifeQ}
                  <span className="text-[12.75px] text-mist"> · {lifePct}%</span>
                </span>
              ),
            },
          ].map((cell) => (
            <div key={cell.k} className="relative px-4 py-5 sm:px-5">
              {cell.accent ? (
                <div className="absolute left-0 top-0 h-full w-px bg-accent" aria-hidden />
              ) : null}
              <div className="kicker">{cell.k}</div>
              <div className="mt-2 text-lg font-semibold text-ink">{cell.v}</div>
            </div>
          ))}
        </div>
      </section>
      </PageBand>

      <PageBand tone="light">
      {/* 02 Activity */}
      <section>
        <SectionLabel index="02" title="Activity" sub="Last 30 days — one square per calendar day" />
        <div className={clsx(STAT_COLUMN_PANEL, 'border-l-[3px] border-l-accent p-6')}>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-sm bg-accent/[0.06] px-4 py-3 ring-1 ring-accent/[0.12]">
              <div className="kicker text-accent">Current streak</div>
              <div className="stat-num mt-1 text-2xl font-semibold text-ink">
                {streakMeta.current}
                <span className="text-[12.75px] font-normal text-mist"> days</span>
              </div>
            </div>
            <div className="rounded-sm bg-canvas-deep/80 px-4 py-3 ring-1 ring-rule/60">
              <div className="kicker text-sky">Longest (window)</div>
              <div className="stat-num mt-1 text-2xl font-semibold text-ink">
                {streakMeta.longest}
                <span className="text-[12.75px] font-normal text-mist"> days</span>
              </div>
            </div>
            <div className="rounded-sm bg-canvas-deep/80 px-4 py-3 ring-1 ring-rule/60">
              <div className="kicker">Best day</div>
              <div className="mt-1 text-sm text-ink">
                <span className="stat-num font-semibold text-accent">{stats.bestDay?.count ?? 0}</span>
                <span className="text-mist"> · {stats.bestDay?.dayKey || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm bg-canvas-deep/50 px-4 py-5 ring-1 ring-rule/50">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div className="kicker text-accent">Daily volume</div>
              <div className="text-[10.63px] uppercase tracking-kicker text-mist">
                Oldest → newest · hover a square for that day
              </div>
            </div>
            <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-x-2 gap-y-3">
              {vol.map((d) => {
                const intensity = d.count / maxVol;
                return (
                  <div key={d.dayKey} className="flex min-w-0 flex-col items-center gap-1">
                    <HoverTip
                      content={heatmapDayTooltip(d.dayKey, d.count)}
                      className="w-full"
                      fullWidth
                      highlight={false}
                      placement="top"
                    >
                      <div
                        className={clsx(
                          'aspect-square w-full cursor-default rounded-sm border border-rule/80 transition-shadow',
                          'group-hover:ring-2 group-hover:ring-accent/45 group-hover:ring-offset-1 group-hover:ring-offset-canvas-deep/50',
                          d.count > 0 ? 'border-accent/30 bg-accent' : 'bg-canvas-deep'
                        )}
                        style={{ opacity: d.count > 0 ? 0.22 + intensity * 0.78 : 1 }}
                      />
                    </HoverTip>
                    <span className="pointer-events-none w-full truncate text-center text-[9.56px] leading-none text-mist sm:text-[10.63px]">
                      {heatmapDayLabel(d.dayKey)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-mist">
              Grid reads left to right, top to bottom ({vol.length} days). Darker blue means more questions that day.
            </p>
          </div>

          <div className="mt-6 border-t border-rule/80 pt-6">
            <div className="kicker text-accent">Last 30 days (totals)</div>
            <div className="stat-num mt-1 text-lg text-ink">
              <span className="text-accent">{stats.totalsLast30?.attempts ?? 0}</span>
              <span className="text-[12.75px] font-normal text-mist"> attempts · </span>
              <span className={clsx('font-semibold', accuracyTone(stats.totalsLast30?.pct ?? 0))}>
                {stats.totalsLast30?.pct ?? 0}
              </span>
              <span className="text-[12.75px] font-normal text-mist">% accuracy</span>
            </div>
          </div>
        </div>
      </section>
      </PageBand>

      <PageBand tone="dark">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      {/* 03 Subjects */}
      <section className="min-w-0">
        <SectionLabel index="03" title="Subjects" sub="Math & R&W · last 30 days" />
        <div className={clsx(STAT_COLUMN_PANEL, 'border-l-[3px] border-l-accent')}>
          {[
            { label: 'Math', key: 'Math' },
            { label: 'Reading & Writing', key: 'English' },
          ].map((row) => {
            const s = stats.subject?.[row.key] ?? { attempts: 0, correct: 0, pct: 0 };
            const isMath = row.key === 'Math';
            return (
              <div
                key={row.key}
                className={clsx(
                  'grid gap-4 border-t border-rule/80 px-5 py-4 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center',
                  isMath ? 'bg-accent/[0.05]' : 'bg-iris/[0.04]'
                )}
              >
                <div>
                  <div className={clsx('kicker', isMath ? 'text-accent' : 'text-iris')}>{row.label}</div>
                  <div className="mt-1 text-[11.69px] uppercase tracking-kicker text-mist">
                    <span className="stat-num text-ink">{s.attempts}</span> attempts ·{' '}
                    <span className={clsx('stat-num font-semibold', isMath ? 'text-accent' : 'text-iris')}>
                      {s.pct}%
                    </span>{' '}
                    accuracy
                  </div>
                </div>
                <div className="min-w-[120px]">
                  <DashProgressBar
                    value={s.correct}
                    max={Math.max(1, s.attempts)}
                    height="h-1"
                    palette="accent"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 04 Difficulty */}
      <section className="min-w-0">
        <SectionLabel index="04" title="Difficulty" sub="Easy · Medium · Hard" />
        <div className={clsx(STAT_COLUMN_PANEL, 'border-l-[3px] border-l-sky')}>
          {['Easy', 'Medium', 'Hard'].map((d) => {
            const s = stats.difficulty?.[d] ?? { attempts: 0, correct: 0, pct: 0 };
            return (
              <div
                key={d}
                className={clsx(
                  'grid gap-4 border-t border-rule/80 px-5 py-4 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center',
                  DIFF_ROW_BG[d]
                )}
              >
                <div>
                  <div className={clsx('kicker', DIFF_KICKER[d])}>{d}</div>
                  <div className="mt-1 text-[11.69px] uppercase tracking-kicker text-mist">
                    <span className="stat-num text-ink">{s.attempts}</span> attempts ·{' '}
                    <span className="stat-num font-semibold text-accent">{s.pct}%</span>
                  </div>
                </div>
                <div className="min-w-[120px]">
                  <div className="h-1 w-full overflow-hidden rounded-sm bg-accent/[0.12]">
                    <div
                      className={clsx('h-1 rounded-sm', DIFF_BAR[d])}
                      style={{
                        width: `${s.attempts ? Math.min(100, (s.correct / s.attempts) * 100) : 0}%`,
                        minWidth: s.correct > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 05 Pace */}
      <section className="min-w-0">
        <SectionLabel index="05" title="Pace" sub="Avg seconds per question (times below 1s count as 1s)" />
        <div className={PACE_MINI_CARD}>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-0">
            <div className="sm:border-r sm:border-rule/80 sm:pr-6">
              <div className="kicker text-accent">By subject</div>
              <div className="mt-4 space-y-2">
              {['Math', 'English'].map((k) => {
                const isMath = k === 'Math';
                return (
                  <div
                    key={k}
                    className={clsx(
                      'flex items-baseline justify-between gap-3 rounded-sm px-2 py-2.5',
                      isMath ? 'bg-accent/[0.05]' : 'bg-iris/[0.04]'
                    )}
                  >
                    <span className={clsx('text-sm font-medium', isMath ? 'text-accent' : 'text-iris')}>
                      {k === 'English' ? 'R&W' : k}
                    </span>
                    <span className="stat-num shrink-0 text-lg text-ink">{fmtPace(paceSub[k]?.avgSeconds)}</span>
                  </div>
                );
              })}
              </div>
            </div>
            <div className="sm:pl-6">
              <div className="kicker text-accent">By difficulty</div>
              <div className="mt-4 space-y-2">
              {['Easy', 'Medium', 'Hard'].map((k) => (
                <div
                  key={k}
                  className={clsx(
                    'flex items-baseline justify-between gap-3 rounded-sm px-2 py-2.5',
                    DIFF_ROW_BG[k]
                  )}
                >
                  <span className={clsx('text-sm font-medium', DIFF_KICKER[k])}>{k}</span>
                  <span className="stat-num shrink-0 text-lg text-ink">{fmtPace(paceDiff[k]?.avgSeconds)}</span>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </section>
        </div>
      </PageBand>

      <PageBand tone="light">
      {/* 06 Skills */}
      <section>
        <SectionLabel index="06" title="Skills" sub="Sortable · last 30 days" />
        <div className={clsx(STAT_COLUMN_PANEL, 'overflow-x-auto border-l-[3px] border-l-accent')}>
          {sortedSkills.length === 0 ? (
            <div className="p-6 text-sm text-mist">No skills with attempts in this window yet.</div>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-rule/80 bg-accent/[0.08] text-[10.63px] uppercase tracking-kicker">
                  {[
                    { key: 'subject', label: 'Subject' },
                    { key: 'domain', label: 'Domain' },
                    { key: 'skill', label: 'Skill' },
                    { key: 'attempts', label: 'Attempts' },
                    { key: 'pct', label: 'Accuracy' },
                  ].map((col) => (
                    <th key={col.key} className="px-4 py-3">
                      <button
                        type="button"
                        className={clsx(
                          'transition-colors',
                          skillSort.key === col.key
                            ? 'font-semibold text-accent'
                            : 'text-mist hover:text-accent'
                        )}
                        onClick={() => toggleSkillSort(col.key)}
                      >
                        {col.label}
                        {skillSort.key === col.key ? (skillSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-mist">Bar</th>
                </tr>
              </thead>
              <tbody>
                {sortedSkills.map((r, i) => (
                  <tr
                    key={`${r.subject}|${r.domain}|${r.skill}`}
                    className={clsx(
                      'border-b border-rule/60 transition-colors last:border-0 hover:bg-accent/[0.06]',
                      i % 2 === 0 ? 'bg-paper' : 'bg-accent/[0.03]'
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-accent">{r.subject}</td>
                    <td className="px-4 py-3 text-mist">{r.domain}</td>
                    <td className="px-4 py-3 font-medium text-ink">{r.skill}</td>
                    <td className="stat-num px-4 py-3 text-ink">{r.attempts}</td>
                    <td className={clsx('stat-num px-4 py-3 font-semibold', accuracyTone(r.pct))}>
                      {r.pct}%
                    </td>
                    <td className="px-4 py-3">
                      <DashProgressBar
                        value={r.correct}
                        max={Math.max(1, r.attempts)}
                        height="h-1"
                        palette="accent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      </PageBand>

    </div>
  );
}
