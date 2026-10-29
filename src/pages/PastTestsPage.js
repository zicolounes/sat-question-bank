import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DifficultyBadge } from '../components/ui/Badge';
import { useQuestions } from '../context/QuestionsContext';
import { FormattedText } from '../components/FormattedText';
import { PageBand, PageIntro } from '../components/PageBand';
import { getMissedQuestions } from '../lib/testScoring';
import { deleteFullTestAttempt, getFullTestAttempt, listFullTestAttempts } from '../lib/fullTestHistory';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(iso || '');
  }
}

/** Longer label for cards (weekday + date). */
function formatCardDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return formatDate(iso);
  }
}

function scoreRangeText(range) {
  if (!range || range.low == null || range.high == null) return '—';
  return `${range.low}–${range.high}`;
}

function AttemptCard({ attempt }) {
  const total = attempt?.results?.total?.range;
  const rw = attempt?.results?.rw?.range;
  const math = attempt?.results?.math?.range;
  const taken = formatCardDate(attempt.completedAt || attempt.createdAt);
  const rwRoute = attempt?.meta?.route?.rw2Harder ? 'Harder' : 'Easier';
  const mathRoute = attempt?.meta?.route?.math2Harder ? 'Harder' : 'Easier';

  return (
    <Link
      to={`/tests/${attempt.id}`}
      className="group block h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <Card className="flex h-full min-h-[260px] flex-col overflow-hidden transition-colors duration-200 hover:border-ink">
        <div className="flex items-start justify-between gap-3 border-b border-rule bg-canvas/60 px-5 py-4">
          <div className="min-w-0">
            <div className="kicker">Date taken</div>
            <div className="mt-1.5 font-display text-lg font-bold leading-snug tracking-tight text-ink sm:text-xl">
              {taken}
            </div>
            <div className="mt-1.5 text-[11.69px] font-medium text-mist">Full-length practice test</div>
          </div>
          <span
            className="shrink-0 pt-6 text-[11.69px] font-semibold uppercase tracking-kicker text-accent opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            Open →
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
          <div className="kicker text-accent">Total score</div>
          <div className="stat-num mt-2 text-5xl font-bold tabular-nums leading-[0.95] tracking-tight text-ink sm:text-6xl md:text-7xl">
            {scoreRangeText(total)}
          </div>
          <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-0 overflow-hidden rounded-sm border border-rule divide-x divide-rule">
            <div className="bg-paper px-3 py-5 sm:px-4">
              <div className="kicker text-accent">Reading & Writing</div>
              <div className="stat-num mt-1.5 text-xl font-semibold tabular-nums text-ink sm:text-2xl">
                {scoreRangeText(rw)}
              </div>
            </div>
            <div className="bg-paper px-3 py-5 sm:px-4">
              <div className="kicker text-accent">Math</div>
              <div className="stat-num mt-1.5 text-xl font-semibold tabular-nums text-ink sm:text-2xl">
                {scoreRangeText(math)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto border-t border-rule bg-canvas/50 px-5 py-3 text-center text-[10.63px] uppercase tracking-kicker text-mist">
          RW M2 {rwRoute} · Math M2 {mathRoute}
        </div>
      </Card>
    </Link>
  );
}

function PastTestsIndex({ studentId }) {
  const attempts = React.useMemo(() => listFullTestAttempts({ studentId }), [studentId]);

  return (
    <div className="pb-0">
      <PageBand tone="light" flushTop>
        <PageIntro
          kicker="Tests / History"
          title="Past practice tests"
          sub="Bluebook-style score history — open an attempt to review mistakes and explanations."
          actions={
            <Link to="/full-test">
              <Button size="lg">Take a full practice test →</Button>
            </Link>
          }
        />
      </PageBand>

      <PageBand tone="dark">
        {attempts.length === 0 ? (
          <Card>
            <div className="p-8">
              <div className="text-sm font-semibold text-ink">No full tests yet</div>
              <div className="mt-2 text-sm text-mist">
                Take one from the dashboard. Your completed tests will appear here automatically.
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {attempts.map((a) => (
              <AttemptCard key={a.id} attempt={a} />
            ))}
          </div>
        )}
      </PageBand>
    </div>
  );
}

function PastTestDetail({ studentId }) {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { questions } = useQuestions();

  const attempt = React.useMemo(
    () => getFullTestAttempt({ studentId, attemptId }),
    [studentId, attemptId]
  );

  const qById = React.useMemo(() => {
    const map = new Map();
    questions.forEach((q) => map.set(String(q.id), q));
    return map;
  }, [questions]);

  const allQs = React.useMemo(() => {
    if (!attempt?.modules) return [];
    const ids = [
      ...(attempt.modules.rw1?.questionIds || []),
      ...(attempt.modules.rw2?.questionIds || []),
      ...(attempt.modules.math1?.questionIds || []),
      ...(attempt.modules.math2?.questionIds || []),
    ];
    return ids.map((id) => qById.get(String(id))).filter(Boolean);
  }, [attempt?.modules, qById]);

  const missed = React.useMemo(() => {
    if (!attempt?.answers) return [];
    return getMissedQuestions(allQs, attempt.answers);
  }, [allQs, attempt?.answers]);

  if (!attempt) {
    return (
      <div className="pb-0">
        <PageBand tone="light" flushTop>
          <PageIntro kicker="Tests / Not found" title="Attempt not found" />
          <Button variant="secondary" onClick={() => navigate('/tests')}>
            Back to history
          </Button>
        </PageBand>
      </div>
    );
  }

  const total = attempt?.results?.total?.range;
  const rw = attempt?.results?.rw?.range;
  const math = attempt?.results?.math?.range;

  return (
    <div className="pb-0">
      <PageBand tone="light" flushTop>
        <PageIntro
          kicker="Tests / Attempt"
          title="Full-length SAT practice"
          sub={`Completed ${formatDate(attempt.completedAt || attempt.createdAt)}`}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/tests')}>
                Back
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (!window.confirm('Delete this attempt from your history?')) return;
                  deleteFullTestAttempt({ studentId, attemptId: attempt.id });
                  navigate('/tests');
                }}
              >
                Delete
              </Button>
            </div>
          }
        />
      </PageBand>

      <PageBand tone="dark">
        <Card>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center">
                <div className="kicker">Total</div>
                <div className="mt-2 text-4xl font-bold text-ink">
                  {total ? `${total.low}–${total.high}` : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="kicker text-accent">Reading & Writing</div>
                <div className="mt-2 text-3xl font-bold text-ink">
                  {rw ? `${rw.low}–${rw.high}` : '—'}
                </div>
              </div>
              <div className="text-center">
                <div className="kicker text-accent">Math</div>
                <div className="mt-2 text-3xl font-bold text-ink">
                  {math ? `${math.low}–${math.high}` : '—'}
                </div>
              </div>
            </div>
            <div className="mt-6 text-center text-xs text-mist">
              Route · RW {attempt?.meta?.route?.rw2Harder ? 'Harder' : 'Easier'} Module 2 · Math{' '}
              {attempt?.meta?.route?.math2Harder ? 'Harder' : 'Easier'} Module 2
            </div>
          </div>
        </Card>
      </PageBand>

      <PageBand tone="light">
        <Card>
          <div className="border-b border-rule px-6 py-4">
            <h2 className="font-display text-lg font-bold text-ink">Review mistakes</h2>
            <div className="mt-1 text-xs text-mist">Missed questions ({missed.length})</div>
          </div>
          {missed.length === 0 ? (
            <div className="p-6 text-sm text-mist">No missed questions found for this attempt.</div>
          ) : (
            <div className="divide-y divide-rule">
              {missed.map((q) => (
                <div key={q.id} className="p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-mist">
                    <span>{q.subject}</span>
                    <span>·</span>
                    <span>{q.domain}</span>
                    <span>·</span>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-ink">
                    <FormattedText text={q.question_text} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="border border-red-200 bg-red-50 p-3">
                      <div className="text-xs font-semibold text-red-700">Your Answer</div>
                      <div className="mt-1 text-red-900">{q.studentAnswer}</div>
                    </div>
                    <div className="border border-green-200 bg-green-50 p-3">
                      <div className="text-xs font-semibold text-green-700">Correct Answer</div>
                      <div className="mt-1 text-green-900">{q.correctAnswer}</div>
                    </div>
                  </div>
                  {q.explanation ? (
                    <div className="mt-3 text-sm text-mist">
                      <span className="font-semibold">Explanation:</span>{' '}
                      <FormattedText text={q.explanation} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageBand>
    </div>
  );
}

export function PastTestsPage({ studentId }) {
  const { attemptId } = useParams();
  return attemptId ? <PastTestDetail studentId={studentId} /> : <PastTestsIndex studentId={studentId} />;
}
