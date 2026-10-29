import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { FormattedText } from '../components/FormattedText';
import { useQuestions } from '../context/QuestionsContext';
import { listResponsesForStudentSince } from '../lib/firebase';
import { buildMistakeReviewSessionQuestions } from '../lib/mistakeReviewSession';

function formatWhen(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const days = Math.floor((now - date) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

/** Map MCQ letter to choice text when available. */
function formatStoredAnswer(q, raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '—';
  if (!q) return s;
  const u = s.toUpperCase();
  const choiceMap = {
    A: q.choice_a,
    B: q.choice_b,
    C: q.choice_c,
    D: q.choice_d,
  };
  if (choiceMap[u]) {
    return `${u} · ${choiceMap[u]}`;
  }
  if (['A', 'B', 'C', 'D'].includes(u)) return u;
  return s.length > 280 ? `${s.slice(0, 280)}…` : s;
}

export function ReviewMistakesPage({ studentId }) {
  const navigate = useNavigate();
  const { questions, loading: questionsLoading, error: questionsError } = useQuestions();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!studentId) {
        setLoading(false);
        setItems([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const res = await listResponsesForStudentSince(studentId, since.toISOString(), 2500);
        if (cancelled) return;
        const wrong = res
          .map((r) => ({
            questionId: Number(r.question_id),
            isCorrect: Boolean(r.is_correct),
            ts: String(r.timestamp ?? ''),
            selectedAnswer: String(r.selected_answer ?? r.selectedAnswer ?? '').trim(),
            correctAnswer: String(r.correct_answer ?? r.correctAnswer ?? '').trim(),
          }))
          .filter((r) => Number.isFinite(r.questionId) && !r.isCorrect);

        const latest = new Map();
        for (const r of wrong) {
          const prev = latest.get(r.questionId);
          if (!prev || String(r.ts) > String(prev.ts)) latest.set(r.questionId, r);
        }
        const list = Array.from(latest.values())
          .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
          .slice(0, 30);
        setItems(list);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  function goPracticeFromMistakes(mistakeSubset) {
    if (!questions.length) return;
    const expanded = buildMistakeReviewSessionQuestions(questions, mistakeSubset, 10);
    if (!expanded.length) return;
    const ids = expanded.map((q) => Number(q.id)).filter((n) => Number.isFinite(n));
    navigate('/practice', { state: { reviewAuto: { ids } } });
  }

  function goToSingleQuestion(questionId) {
    if (!Number.isFinite(questionId)) return;
    navigate('/practice', { state: { reviewAuto: { ids: [questionId] } } });
  }

  if (questionsLoading || loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center gap-3 text-sm text-mist">
          <Spinner />
          <span className="text-[11.69px] uppercase tracking-kicker">Loading mistakes</span>
        </div>
      </Card>
    );
  }

  if (questionsError || error) {
    const msg = String((questionsError || error)?.message ?? (questionsError || error));
    return (
      <Card className="p-6">
        <div className="kicker text-accent">Error</div>
        <div className="mt-2 text-sm font-semibold text-ink">Couldn’t load mistakes.</div>
        <div className="mt-2 text-sm text-mist">{msg}</div>
      </Card>
    );
  }

  const canBuildSession = items.length > 0 && questions.length > 0;
  const previewCount = canBuildSession
    ? buildMistakeReviewSessionQuestions(questions, items, 10).length
    : 0;

  return (
    <div className="space-y-10 pb-8">
      {/* Editorial header */}
      <div className="mb-6">
        <div className="kicker">Review / Mistakes</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          What to fix next
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Missed questions from the last 30 days. Start a focused round of up to{' '}
          <span className="font-semibold text-ink">10</span> items that match those
          skills — your misses first, then similar items from the bank.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={!canBuildSession || previewCount < 1}
            onClick={() => goPracticeFromMistakes(items)}
            size="lg"
          >
            {previewCount
              ? `Start review · ${previewCount} ${previewCount === 1 ? 'question' : 'questions'}`
              : 'Start review'}
          </Button>
          <span className="text-[11.69px] uppercase tracking-kicker text-mist">
            {items.length} mistake{items.length === 1 ? '' : 's'} in window
          </span>
        </div>
      </div>

      {items.length ? (
        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between border-b border-rule px-5 py-3">
            <div className="kicker">Recent misses</div>
            <div className="text-[11.69px] uppercase tracking-kicker text-mist">
              Last 30 days
            </div>
          </div>
          <ul className="divide-y divide-rule">
            {items.map((it) => {
              const q = questions.find((qq) => Number(qq.id) === it.questionId);
              const yourLabel = formatStoredAnswer(q, it.selectedAnswer);
              const correctLabel = formatStoredAnswer(
                q,
                it.correctAnswer || (q ? String(q.correct_answer ?? '') : '')
              );
              return (
                <li key={it.questionId} className="px-5 py-5 transition-colors hover:bg-canvas/40">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="kicker text-mist">{formatWhen(it.ts)}</div>
                        <div className="mt-1 text-sm font-semibold text-ink">
                          {q ? `${q.subject} · ${q.domain}` : `Question ${it.questionId}`}
                        </div>
                        <div className="mt-0.5 text-sm text-mist">{q ? q.skill : 'Not in bank — answers from log'}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={!questions.length || !q}
                          onClick={() => goToSingleQuestion(it.questionId)}
                        >
                          Go to question
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!questions.length}
                          onClick={() => goPracticeFromMistakes([it])}
                        >
                          Similar practice ›
                        </Button>
                      </div>
                    </div>

                    {q?.question_text ? (
                      <div className="border border-rule bg-paper px-4 py-3">
                        <div className="kicker">Prompt</div>
                        <div className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                          <FormattedText text={q.question_text} />
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="border border-red-200/80 bg-red-50/80 px-4 py-3">
                        <div className="kicker text-red-800">Your answer</div>
                        <div className="mt-2 text-sm font-medium leading-snug text-red-950">{yourLabel}</div>
                      </div>
                      <div className="border border-jade/40 bg-jade-soft px-4 py-3">
                        <div className="kicker text-jade">Correct answer</div>
                        <div className="mt-2 text-sm font-medium leading-snug text-ink">{correctLabel}</div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="kicker text-jade">All clear</div>
          <div className="mt-2 font-display text-lg font-bold text-ink">No mistakes found</div>
          <div className="mt-1.5 text-sm text-mist">
            Once you miss a few questions in practice, they’ll show up here.
          </div>
        </Card>
      )}
    </div>
  );
}
