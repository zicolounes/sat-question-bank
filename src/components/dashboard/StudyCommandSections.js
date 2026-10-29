import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { DashProgressBar } from './DashProgressBar';

function subjectDisplay(subject) {
  if (subject === 'English') return 'Reading and Writing';
  if (subject === 'Math') return 'Math';
  return subject || 'Practice';
}

function practiceHref({ subject, skill, difficulty, count }) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (skill) params.set('skill', skill);
  if (difficulty) params.set('difficulty', difficulty);
  if (count != null) params.set('count', String(count));
  const q = params.toString();
  return q ? `/practice?${q}` : '/practice';
}

function questionHasVisual(q) {
  if (String(q?.image_url ?? '').trim()) return true;
  const t = String(q?.question_text ?? '').toLowerCase();
  return /\b(graph|table|chart|figure|diagram)\b/.test(t);
}

function whyForTopic(rec) {
  if (!rec) return '';
  if (Number(rec.pct) < 45) {
    return `Rough week here (${rec.pct}% across ${rec.total} tries) — a short, focused set moves this fastest.`;
  }
  if (Number(rec.pct) < 60) {
    return `This lane is behind your average at ${rec.pct}%. A tight batch of reps will raise the floor.`;
  }
  return `${rec.total} attempts this week at ${rec.pct}% — still room to polish before test day.`;
}

/** 03 — Two-column “today’s plan”: recommended set + weakest skills. */
export function TodaysPlanBlock({
  loading,
  weakTopics,
  recommendedPractice,
  pickIndex,
  onSwapTopic,
}) {
  const n = Array.isArray(weakTopics) ? weakTopics.length : 0;
  const safeIdx = n ? Math.min(Math.max(0, pickIndex), n - 1) : 0;
  const rec = n ? weakTopics[safeIdx] : null;

  const matchesDailyRecommended =
    Boolean(rec && recommendedPractice) &&
    String(recommendedPractice.skill) === String(rec.skill) &&
    String(recommendedPractice.subject) === String(rec.subject);

  const merged = rec
    ? {
        subject: rec.subject,
        skill: rec.skill,
        label: rec.label,
        pct: rec.pct,
        total: rec.total,
        why: matchesDailyRecommended && recommendedPractice.why ? recommendedPractice.why : whyForTopic(rec),
        suggestedDifficulty: 'Medium',
        suggestedCount: 8,
      }
    : null;

  const startHref = merged
    ? practiceHref({
        subject: merged.subject,
        skill: merged.skill,
        difficulty: merged.suggestedDifficulty || 'Medium',
        count: merged.suggestedCount ?? 8,
      })
    : '/practice';

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-7">
        <div className="kicker mb-2">Recommended set</div>
        <Card className="overflow-hidden border-ink/10">
          {loading ? (
            <div className="flex items-center gap-3 px-6 py-10 text-sm text-mist">
              <Spinner />
              <span className="text-[11.69px] uppercase tracking-kicker">Loading plan</span>
            </div>
          ) : merged ? (
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="text-[11.69px] uppercase tracking-kicker text-mist">
                Next best practice
              </div>
              <h3 className="font-display mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {subjectDisplay(merged.subject)}
                <span className="text-mist"> · </span>
                {merged.label}
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-mist">{merged.why}</p>
              <p className="mt-3 text-sm font-medium text-ink">
                Start with {merged.suggestedCount ?? 8} {String(merged.suggestedDifficulty || 'Medium').toLowerCase()}{' '}
                questions.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={startHref}
                  className={clsx(
                    'inline-flex h-11 items-center justify-center gap-2 rounded px-5 text-[15.94px] font-medium tracking-tight transition-colors',
                    'bg-accent text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                  )}
                >
                  Start set →
                </Link>
                {weakTopics.length > 1 ? (
                  <Button type="button" variant="secondary" size="lg" onClick={onSwapTopic}>
                    Swap topic
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-6 py-7 sm:px-8">
              <h3 className="font-display text-xl font-bold tracking-tight text-ink">Build your baseline</h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-mist">
                After a handful of questions this week, we will recommend a skill to sharpen and rank what needs the
                most reps.
              </p>
              <div className="mt-6">
                <Link
                  to="/practice"
                  className="inline-flex h-11 items-center justify-center rounded px-5 text-[15.94px] font-medium tracking-tight bg-accent text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Start practicing →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-5">
        <div className="kicker mb-2">Weakest skills</div>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-3 px-5 py-8 text-sm text-mist">
              <Spinner />
              <span className="text-[11.69px] uppercase tracking-kicker">Loading skills</span>
            </div>
          ) : !weakTopics.length ? (
            <p className="px-5 py-6 text-sm leading-relaxed text-mist">
              Ranked skills appear once you have a few attempts on record this week.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {weakTopics.map((t) => (
                <li key={`${t.subject}|${t.skill}`} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-ink">{t.label}</span>
                    <span className="shrink-0 text-[13.81px] font-semibold text-ink">{t.pct}%</span>
                  </div>
                  <div className="mt-2">
                    <DashProgressBar value={t.pct} max={100} height="h-px" palette="byPercent" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[10.63px] uppercase tracking-kicker text-mist">
                      {t.total != null ? `${t.total} attempted` : '—'}
                    </span>
                    <Link to={practiceHref({ subject: t.subject, skill: t.skill })}>
                      <Button size="sm" variant="secondary" className="h-7 px-2.5 text-[11.69px]">
                        Practice
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ContinueCard({ title, body, to, loading }) {
  return (
    <Link
      to={to}
      className={clsx(
        'group flex min-h-[120px] flex-col rounded-md bg-paper p-4 shadow-soft transition-colors',
        'hover:border-ink hover:bg-canvas/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
      )}
    >
      <div className="kicker text-mist transition-colors group-hover:text-ink">{title}</div>
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-mist">
          <Spinner />
        </div>
      ) : (
        <p className="mt-3 flex-1 text-sm font-medium leading-snug text-ink">{body}</p>
      )}
      <div className="mt-4 text-[10.63px] uppercase tracking-kicker text-accent group-hover:underline">
        Open →
      </div>
    </Link>
  );
}

/** 04 — Quick paths: mistakes, hard pool, visual-heavy items. */
export function ContinueStudyingBlock({ loading, mistakeCount, hardBankCount, visualBankCount }) {
  const mistakesBody =
    mistakeCount > 0
      ? `${mistakeCount} question${mistakeCount === 1 ? '' : 's'} ready to revisit`
      : 'Nothing in the queue — great work';
  const hardBody =
    hardBankCount > 0
      ? `${hardBankCount} Hard question${hardBankCount === 1 ? '' : 's'} in the bank`
      : 'Hard items will show here as the bank grows';
  const visualBody =
    visualBankCount > 0
      ? `${visualBankCount} graph, table, or figure item${visualBankCount === 1 ? '' : 's'}`
      : 'Visual prompts will appear as they are added';

  const hardCap = Math.min(12, Math.max(1, hardBankCount || 1));
  const visualCap = Math.min(10, Math.max(1, visualBankCount || 1));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ContinueCard title="Mistakes to review" body={mistakesBody} to="/review" loading={loading} />
      <ContinueCard
        title="Hard questions queue"
        body={hardBody}
        to={hardBankCount > 0 ? `/practice?difficulty=Hard&count=${hardCap}` : '/practice'}
        loading={loading}
      />
      <ContinueCard
        title="Image / table questions"
        body={visualBody}
        to={visualBankCount > 0 ? `/practice?visual=1&count=${visualCap}` : '/practice'}
        loading={loading}
      />
    </div>
  );
}

export function useBankQueueCounts(questions) {
  return React.useMemo(() => {
    const list = Array.isArray(questions) ? questions : [];
    const hardBankCount = list.filter((q) => String(q?.difficulty) === 'Hard').length;
    const visualBankCount = list.filter(questionHasVisual).length;
    return { hardBankCount, visualBankCount };
  }, [questions]);
}

