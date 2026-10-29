import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useQuestions } from '../context/QuestionsContext';
import { useIsAdmin } from '../context/AdminContext';
import { emptyStudentDashboard } from '../data/studentDashboardDefaults';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { ChallengesSection } from '../components/dashboard/ChallengesSection';
import { QuestionBankSummaryCard } from '../components/dashboard/QuestionBankSummaryCard';
import {
  TodaysPlanBlock,
  ContinueStudyingBlock,
  useBankQueueCounts,
} from '../components/dashboard/StudyCommandSections';
import { useStudentDashboardStats } from '../hooks/useStudentDashboardStats';
import { useUserProfile } from '../context/UserProfileContext';
import { BentoStatCard } from '../components/dashboard/BentoStatCard';
import { IconFlame, IconTarget, IconTrendUp } from '../components/dashboard/DashIcons';
import { PageBand, PageContent } from '../components/PageBand';

/** Small editorial heading for in-page sections. */
function SectionLabel({ index, title, sub, right }) {
  return (
    <div className="mb-3 flex items-baseline justify-between pb-1">
      <div>
        <div className="kicker">
          {index} / {title}
        </div>
        {sub ? (
          <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">{sub}</h2>
        ) : null}
      </div>
      {right ? (
        <div className="text-[11.69px] font-semibold tracking-[0.08em] uppercase text-mist">{right}</div>
      ) : null}
    </div>
  );
}

export function DashboardPage({ studentId }) {
  const { questions, loading, error } = useQuestions();
  const isAdmin = useIsAdmin();
  const { publicProfile } = useUserProfile();
  const { loading: statsLoading, stats, error: statsError } = useStudentDashboardStats({
    studentId,
    streakGraceDayKey: publicProfile?.streakGraceDayKey,
  });
  const { hardBankCount, visualBankCount } = useBankQueueCounts(questions);

  const showStatsLoading = Boolean(studentId) && statsLoading;
  const dashboard = stats ?? emptyStudentDashboard;

  const weakTopicsKey = (dashboard.weakTopics ?? [])
    .map((t) => `${t.subject}:${t.skill}`)
    .join('|');
  const commandCenterDayKey = dashboard.commandCenterDayKey ?? '';
  const dailyRecommendedWeakIndex = Number(dashboard.dailyRecommendedWeakIndex) || 0;
  const [planPickIdx, setPlanPickIdx] = React.useState(0);
  React.useEffect(() => {
    setPlanPickIdx(dailyRecommendedWeakIndex >= 0 ? dailyRecommendedWeakIndex : 0);
  }, [weakTopicsKey, commandCenterDayKey, dailyRecommendedWeakIndex]);

  function swapPlanTopic() {
    const n = dashboard.weakTopics?.length ?? 0;
    if (n <= 1) return;
    setPlanPickIdx((i) => (i + 1) % n);
  }

  const todayLeft = Math.max(
    0,
    Number(dashboard.dailyProgress?.goal ?? 15) - Number(dashboard.dailyProgress?.completed ?? 0)
  );

  return (
    <div className="pb-0">
      {isAdmin ? (
        <PageContent className="!py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-paper px-5 py-3 shadow-soft">
          <div className="kicker">Instructor console</div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/browse">
              <Button variant="secondary" size="sm">
                Browse bank
              </Button>
            </Link>
            <Link to="/add">
              <Button size="sm">Add question</Button>
            </Link>
          </div>
          </div>
        </PageContent>
      ) : null}

      {loading ? (
        <PageContent>
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-sm text-mist">
            <Spinner />
            <span className="text-[11.69px] uppercase tracking-kicker">
              Loading practice hub
            </span>
          </div>
        </Card>
        </PageContent>
      ) : error ? (
        <PageContent>
        <Card className="p-6">
          <div className="kicker text-accent">Couldn&apos;t load questions</div>
          <div className="mt-2 text-sm text-ink">{error.message}</div>
          {isAdmin ? (
            <div className="mt-3 text-xs text-mist">
              Check your <span>.env</span> Firebase web app config and that
              Firestore rules allow reads for signed-in users.
            </div>
          ) : (
            <div className="mt-3 text-sm text-mist">
              Try refreshing the page. If this keeps happening, ask your teacher or whoever runs this
              site for help.
            </div>
          )}
        </Card>
        </PageContent>
      ) : (
        <>
          <PageBand tone="light" flushTop>
            <DashboardHero
              data={dashboard}
              loading={showStatsLoading}
              studentId={studentId}
              questionsAnswered={Number(publicProfile?.questionsAnswered) || 0}
            />
          </PageBand>

          <PageBand tone="dark">
            <SectionLabel index="02" title="Stats" sub="Where you are right now" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <BentoStatCard
                icon={IconFlame}
                label="Current streak"
                value={`${dashboard.currentStreak} d`}
                hint={`Best ? ${dashboard.longestStreak}`}
                tone="accent"
                loading={showStatsLoading}
              />
              <BentoStatCard
                icon={IconTarget}
                label="Today's goal"
                value={`${dashboard.dailyProgress.completed} / ${dashboard.dailyProgress.goal}`}
                hint={`${todayLeft} left`}
                tone="honey"
                loading={showStatsLoading}
                progress={{
                  value: dashboard.dailyProgress.completed,
                  max: Math.max(1, Number(dashboard.dailyProgress.goal) || 15),
                }}
              />
              <BentoStatCard
                icon={IconTrendUp}
                label="Weekly accuracy"
                value={`${dashboard.weekAccuracyPct ?? 0}%`}
                hint="Last 7 days"
                tone="jade"
                loading={showStatsLoading}
                progress={{
                  value: dashboard.weekAccuracyPct ?? 0,
                  max: 100,
                }}
              />
            </div>
          </PageBand>

          <PageBand tone="light">
            <SectionLabel
              index="03"
              title="Today's plan"
              sub="What to work on next"
            />
            <TodaysPlanBlock
              loading={showStatsLoading}
              weakTopics={dashboard.weakTopics}
              recommendedPractice={dashboard.recommendedPractice}
              pickIndex={planPickIdx}
              onSwapTopic={swapPlanTopic}
            />
          </PageBand>

          <PageBand tone="dark">
            <SectionLabel
              index="04"
              title="Continue where you left off"
              sub="Pick up threads"
            />
            <ContinueStudyingBlock
              loading={showStatsLoading}
              mistakeCount={dashboard.mistakeReviewQueueCount ?? 0}
              hardBankCount={hardBankCount}
              visualBankCount={visualBankCount}
            />
          </PageBand>

          <PageBand tone="light">
            <ChallengesSection challenges={dashboard.challenges} loading={showStatsLoading} />
          </PageBand>

          {statsError ? (
            <PageContent>
            <Card className="border-accent p-5">
              <div className="kicker text-accent">Response history error</div>
              <div className="mt-2 text-sm font-semibold text-ink">
                Couldn&apos;t load your responses ? numbers below may stay at zero.
              </div>
              <div className="mt-1 text-xs text-mist">{String(statsError?.message ?? statsError)}</div>
              <div className="mt-2 text-xs text-mist">
                Publish <span>firestore.rules</span> so students can read their own{' '}
                <span>responses</span> collection.
              </div>
            </Card>
            </PageContent>
          ) : null}

          <PageBand tone="dark">
            <SectionLabel index="05" title="Library" sub="What's in the bank" />
            <QuestionBankSummaryCard questions={questions} isAdmin={isAdmin} />
          </PageBand>
        </>
      )}
    </div>
  );
}
