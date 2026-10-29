import React from 'react';
import clsx from 'clsx';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { DifficultyBadge } from '../components/ui/Badge';
import { useQuestions } from '../context/QuestionsContext';
import { FormattedText } from '../components/FormattedText';
import { QuestionImage } from '../components/QuestionImage';
import { ChoiceOptionImage } from '../components/ChoiceOptionImage';
import { QuestionReportModal } from '../components/QuestionReportModal';
import { frqMatches, isFrq } from '../lib/questionFormat';
import { TEST_CONFIG, generateModule1, generateModule2, checkPoolSufficiency } from '../lib/testGenerator';
import { scorePracticeTest, getMissedQuestions } from '../lib/testScoring';
import { saveFullTestAttempt } from '../lib/fullTestHistory';
import { saveLastFullTest } from '../lib/lastSession';
import { useFullTestLock, isFullTestLockedMode } from '../context/FullTestLockContext';

export const STORAGE_KEY = 'sat-full-test-session';

const TEST_SCOPE_LABELS = {
  full: 'Full practice test',
  rw: 'Reading & Writing section',
  math: 'Math section',
};

const ANSWER_CHOICES = ['A', 'B', 'C', 'D'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Countdown timer persisted in localStorage.
 * If `initialSeconds <= 0`, the hook is inert: it does not read/write storage and never calls `onExpire`.
 * (Prevents stale keys like `sat-timer-break` from firing while you are in RW/Math.)
 */
function useCountdown(initialSeconds, onExpire, storageKey) {
  const [remaining, setRemaining] = React.useState(() =>
    initialSeconds > 0 ? initialSeconds : 0
  );
  const startTimeRef = React.useRef(Date.now());
  const initialRef = React.useRef(initialSeconds);
  const onExpireRef = React.useRef(onExpire);
  const expiredFiredRef = React.useRef(false);

  onExpireRef.current = onExpire;

  const fireExpireOnce = React.useCallback(() => {
    if (expiredFiredRef.current) return;
    expiredFiredRef.current = true;
    onExpireRef.current?.();
  }, []);

  React.useEffect(() => {
    expiredFiredRef.current = false;
  }, [storageKey, initialSeconds]);

  React.useEffect(() => {
    if (!initialSeconds || initialSeconds <= 0) {
      setRemaining(0);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { startTime, initial } = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const left = Math.max(0, Number(initial) - elapsed);
        setRemaining(left);
        startTimeRef.current = startTime;
        initialRef.current = Number(initial);
        if (left === 0) fireExpireOnce();
      } catch {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ startTime: Date.now(), initial: initialSeconds })
        );
        startTimeRef.current = Date.now();
        initialRef.current = initialSeconds;
        setRemaining(initialSeconds);
      }
    } else {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ startTime: Date.now(), initial: initialSeconds })
      );
      startTimeRef.current = Date.now();
      initialRef.current = initialSeconds;
      setRemaining(initialSeconds);
    }
  }, [storageKey, initialSeconds, fireExpireOnce]);

  React.useEffect(() => {
    if (!initialSeconds || initialSeconds <= 0) return;
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, initialRef.current - elapsed);
      setRemaining(left);
      if (left === 0) {
        clearInterval(interval);
        fireExpireOnce();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining, initialSeconds, fireExpireOnce]);

  return remaining;
}

function clearAllPhaseTimers() {
  ['rw-1', 'rw-2', 'break', 'math-1', 'math-2'].forEach((m) => {
    try {
      localStorage.removeItem(`sat-timer-${m}`);
    } catch {
      /* ignore */
    }
  });
}

/** Break screen owns the break countdown hook so it never runs during RW/Math. */
function FullTestBreakWithTimer({ onBreakDone }) {
  const timeRemaining = useCountdown(
    TEST_CONFIG.breakMinutes * 60,
    onBreakDone,
    'sat-timer-break'
  );
  return <BreakScreen timeRemaining={timeRemaining} onContinue={onBreakDone} />;
}

function TestLockBanner({ onLeave }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-accent/30 bg-accent/5 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">Timed section — navigation locked</p>
        <p className="mt-0.5 text-xs text-mist">
          Finish this module or exit the test. Other pages are unavailable until then.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onLeave}>
        Exit test…
      </Button>
    </div>
  );
}

/** Intro screen before starting */
function IntroScreen({ onStartScope, poolCheck, loading }) {
  if (loading) {
    return (
      <Card className="p-10">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <span className="text-sm text-mist">Loading question bank...</span>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="kicker">Practice Test</div>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink">
          Full-Length SAT Practice
        </h1>
        <p className="mt-2 text-mist">
          Take a full adaptive test or practice a single section with real timing and scoring.
        </p>
      </div>
      
      <Card>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Test Structure</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="border border-rule p-4">
                <div className="kicker text-accent">Reading & Writing</div>
                <div className="mt-2 text-2xl font-bold text-ink">54 questions</div>
                <div className="mt-1 text-sm text-mist">
                  Module 1: 27 questions · 32 min<br />
                  Module 2: 27 questions · 32 min
                </div>
              </div>
              <div className="border border-rule p-4">
                <div className="kicker text-accent">Math</div>
                <div className="mt-2 text-2xl font-bold text-ink">44 questions</div>
                <div className="mt-1 text-sm text-mist">
                  Module 1: 22 questions · 35 min<br />
                  Module 2: 22 questions · 35 min
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-rule pt-4">
            <h3 className="font-semibold text-ink">Total Time</h3>
            <p className="text-mist">2 hours 14 minutes + 10-minute break</p>
          </div>
          
          <div className="border-t border-rule pt-4">
            <h3 className="font-semibold text-ink">Adaptive Testing</h3>
            <p className="text-sm text-mist">
              Your performance on Module 1 determines whether you receive an easier or harder Module 2.
              This mirrors the real digital SAT format.
            </p>
          </div>
          
          {poolCheck?.warnings?.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 p-4 text-sm">
              <div className="font-semibold text-amber-800">Limited Question Pool</div>
              <ul className="mt-2 text-amber-700 space-y-1">
                {poolCheck.warnings.slice(0, 3).map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="border-t border-rule p-6 space-y-3">
          <p className="text-sm text-mist">
            Choose what to take. Once you start, site navigation is locked until you finish or exit.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => onStartScope('full')}
              disabled={!poolCheck?.canGenerate}
            >
              Full test (RW + Math) →
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => onStartScope('rw')}
              disabled={!poolCheck?.canGenerateRw}
            >
              Reading & Writing only →
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => onStartScope('math')}
              disabled={!poolCheck?.canGenerateMath}
            >
              Math only →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Question card during test */
function QuestionCard({ question, answer, onAnswer, flagged, onToggleFlag, disabled, onReportQuestion }) {
  const frq = isFrq(question);
  const [frqInput, setFrqInput] = React.useState(answer?.selected || '');

  // Keep the textbox independent per-question (prevents FRQ inputs from "linking" across navigation).
  React.useEffect(() => {
    setFrqInput(answer?.selected || '');
  }, [question?.id, answer?.selected]);
  
  const choiceText = {
    A: question.choice_a,
    B: question.choice_b,
    C: question.choice_c,
    D: question.choice_d,
  };
  
  function handleFrqSubmit() {
    if (!frqInput.trim()) return;
    const correct = frqMatches(question.correct_answer, frqInput);
    onAnswer({ selected: frqInput.trim(), correct });
  }
  
  function handleMcqSelect(choice) {
    const correct = choice.toUpperCase() === question.correct_answer.toUpperCase();
    onAnswer({ selected: choice, correct });
  }
  
  return (
    <div className="space-y-6">
      {/* Question header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-mist">
            {question.domain}
          </span>
          {question.skill && (
            <>
              <span className="text-mist">·</span>
              <span className="text-xs text-mist">{question.skill}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {onReportQuestion ? (
            <button
              type="button"
              onClick={onReportQuestion}
              className={clsx(
                'flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-semibold transition-colors',
                'border-red-200 bg-red-50 text-red-800 hover:border-red-300 hover:bg-red-100'
              )}
            >
              Report
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleFlag}
            className={clsx(
              'flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-colors',
              flagged
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-rule bg-paper text-mist hover:border-ink hover:text-ink'
            )}
          >
            {flagged ? '★ Flagged' : '☆ Flag'}
          </button>
        </div>
      </div>
      
      {/* Question image */}
      <QuestionImage
        questionId={question.id}
        imageUrl={question.image_url}
        sizing="adaptive"
        containerClassName="w-full"
        imgClassName="border border-rule bg-paper"
      />
      
      {/* Question text */}
      <div className="whitespace-pre-wrap text-[18.06px] leading-relaxed text-ink">
        <FormattedText text={question.question_text} />
      </div>
      
      {/* Answers */}
      {frq ? (
        <div className="space-y-3">
          <input
            type="text"
            value={frqInput}
            onChange={(e) => setFrqInput(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer..."
            className="w-full rounded border border-rule px-4 py-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {!answer && (
            <Button onClick={handleFrqSubmit} disabled={!frqInput.trim() || disabled}>
              Submit Answer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {ANSWER_CHOICES.map((c) => {
            const selected = answer?.selected?.toUpperCase() === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleMcqSelect(c)}
                disabled={disabled}
                className={clsx(
                  'flex w-full items-start gap-4 rounded border p-4 text-left transition-colors',
                  selected
                    ? 'border-accent bg-accent/5'
                    : 'border-rule bg-paper hover:border-ink',
                  disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border text-xs font-semibold',
                    selected
                      ? 'border-accent bg-accent text-white'
                      : 'border-ink bg-paper text-ink'
                  )}
                >
                  {c}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <ChoiceOptionImage questionId={question.id} optionLetter={c} />
                  {String(choiceText[c] ?? '').trim() ? (
                    <div className="text-[15.94px] text-ink">
                      <FormattedText text={choiceText[c]} className="whitespace-pre-wrap" />
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Navigation grid for questions */
function QuestionNav({ questions, answers, flagged, currentIndex, onNavigate }) {
  return (
    <div className="grid grid-cols-9 gap-1.5">
      {questions.map((q, i) => {
        const hasAnswer = answers[q.id] != null;
        const isFlagged = flagged.has(q.id);
        const isCurrent = i === currentIndex;
        
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onNavigate(i)}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors',
              isCurrent && 'ring-2 ring-accent ring-offset-1',
              hasAnswer && !isFlagged && 'bg-ink text-white',
              hasAnswer && isFlagged && 'bg-amber-500 text-white',
              !hasAnswer && isFlagged && 'border-2 border-amber-500 bg-amber-50 text-amber-700',
              !hasAnswer && !isFlagged && 'border border-rule bg-paper text-mist hover:border-ink'
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

/** Module test screen */
function ModuleScreen({
  moduleKey,
  moduleLabel,
  questions,
  answers,
  flagged,
  currentIndex,
  timeRemaining,
  timeExpired,
  onAnswer,
  onToggleFlag,
  onNavigate,
  onSubmit,
  studentId,
  studentEmail,
}) {
  const q = questions[currentIndex];
  const [reportOpen, setReportOpen] = React.useState(false);

  React.useEffect(() => {
    setReportOpen(false);
  }, [q?.id]);

  const answered = Object.keys(answers).filter(id =>
    questions.some(qq => String(qq.id) === String(id))
  ).length;
  
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Main content */}
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between border-b border-rule px-5 py-3">
            <div>
              <div className="kicker">{moduleLabel}</div>
              <div className="mt-1 text-lg font-semibold text-ink">
                Question {currentIndex + 1} of {questions.length}
              </div>
            </div>
            <div className={clsx(
              'text-2xl font-bold tabular-nums',
              timeRemaining < 300 ? 'text-red-600' : 'text-ink'
            )}>
              {formatTime(timeRemaining)}
              {timeExpired ? (
                <p className="mt-1 text-right text-xs font-semibold text-red-600">
                  Time expired — submitting module…
                </p>
              ) : null}
            </div>
          </div>
          
          <div className="p-6">
            {q && (
              <QuestionCard
                question={q}
                answer={answers[q.id]}
                onAnswer={(ans) => onAnswer(q.id, ans)}
                flagged={flagged.has(q.id)}
                onToggleFlag={() => onToggleFlag(q.id)}
                disabled={false}
                onReportQuestion={() => setReportOpen(true)}
              />
            )}
          </div>
          
          <div className="flex items-center justify-between border-t border-rule px-5 py-4">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => onNavigate(currentIndex - 1)}
            >
              ← Previous
            </Button>
            <Button
              disabled={currentIndex === questions.length - 1}
              onClick={() => onNavigate(currentIndex + 1)}
            >
              Next →
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Sidebar */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="kicker mb-3">Progress</div>
          <div className="text-sm text-mist">
            {answered} of {questions.length} answered
          </div>
          <div className="mt-3">
            <QuestionNav
              questions={questions}
              answers={answers}
              flagged={flagged}
              currentIndex={currentIndex}
              onNavigate={onNavigate}
            />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="kicker mb-3">Legend</div>
          <div className="space-y-2 text-xs text-mist">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded border border-rule bg-paper" />
              Unanswered
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-ink" />
              Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded border-2 border-amber-500 bg-amber-50" />
              Flagged
            </div>
          </div>
        </Card>
        
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            const unanswered = questions.length - answered;
            const msg = unanswered > 0
              ? `You have ${unanswered} unanswered question(s). Submit anyway?`
              : 'Submit this module?';
            if (window.confirm(msg)) onSubmit();
          }}
        >
          Submit Module
        </Button>
      </div>
    </div>

      <QuestionReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={q?.id}
        studentEmail={studentEmail}
      />
    </>
  );
}

/** Break screen between sections */
function BreakScreen({ timeRemaining, onContinue }) {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-8 text-center">
        <div className="kicker">Break Time</div>
        <h2 className="font-display mt-2 text-3xl font-bold text-ink">
          Take a 10-Minute Break
        </h2>
        <div className="mt-6 text-5xl font-bold tabular-nums text-accent">
          {formatTime(timeRemaining)}
        </div>
        <p className="mt-6 text-mist">
          Stand up, stretch, grab some water. The Math section starts next.
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={onContinue}>
            Continue to Math →
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Results screen */
function ResultsScreen({ results, modules, answers, testScope, onNewTest }) {
  const rwMax = (modules.rw1?.questions?.length || 0) + (modules.rw2?.questions?.length || 0);
  const mathMax = (modules.math1?.questions?.length || 0) + (modules.math2?.questions?.length || 0);
  const allQuestions = [
    ...(modules.rw1?.questions || []),
    ...(modules.rw2?.questions || []),
    ...(modules.math1?.questions || []),
    ...(modules.math2?.questions || []),
  ];
  const missed = getMissedQuestions(allQuestions, answers);
  
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="kicker">Practice Test Complete</div>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink">
          {TEST_SCOPE_LABELS[testScope] || 'Your Results'}
        </h1>
      </div>
      
      {/* Estimated Scores */}
      <Card>
        <div className="p-6">
          <div className="text-center">
            <div className="kicker">Estimated SAT Score</div>
            <div className="mt-2 text-5xl font-bold text-ink">
              {results.total.range.low}–{results.total.range.high}
            </div>
          </div>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-rule p-4 text-center">
              <div className="kicker text-accent">Reading & Writing</div>
              <div className="mt-2 text-3xl font-bold text-ink">
                {results.rw.range.low}–{results.rw.range.high}
              </div>
              <div className="mt-1 text-sm text-mist">
                {results.rw.raw.total} / {rwMax || 54} correct
              </div>
              <div className="mt-1 text-xs text-mist">
                {results.rw.isHarderRoute ? 'Harder' : 'Easier'} Module 2
              </div>
            </div>
            <div className="border border-rule p-4 text-center">
              <div className="kicker text-accent">Math</div>
              <div className="mt-2 text-3xl font-bold text-ink">
                {results.math.range.low}–{results.math.range.high}
              </div>
              <div className="mt-1 text-sm text-mist">
                {results.math.raw.total} / {mathMax || 44} correct
              </div>
              <div className="mt-1 text-xs text-mist">
                {results.math.isHarderRoute ? 'Harder' : 'Easier'} Module 2
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-xs text-mist">
            This is an estimated SAT score based on this app's adaptive module path and answer pattern.
            Official SAT scores are calculated by College Board using proprietary scoring.
          </div>
        </div>
      </Card>
      
      {/* Module Breakdown */}
      <Card>
        <div className="border-b border-rule px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Module Breakdown</h2>
        </div>
        <div className="divide-y divide-rule">
          {[
            { label: 'RW Module 1', raw: results.rw.raw.m1, total: 27 },
            { label: 'RW Module 2', raw: results.rw.raw.m2, total: 27, note: results.rw.isHarderRoute ? '(Harder)' : '(Easier)' },
            { label: 'Math Module 1', raw: results.math.raw.m1, total: 22 },
            { label: 'Math Module 2', raw: results.math.raw.m2, total: 22, note: results.math.isHarderRoute ? '(Harder)' : '(Easier)' },
          ].map((m, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3">
              <span className="text-ink">
                {m.label} {m.note && <span className="text-mist text-sm">{m.note}</span>}
              </span>
              <span className="font-semibold text-ink">{m.raw} / {m.total}</span>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Domain Breakdown */}
      <Card>
        <div className="border-b border-rule px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink">By Domain</h2>
        </div>
        <div className="divide-y divide-rule">
          {Object.entries(results.domainBreakdown)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, data]) => (
              <div key={key} className="flex items-center justify-between px-6 py-3">
                <span className="text-ink text-sm">{data.domain}</span>
                <span className="font-semibold text-ink">{data.correct} / {data.total}</span>
              </div>
            ))}
        </div>
      </Card>
      
      {/* Difficulty Breakdown */}
      <Card>
        <div className="border-b border-rule px-6 py-4">
          <h2 className="font-display text-lg font-bold text-ink">By Difficulty</h2>
        </div>
        <div className="divide-y divide-rule">
          {['Easy', 'Medium', 'Hard'].map((d) => {
            const data = results.difficultyBreakdown[d] || { correct: 0, total: 0 };
            return (
              <div key={d} className="flex items-center justify-between px-6 py-3">
                <span className="flex items-center gap-2">
                  <DifficultyBadge difficulty={d} />
                </span>
                <span className="font-semibold text-ink">{data.correct} / {data.total}</span>
              </div>
            );
          })}
        </div>
      </Card>
      
      {/* Missed Questions */}
      {missed.length > 0 && (
        <Card>
          <div className="border-b border-rule px-6 py-4">
            <h2 className="font-display text-lg font-bold text-ink">
              Missed Questions ({missed.length})
            </h2>
          </div>
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
                <div className="mt-3 text-ink">
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
                {q.explanation && (
                  <div className="mt-3 text-sm text-mist">
                    <span className="font-semibold">Explanation:</span>{' '}
                    <FormattedText text={q.explanation} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Actions */}
      <div className="flex justify-center gap-4 pb-8">
        <Button variant="secondary" onClick={() => window.location.href = '/'}>
          Back to Dashboard
        </Button>
        <Button onClick={onNewTest}>
          Take Another Test
        </Button>
      </div>
    </div>
  );
}

/** Main test page component */
export function FullTestPage({ studentId, studentEmail }) {
  const { questions, loading } = useQuestions();
  const { setLocked, registerTestActions, promptLeaveTest } = useFullTestLock();
  
  // Test state
  const [mode, setMode] = React.useState('intro'); // intro, starting, rw-1, rw-2, break, math-1, math-2, results
  const [testScope, setTestScope] = React.useState('full'); // full | rw | math
  const [modules, setModules] = React.useState({});
  const [answers, setAnswers] = React.useState({});
  const [flagged, setFlagged] = React.useState(new Set());
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [results, setResults] = React.useState(null);
  const [poolCheck, setPoolCheck] = React.useState(null);
  const [timerKey, setTimerKey] = React.useState(0);
  const [attemptId, setAttemptId] = React.useState(null);
  const [attemptCreatedAt, setAttemptCreatedAt] = React.useState(null);
  const [timeExpired, setTimeExpired] = React.useState(false);
  const submittingRef = React.useRef(false);
  
  // Check pool on load
  React.useEffect(() => {
    if (!loading && questions.length > 0) {
      setPoolCheck(checkPoolSufficiency(questions));
    }
  }, [loading, questions]);
  
  // Restore session from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.mode && data.mode !== 'intro' && data.mode !== 'results') {
          setMode(data.mode);
          setTestScope(data.testScope || 'full');
          setModules(data.modules || {});
          setAnswers(data.answers || {});
          setFlagged(new Set(data.flagged || []));
          setCurrentIndex(data.currentIndex || 0);
        }
      } catch (e) {
        console.error('Failed to restore test session', e);
      }
    }
  }, []);
  
  // Save session to localStorage
  React.useEffect(() => {
    if (mode !== 'intro' && mode !== 'results') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode,
        testScope,
        modules,
        answers,
        flagged: Array.from(flagged),
        currentIndex,
        savedAt: Date.now(),
      }));
    }
  }, [mode, testScope, modules, answers, flagged, currentIndex]);

  React.useEffect(() => {
    setLocked(isFullTestLockedMode(mode));
  }, [mode, setLocked]);

  React.useEffect(() => {
    submittingRef.current = false;
    setTimeExpired(false);
  }, [mode]);
  
  // Get current module config
  const getCurrentModule = React.useCallback(() => {
    switch (mode) {
      case 'rw-1': return { key: 'rw1', questions: modules.rw1?.questions || [], minutes: TEST_CONFIG.rw.module1Minutes };
      case 'rw-2': return { key: 'rw2', questions: modules.rw2?.questions || [], minutes: TEST_CONFIG.rw.module2Minutes };
      case 'math-1': return { key: 'math1', questions: modules.math1?.questions || [], minutes: TEST_CONFIG.math.module1Minutes };
      case 'math-2': return { key: 'math2', questions: modules.math2?.questions || [], minutes: TEST_CONFIG.math.module2Minutes };
      default: return null;
    }
  }, [mode, modules]);
  
  // Use ref to store submit handler so timer callback always has latest version
  const submitRef = React.useRef(null);
  
  // Get time remaining for current module
  const currentModule = getCurrentModule();
  
  // Timer expiry handler - uses ref to avoid stale closures
  const handleTimerExpire = React.useCallback(() => {
    setTimeExpired(true);
    if (submitRef.current) submitRef.current();
  }, []);
  
  const timeRemaining = useCountdown(
    currentModule ? currentModule.minutes * 60 : 0,
    handleTimerExpire,
    `sat-timer-${mode}`
  );
  
  // Start test (full, rw-only, or math-only)
  function handleStartTest(scope = 'full') {
    clearAllPhaseTimers();
    setTestScope(scope);
    const id = `ft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setAttemptId(id);
    setAttemptCreatedAt(new Date().toISOString());
    const usedIds = new Set();
    setAnswers({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setMode('starting');
    setTimerKey((k) => k + 1);

    if (scope === 'math') {
      const math1 = generateModule1(questions, 'Math', usedIds);
      math1.questions.forEach((q) => usedIds.add(q.id));
      setModules({
        math1: { questions: math1.questions, warnings: math1.warnings },
        usedIds: Array.from(usedIds),
      });
      window.setTimeout(() => setMode('math-1'), 650);
      return;
    }

    const rw1 = generateModule1(questions, 'English', usedIds);
    rw1.questions.forEach((q) => usedIds.add(q.id));

    if (scope === 'rw') {
      setModules({
        rw1: { questions: rw1.questions, warnings: rw1.warnings },
        usedIds: Array.from(usedIds),
      });
      window.setTimeout(() => setMode('rw-1'), 650);
      return;
    }

    const math1 = generateModule1(questions, 'Math', usedIds);
    math1.questions.forEach((q) => usedIds.add(q.id));
    setModules({
      rw1: { questions: rw1.questions, warnings: rw1.warnings },
      math1: { questions: math1.questions, warnings: math1.warnings },
      usedIds: Array.from(usedIds),
    });
    window.setTimeout(() => setMode('rw-1'), 650);
  }

  function finishTest(modulesSnapshot = modules) {
    const testResults = scorePracticeTest({ modules: modulesSnapshot, answers });
    setResults(testResults);
    setMode('results');
    localStorage.removeItem(STORAGE_KEY);
    clearAllPhaseTimers();

    try {
      saveFullTestAttempt({
        studentId,
        attempt: {
          id: attemptId,
          createdAt: attemptCreatedAt,
          completedAt: new Date().toISOString(),
            meta: {
              testScope,
              route: {
                rw2Harder: Boolean(modulesSnapshot?.rw2?.isHarder),
                math2Harder: Boolean(modulesSnapshot?.math2?.isHarder),
              },
            },
            results: testResults,
            modules: {
              rw1: { questionIds: (modulesSnapshot?.rw1?.questions || []).map((q) => q.id), isHarder: false },
              rw2: { questionIds: (modulesSnapshot?.rw2?.questions || []).map((q) => q.id), isHarder: Boolean(modulesSnapshot?.rw2?.isHarder) },
              math1: { questionIds: (modulesSnapshot?.math1?.questions || []).map((q) => q.id), isHarder: false },
              math2: { questionIds: (modulesSnapshot?.math2?.questions || []).map((q) => q.id), isHarder: Boolean(modulesSnapshot?.math2?.isHarder) },
            },
          answers,
          flagged: Array.from(flagged),
        },
      });
    } catch {
      // ignore
    }

    if (studentId) {
      const correct = testResults?.total?.raw ?? 0;
      const total = testResults?.total?.maxRaw ?? 0;
      const pct = total ? Math.round((correct / total) * 100) : 0;
      const low = testResults?.total?.range?.low;
      const high = testResults?.total?.range?.high;
      const range =
        Number.isFinite(low) && Number.isFinite(high) ? ` · Est. ${low}–${high}` : '';
      saveLastFullTest(studentId, {
        scoreLabel: TEST_SCOPE_LABELS[testScope] || 'Practice test',
        detail: `${correct}/${total} correct (${pct}%)${range} · Just now`,
        href: '/tests',
      });
    }
  }
  
  // Submit current module (RW/Math only; break uses `handleBreakDone`)
  function handleSubmitModule() {
    if (submittingRef.current) return;
    const currentMod = getCurrentModule();
    if (!currentMod) return;
    submittingRef.current = true;

    localStorage.removeItem(`sat-timer-${mode}`);

    if (mode === 'rw-1') {
      // Calculate RW M1 score and generate RW M2
      const m1Correct = currentMod.questions.filter(q => answers[q.id]?.correct).length;
      const usedIds = new Set(modules.usedIds || []);
      const rw2 = generateModule2(questions, 'English', m1Correct, usedIds);
      rw2.questions.forEach(q => usedIds.add(q.id));
      
      setModules(prev => ({
        ...prev,
        rw2: { questions: rw2.questions, isHarder: rw2.isHarder, warnings: rw2.warnings },
        usedIds: Array.from(usedIds),
      }));
      setCurrentIndex(0);
      setMode('rw-2');
    } else if (mode === 'rw-2') {
      if (testScope === 'rw') {
        finishTest(modules);
        return;
      }
      setMode('break');
    } else if (mode === 'math-1') {
      // Calculate Math M1 score and generate Math M2
      const m1Correct = currentMod.questions.filter(q => answers[q.id]?.correct).length;
      const usedIds = new Set(modules.usedIds || []);
      const math2 = generateModule2(questions, 'Math', m1Correct, usedIds);

      setModules(prev => ({
        ...prev,
        math2: { questions: math2.questions, isHarder: math2.isHarder, warnings: math2.warnings },
      }));
      setCurrentIndex(0);
      setMode('math-2');
    } else if (mode === 'math-2') {
      finishTest();
    }
  }
  
  // Keep ref updated for timer callback
  React.useEffect(() => {
    submitRef.current = handleSubmitModule;
  });

  const handleForfeitTest = React.useCallback(() => {
    clearAllPhaseTimers();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAttemptId(null);
    setAttemptCreatedAt(null);
    setTestScope('full');
    setMode('intro');
    setModules({});
    setAnswers({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setResults(null);
    setTimeExpired(false);
    submittingRef.current = false;
  }, []);

  React.useEffect(() => {
    registerTestActions({
      canSubmitModule: Boolean(getCurrentModule()),
      submitModule: () => submitRef.current?.(),
      exitTest: handleForfeitTest,
    });
  }, [mode, modules, registerTestActions, handleForfeitTest, getCurrentModule]);
  
  function handleAnswer(questionId, answer) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }
  
  function handleToggleFlag(questionId) {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }
  
  function handleNewTest() {
    handleForfeitTest();
  }

  const handleBreakDone = React.useCallback(() => {
    localStorage.removeItem('sat-timer-break');
    setCurrentIndex(0);
    setMode('math-1');
  }, []);

  // Render based on mode
  if (mode === 'intro') {
    return (
      <IntroScreen
        onStartScope={handleStartTest}
        poolCheck={poolCheck}
        loading={loading}
      />
    );
  }

  if (mode === 'starting') {
    return (
      <Card className="p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner />
          <div className="mt-2 text-sm font-semibold text-ink">
            {testScope === 'math'
              ? 'Preparing your Math section…'
              : testScope === 'rw'
                ? 'Preparing your Reading & Writing section…'
                : 'Preparing your full practice test…'}
          </div>
          <div className="text-xs text-mist">Selecting modules · setting timers · loading the interface</div>
        </div>
      </Card>
    );
  }
  
  if (mode === 'break') {
    return (
      <>
        <TestLockBanner onLeave={promptLeaveTest} />
        <FullTestBreakWithTimer onBreakDone={handleBreakDone} />
      </>
    );
  }
  
  if (mode === 'results' && results) {
    return (
      <ResultsScreen
        results={results}
        modules={modules}
        answers={answers}
        testScope={testScope}
        onNewTest={handleNewTest}
      />
    );
  }
  
  // Module screens
  const moduleLabels = {
    'rw-1': 'Reading & Writing · Module 1',
    'rw-2': `Reading & Writing · Module 2 ${modules.rw2?.isHarder ? '(Harder)' : '(Easier)'}`,
    'math-1': 'Math · Module 1',
    'math-2': `Math · Module 2 ${modules.math2?.isHarder ? '(Harder)' : '(Easier)'}`,
  };
  
  const mod = getCurrentModule();
  if (!mod || mod.questions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Spinner />
        <div className="mt-3 text-mist">Loading module...</div>
      </Card>
    );
  }
  
  return (
    <>
      <TestLockBanner onLeave={promptLeaveTest} />
      <ModuleScreen
      key={`${mode}-${timerKey}`}
      moduleKey={mod.key}
      moduleLabel={moduleLabels[mode] || mode}
      questions={mod.questions}
      answers={answers}
      flagged={flagged}
      currentIndex={currentIndex}
      timeRemaining={timeRemaining}
      timeExpired={timeExpired}
      onAnswer={handleAnswer}
      onToggleFlag={handleToggleFlag}
      onNavigate={setCurrentIndex}
      onSubmit={handleSubmitModule}
      studentId={studentId}
      studentEmail={studentEmail}
    />
    </>
  );
}
