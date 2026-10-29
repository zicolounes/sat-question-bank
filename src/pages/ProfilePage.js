import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { DashProgressBar } from '../components/dashboard/DashProgressBar';
import { useUserProfile } from '../context/UserProfileContext';
import { useStudentDashboardStats } from '../hooks/useStudentDashboardStats';
import { levelFromTotalXp, levelProgressFromTotalXp } from '../lib/xpLevel';
import { BADGE_DEFS } from '../lib/badges';
import { pickClosestAchievementOrChallenge } from '../lib/nextFocus';
import {
  setActiveTitle,
  setAvatarAppearance,
  setDisplayName,
  setStrongestSubject,
  syncBadgesFromMetrics,
} from '../lib/userProfile';
import { AVATAR_PRESET_COLORS, AVATAR_SYMBOL_IDS } from '../lib/studentAvatar';
import { StudentAvatar } from '../components/StudentAvatar';
import { MilestoneShareCard } from '../components/MilestoneShareCard';
import { HoverTip } from '../components/ui/HoverTip';
import { PageBand, PageIntro } from '../components/PageBand';

function SectionLabel({ index, title, sub }) {
  return (
    <div className="mb-3">
      <div className="kicker">
        {index} / {title}
      </div>
      {sub ? (
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">{sub}</h2>
      ) : null}
    </div>
  );
}

export function ProfilePage({ studentId }) {
  const { publicProfile, loading, error } = useUserProfile();
  const { stats } = useStudentDashboardStats({
    studentId,
    streakGraceDayKey: publicProfile?.streakGraceDayKey,
  });
  const cardRef = React.useRef(null);
  const [shareBusy, setShareBusy] = React.useState(false);
  const [captureMilestone, setCaptureMilestone] = React.useState(10);
  const [nameDraft, setNameDraft] = React.useState('');
  const [nameSaving, setNameSaving] = React.useState(false);

  React.useEffect(() => {
    if (publicProfile?.displayName != null) setNameDraft(String(publicProfile.displayName));
  }, [publicProfile?.displayName]);

  const computedLevel = levelFromTotalXp(Number(publicProfile?.xp) || 0);

  React.useEffect(() => {
    if (!studentId || !stats || !publicProfile) return;
    const t = setTimeout(() => {
      syncBadgesFromMetrics(studentId, {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        activeDaysLast30: stats.practiceDaysLast30 ?? 0,
        questionsAnswered: Number(publicProfile.questionsAnswered) || 0,
        level: computedLevel,
        correctTotal: Number(publicProfile.correctTotal) || 0,
        correctMath: Number(publicProfile.correctMath) || 0,
        correctEnglish: Number(publicProfile.correctEnglish) || 0,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [studentId, stats, publicProfile, computedLevel]);

  React.useEffect(() => {
    if (!studentId || !stats?.bestTopics?.length) return;
    const top = stats.bestTopics[0];
    if (top?.subject) setStrongestSubject(studentId, top.subject).catch(() => {});
  }, [studentId, stats?.bestTopics]);

  const closestFocus = React.useMemo(() => {
    const badgeMetrics = {
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      activeDaysLast30: stats?.practiceDaysLast30 ?? 0,
      questionsAnswered: Number(publicProfile?.questionsAnswered) || 0,
      level: computedLevel,
      correctTotal: Number(publicProfile?.correctTotal) || 0,
      correctMath: Number(publicProfile?.correctMath) || 0,
      correctEnglish: Number(publicProfile?.correctEnglish) || 0,
    };
    return pickClosestAchievementOrChallenge({
      badgesEarned: publicProfile?.badges ?? [],
      badgeMetrics,
      challenges: stats?.challenges ?? [],
    });
  }, [stats, publicProfile, computedLevel]);

  async function downloadMilestonePng(milestone) {
    setShareBusy(true);
    try {
      setCaptureMilestone(milestone);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const { default: html2canvas } = await import('html2canvas');
      const el = cardRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#F5F8FF', logging: false });
      const a = document.createElement('a');
      a.download = `sat-bank-milestone-${milestone}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } finally {
      setShareBusy(false);
    }
  }

  async function saveDisplayName() {
    const next = String(nameDraft ?? '').trim();
    if (!next) {
      window.alert('Enter a name (or use “Student”).');
      return;
    }
    setNameSaving(true);
    try {
      await setDisplayName(studentId, next);
    } catch (e) {
      window.alert(e?.message ?? String(e));
    } finally {
      setNameSaving(false);
    }
  }

  if (loading && !publicProfile) {
    return (
      <div className="pb-0">
        <PageBand tone="light" flushTop>
          <Card className="p-8">
            <div className="flex items-center gap-3 text-sm text-mist">
              <Spinner />
              <span className="text-[11.69px] uppercase tracking-kicker">Loading profile</span>
            </div>
          </Card>
        </PageBand>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-0">
        <PageBand tone="light" flushTop>
          <Card className="p-6">
            <div className="kicker text-accent">Profile error</div>
            <div className="mt-2 text-xs text-mist">{String(error?.message ?? error)}</div>
          </Card>
        </PageBand>
      </div>
    );
  }

  const xp = Number(publicProfile?.xp) || 0;
  const prog = levelProgressFromTotalXp(xp);
  const earned = new Set(publicProfile?.badges ?? []);

  return (
    <div className="pb-0">
      <PageBand tone="light" flushTop>
        <PageIntro kicker="Account / Profile" title="Profile & progression">
          {publicProfile?.displayName ? (
            <p className="mt-3 text-sm text-mist">
              <span className="font-semibold text-ink">{publicProfile.displayName}</span>
              {publicProfile?.activeTitle ? (
                <span className="ml-2 text-[12.75px] uppercase tracking-kicker text-accent">
                  · {publicProfile.activeTitle}
                </span>
              ) : null}
            </p>
          ) : null}
        </PageIntro>
      </PageBand>

      <PageBand tone="dark">
      {/* Level & XP — front and center */}
      <section>
        <SectionLabel index="01" title="Level" sub="XP and your next goal" />
        <Card className="overflow-visible">
          <div className="grid grid-cols-1 gap-0 divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="h-full px-6 py-6">
                <div className="kicker">Current</div>
                <div className="mt-2 stat-num text-5xl font-semibold text-ink">Lv {prog.level}</div>
                <div className="mt-5 border-t border-rule pt-5">
                  <div className="kicker">Total XP</div>
                  <div className="mt-1.5 stat-num text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                    {xp.toLocaleString()}
                  </div>
                </div>
              </div>
            <div className="h-full px-6 py-6">
                <div className="kicker">XP to next</div>
                <div className="mt-2 stat-num text-2xl font-semibold text-ink">
                  {prog.xpIntoLevel}
                  <span className="text-[13.81px] text-mist"> / {prog.xpToNextLevel}</span>
                </div>
                <div className="mt-3">
                  <DashProgressBar
                    value={prog.xpIntoLevel}
                    max={prog.xpToNextLevel}
                    height="h-1"
                    palette="accent"
                  />
                </div>
              </div>
            <div className="h-full px-6 py-6">
                <div className="kicker">Closest goal</div>
                {closestFocus ? (
                  <>
                    <div className="mt-2 font-display text-base font-bold leading-snug text-ink">
                      {closestFocus.title}
                    </div>
                    <div className="mt-1.5 stat-num text-xl font-semibold text-ink">
                      {closestFocus.current}
                      <span className="text-[12.75px] font-normal text-mist">
                        {' '}
                        / {closestFocus.target}
                      </span>
                    </div>
                    <div className="mt-2">
                      <DashProgressBar
                        value={closestFocus.current}
                        max={Math.max(1, closestFocus.target)}
                        height="h-1"
                        palette="jade"
                      />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-mist line-clamp-3">
                      {closestFocus.description}
                    </p>
                    <div className="mt-2 text-[10.63px] uppercase tracking-kicker text-mist">
                      {closestFocus.kind === 'challenge'
                        ? 'Goal from your home page today'
                        : 'Next badge'}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-mist">
                    You&apos;re not missing any named badges or open daily goals from here — keep
                    answering questions for XP from the home page, or open{' '}
                    <Link to="/" className="font-semibold text-accent underline-offset-2 hover:underline">
                      Home
                    </Link>{' '}
                    for today&apos;s challenges.
                  </p>
                )}
              </div>
          </div>
        </Card>
      </section>
      </PageBand>

      <PageBand tone="light">
      {/* Identity */}
      <section>
        <SectionLabel index="02" title="Identity" sub="Display name and avatar" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="kicker">Display name</div>
            <p className="mt-1.5 text-sm text-mist">
              Shown on the leaderboard — this is the name classmates see next to your scores.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Field label="Name">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={80}
                    placeholder="Your name"
                    autoComplete="nickname"
                  />
                </Field>
              </div>
              <Button type="button" disabled={nameSaving} onClick={() => saveDisplayName()}>
                {nameSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="kicker">Avatar</div>
            <p className="mt-1.5 text-sm text-mist">
              Pick a background color and a symbol — everyone gets a random pair to start.
            </p>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
              <StudentAvatar
                avatarColor={publicProfile?.avatarColor}
                avatarSymbol={publicProfile?.avatarSymbol}
                size={88}
                rounded="rounded-sm"
                title="Your avatar"
              />
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <div className="kicker">Color</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {AVATAR_PRESET_COLORS.map((c) => {
                      const active =
                        String(publicProfile?.avatarColor || '').toUpperCase() === c.toUpperCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          aria-label={`Avatar color ${c}`}
                          onClick={() =>
                            setAvatarAppearance(studentId, {
                              avatarColor: c,
                              avatarSymbol: publicProfile?.avatarSymbol,
                            }).catch(() => {})
                          }
                          className={clsx(
                            'h-7 w-7 rounded-sm border transition-transform',
                            active ? 'border-ink scale-110' : 'border-rule hover:border-ink'
                          )}
                          style={{ backgroundColor: c }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="kicker">Symbol</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {AVATAR_SYMBOL_IDS.map((sym) => {
                      const active =
                        String(publicProfile?.avatarSymbol || '').toLowerCase() === sym;
                      return (
                        <button
                          key={sym}
                          type="button"
                          aria-label={`Avatar symbol ${sym}`}
                          onClick={() =>
                            setAvatarAppearance(studentId, {
                              avatarColor: publicProfile?.avatarColor,
                              avatarSymbol: sym,
                            }).catch(() => {})
                          }
                          className={clsx(
                            'rounded border p-1 transition-colors',
                            active ? 'border-ink bg-accent-soft' : 'border-rule bg-paper hover:border-ink'
                          )}
                        >
                          <StudentAvatar
                            avatarColor={publicProfile?.avatarColor}
                            avatarSymbol={sym}
                            size={36}
                            rounded="rounded-sm"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
      </PageBand>

      <PageBand tone="dark">
      {/* Titles & badges */}
      <section>
        <SectionLabel index="03" title="Badges" sub="Earned + active title" />
        <Card className="p-6">
          <div className="flex flex-wrap gap-1.5">
            {BADGE_DEFS.map((b) => (
              <HoverTip key={b.id} content={b.description} className="inline-block">
                <span
                  className={clsx(
                    'inline-block rounded-sm border px-2 py-1 text-[11.69px] font-semibold uppercase tracking-kicker',
                    earned.has(b.id)
                      ? 'border-jade bg-jade text-white'
                      : 'border-rule bg-paper text-mist'
                  )}
                >
                  {b.title}
                </span>
              </HoverTip>
            ))}
          </div>
          <div className="mt-6 max-w-md">
            <Field label="Active title">
              <select
                className="block w-full rounded border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
                value={publicProfile?.activeTitle ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setActiveTitle(studentId, v || null).catch(() => {});
                }}
              >
                <option value="">None</option>
                {BADGE_DEFS.filter((b) => earned.has(b.id)).map((b) => (
                  <option key={b.id} value={b.title}>
                    {b.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      </section>
      </PageBand>

      {prog.level >= 10 ? (
        <PageBand tone="light">
        <section>
          <SectionLabel index="04" title="Share" sub="Download a milestone PNG" />
          <Card className="p-6">
            <div className="flex flex-wrap gap-2">
              {[10, 25, 50].map((m) =>
                prog.level >= m ? (
                  <Button
                    key={m}
                    size="sm"
                    disabled={shareBusy}
                    onClick={() => downloadMilestonePng(m)}
                  >
                    Lv {m} card
                  </Button>
                ) : null
              )}
            </div>
          </Card>
        </section>
        </PageBand>
      ) : null}

      <div className="pointer-events-none fixed -left-[9999px] top-0 opacity-0" aria-hidden>
        <MilestoneShareCard
          ref={cardRef}
          milestone={captureMilestone}
          username={publicProfile?.displayName}
          level={prog.level}
          activeTitle={publicProfile?.activeTitle}
          strongestSubject={publicProfile?.strongestSubject}
        />
      </div>
    </div>
  );
}
