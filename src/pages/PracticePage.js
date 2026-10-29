import React from 'react';
import clsx from 'clsx';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { MultiSelectPills } from '../components/ui/MultiSelectPills';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import {
  ANSWER_CHOICES,
  DIFFICULTIES,
  SAT_TAXONOMY,
  findDomainForSkill,
  findSubjectAndDomainForSkill,
  findSubjectForDomain,
  getDomainsForSubject,
  getSkillsForSubjectDomain,
} from '../constants/satTaxonomy';
import { useQuestions } from '../context/QuestionsContext';
import { useIsAdmin } from '../context/AdminContext';
import { filterQuestions, uniq } from '../lib/filtering';
import { frqMatches, isFrq } from '../lib/questionFormat';
import { AnimatePresence, motion } from 'framer-motion';
import { appendResponseLog } from '../lib/firebase';
import { useUserProfile } from '../context/UserProfileContext';
import {
  awardXp,
  baseXpForCorrect,
  recordPracticeAnswer,
  tryGrantDailyFirstCorrectBonus,
} from '../lib/userProfile';
import { QuestionImage } from '../components/QuestionImage';
import { FormattedText } from '../components/FormattedText';
import { ChoiceOptionImage } from '../components/ChoiceOptionImage';
import { QuestionReportModal } from '../components/QuestionReportModal';
import { DifficultyBadge } from '../components/ui/Badge';
import { loadLastSession, saveInProgressPractice, saveLastPracticeRound } from '../lib/lastSession';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Up to `targetSize` questions: missed items first, then same domain (+ difficulty when known) from the bank. */
function buildRetryMissSet(missedQuestions, allQuestions, targetSize = 5) {
  const m = missedQuestions.filter(Boolean);
  if (!m.length) return [];
  const used = new Set(m.map((q) => Number(q.id)));
  const shuffledMisses = shuffle([...m]);
  const out = [...shuffledMisses];
  if (out.length >= targetSize) return out.slice(0, targetSize);

  const domains = uniq(m.map((q) => String(q.domain ?? '').trim()).filter(Boolean));
  const difficulties = uniq(m.map((q) => String(q.difficulty ?? '').trim()).filter(Boolean));
  const extraPool = filterQuestions(allQuestions ?? [], {
    subject: 'Both',
    domains,
    skills: [],
    difficulties: difficulties.length ? difficulties : [],
    keyword: '',
  }).filter((q) => !used.has(Number(q.id)));

  for (const q of shuffle(extraPool)) {
    if (out.length >= targetSize) break;
    out.push(q);
    used.add(Number(q.id));
  }
  return out.slice(0, Math.min(targetSize, out.length));
}

function getDomainsBySubject(subject) {
  if (subject === 'Both') {
    return uniq([
      ...Object.keys(SAT_TAXONOMY.Math),
      ...Object.keys(SAT_TAXONOMY.English),
    ]);
  }
  if (!SAT_TAXONOMY[subject]) return [];
  return Object.keys(SAT_TAXONOMY[subject]);
}

function getSkillsBySubjectsAndDomains(subject, domains) {
  const pickedDomains = domains ?? [];
  if (!pickedDomains.length) return [];
  const subjects = subject === 'Both' ? ['Math', 'English'] : [subject];
  return uniq(
    subjects.flatMap((s) =>
      pickedDomains.flatMap((d) => getSkillsForSubjectDomain(s, d))
    )
  );
}

/** Parse `scoreByDomain` keys shaped like `Math • Advanced Math`. */
function parseScoreDomainKey(fullKey) {
  const sep = ' • ';
  const i = fullKey.indexOf(sep);
  if (i === -1) return null;
  const subject = fullKey.slice(0, i);
  const domain = fullKey.slice(i + sep.length);
  if (subject !== 'Math' && subject !== 'English') return null;
  return { subject, domain };
}

/**
 * Score tile color: soft red only for 0–20%, then orange → yellow through ~80%,
 * yellow → green 80–90%, saturated green 90–100%.
 */
function scoreResultCellStyle(pct) {
  const p = Math.max(0, Math.min(100, pct));
  let hue;
  let sat;
  let light;

  if (p <= 20) {
    const u = p / 20;
    hue = 4;
    sat = 56 - u * 4;
    light = 42 + u * 5;
  } else if (p <= 80) {
    const u = (p - 20) / 60;
    hue = 16 + u * 40;
    sat = 60 + u * 8;
    light = 47 + u * 7;
  } else if (p <= 90) {
    const u = (p - 80) / 10;
    hue = 56 + u * 36;
    sat = 68 - u * 6;
    light = 54 + u * 3;
  } else {
    const u = (p - 90) / 10;
    hue = 92 + u * 44;
    sat = 62 + u * 16;
    light = 57 + u * 5;
  }

  const ink = '#0a1224';
  const paper = '#ffffff';
  const useDarkText = light >= 52;
  return {
    backgroundColor: `hsl(${hue} ${sat}% ${light}%)`,
    color: useDarkText ? ink : paper,
    kickerColor: useDarkText ? 'rgba(10,18,36,0.55)' : 'rgba(255,255,255,0.78)',
  };
}

/** Editorial flat progress bar — single hairline track, solid blue fill. */
function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1 w-full overflow-hidden bg-ink/[0.07]">
      <motion.div
        className="h-1 bg-accent"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

/** Editorial answer row — thin border, kicker letter, no rounded blob. */
function AnswerOption({
  label,
  text,
  questionId,
  state,
  disabled,
  eliminated,
  selected,
  onClick,
  onToggleEliminate,
}) {
  const tone = {
    neutral: 'border-rule bg-paper hover:border-ink',
    correct: 'border-emerald-600 bg-emerald-50',
    wrong: 'border-red-600 bg-red-50',
  }[state || 'neutral'];

  const qid = Number(questionId);
  const showOptionImage = Number.isFinite(qid) && qid > 0;
  const trimmedChoice = String(text ?? '').trim();

  return (
    <div className="group relative">
      <button
        type="button"
        className={clsx(
          'flex w-full items-start gap-4 rounded border p-4 text-left transition-colors',
          tone,
          selected && !disabled && 'border-ink',
          disabled && 'cursor-not-allowed'
        )}
        onClick={onClick}
        disabled={disabled}
      >
        <span
          className={clsx(
            'mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded border text-[12.75px] font-semibold transition-colors',
            state === 'correct' && 'border-emerald-700 bg-emerald-700 text-white',
            state === 'wrong' && 'border-red-700 bg-red-700 text-white',
            state !== 'correct' && state !== 'wrong' && 'border-ink bg-paper text-ink group-hover:bg-ink group-hover:text-white'
          )}
        >
          {label}
        </span>
        <div className="min-w-0 flex-1">
          {eliminated ? (
            <div className="mb-1.5 text-[10.63px] uppercase tracking-kicker text-mist">
              Eliminated
            </div>
          ) : null}
          {showOptionImage ? (
            <ChoiceOptionImage questionId={qid} optionLetter={label} className="mb-2" />
          ) : null}
          {trimmedChoice ? (
            <div
              className={clsx(
                'text-[15.94px] leading-6',
                state === 'wrong' ? 'text-red-950' : 'text-ink',
                eliminated && 'line-through opacity-50'
              )}
            >
              <FormattedText text={text} />
            </div>
          ) : showOptionImage ? null : (
            <div
              className={clsx(
                'text-[15.94px] leading-6',
                state === 'wrong' ? 'text-red-950' : 'text-ink',
                eliminated && 'line-through opacity-50'
              )}
            >
              <FormattedText text="—" />
            </div>
          )}
        </div>
      </button>

      {onToggleEliminate ? (
        <button
          type="button"
          onClick={onToggleEliminate}
          className="absolute right-3 top-3 rounded border border-rule bg-paper/95 px-1.5 py-0.5 text-[10.63px] uppercase tracking-kicker text-mist opacity-0 transition hover:border-ink hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Toggle eliminate ${label}`}
          title="Eliminate choice"
        >
          {eliminated ? 'Undo' : 'Elim'}
        </button>
      ) : null}
    </div>
  );
}

/** Editorial section heading helper — kicker + display title + optional right meta. */
function SectionHeader({ kicker, title, sub, right }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <div className="kicker">{kicker}</div>
        {title ? (
          <h1 className="font-display mt-1 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
        ) : null}
        {sub ? <p className="mt-2 max-w-xl text-sm text-mist">{sub}</p> : null}
      </div>
      {right ? (
        <div className="hidden text-[11.69px] uppercase tracking-kicker text-mist sm:block">
          {right}
        </div>
      ) : null}
    </div>
  );
}

export function PracticePage({ studentId, studentEmail, studentName }) {
  const { questions, loading, error } = useQuestions();
  const isAdmin = useIsAdmin();
  const { publicProfile } = useUserProfile();
  /** Avoid double session bonus under React Strict Mode (ref resets on remount). */
  const lastSessionBonusIdRef = React.useRef(null);
  /** Profile level when the current session started (for end-of-session level-up banner). */
  const practiceSessionStartLevelRef = React.useRef(1);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const lastAppliedFilterKey = React.useRef('');
  const lastAppliedIdsParam = React.useRef('');
  const reviewAutoHandledRef = React.useRef(false);
  const resumePracticeHandledRef = React.useRef(false);
  const [retryMissesBooting, setRetryMissesBooting] = React.useState(false);
  const [fixedIdsPool, setFixedIdsPool] = React.useState(null); // null or Question[]

  const [subject, setSubject] = React.useState('Both');
  const [domains, setDomains] = React.useState([]);
  const [skills, setSkills] = React.useState([]);
  const [difficulties, setDifficulties] = React.useState([]);
  const [count, setCount] = React.useState(10);
  const [reportOpen, setReportOpen] = React.useState(false);

  const clearAllFilters = React.useCallback(() => {
    setFixedIdsPool(null);
    setSubject('Both');
    setDomains([]);
    setSkills([]);
    setDifficulties([]);
    setCount(10);
    navigate('/practice', { replace: true });
  }, [navigate]);

  const domainOptions = React.useMemo(
    () => getDomainsBySubject(subject),
    [subject]
  );
  const skillOptions = React.useMemo(
    () => getSkillsBySubjectsAndDomains(subject, domains),
    [subject, domains]
  );

  React.useEffect(() => {
    setDomains((prev) => prev.filter((d) => domainOptions.includes(d)));
  }, [domainOptions]);
  React.useEffect(() => {
    setSkills((prev) => prev.filter((s) => skillOptions.includes(s)));
  }, [skillOptions]);

  React.useEffect(() => {
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      if (lastAppliedIdsParam.current !== '') {
        lastAppliedIdsParam.current = '';
        setFixedIdsPool(null);
      }
      return;
    }
    if (lastAppliedIdsParam.current === idsParam) return;
    lastAppliedIdsParam.current = idsParam;
    const ids = String(idsParam)
      .split(',')
      .map((x) => Number(String(x).trim()))
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return;
    const byId = new Map(questions.map((q) => [Number(q.id), q]));
    const picked = ids.map((id) => byId.get(Number(id))).filter(Boolean);
    if (!picked.length) return;
    setFixedIdsPool(picked);
    setCount(Math.min(10, Math.max(1, picked.length)));
  }, [searchParams, questions]);

  React.useEffect(() => {
    const subj = searchParams.get('subject');
    const skill = searchParams.get('skill');
    const domainParam = searchParams.get('domain');
    const diffParam = searchParams.get('difficulty');
    const countParam = searchParams.get('count');

    const key = `${subj ?? ''}|${skill ?? ''}|${domainParam ?? ''}|${diffParam ?? ''}|${countParam ?? ''}`;
    if (lastAppliedFilterKey.current === key) return;
    lastAppliedFilterKey.current = key;

    if (countParam != null && countParam !== '') {
      const n = Number(countParam);
      if (Number.isFinite(n)) setCount(Math.max(1, Math.min(50, Math.floor(n))));
    }

    if (diffParam && ['Easy', 'Medium', 'Hard'].includes(diffParam)) {
      setDifficulties([diffParam]);
    }

    if (skill) {
      if (subj === 'Math' || subj === 'English') {
        const domain = findDomainForSkill(subj, skill);
        if (domain) {
          setSubject(subj);
          setDomains([domain]);
          setSkills([skill]);
        } else {
          setSubject(subj);
          setSkills([skill]);
        }
      } else {
        const resolved = findSubjectAndDomainForSkill(skill);
        if (resolved) {
          setSubject(resolved.subject);
          setDomains([resolved.domain]);
          setSkills([skill]);
        } else {
          setSkills([skill]);
        }
      }
      return;
    }

    if (domainParam) {
      const decoded = decodeURIComponent(domainParam);
      const inferred =
        subj === 'Math' || subj === 'English' ? subj : findSubjectForDomain(decoded);
      if (inferred && getDomainsForSubject(inferred).includes(decoded)) {
        setSubject(inferred);
        setDomains([decoded]);
        setSkills([]);
      }
      return;
    }

    if (subj === 'Math' || subj === 'English') {
      setSubject(subj);
      if (!domainParam) {
        setDomains([]);
        setSkills([]);
      }
    }
  }, [searchParams]);

  const visualOnly = searchParams.get('visual') === '1';

  const pool = React.useMemo(() => {
    if (Array.isArray(fixedIdsPool)) return fixedIdsPool;
    let list = filterQuestions(questions, {
      subject,
      domains,
      skills,
      difficulties,
      keyword: '',
    });
    if (visualOnly) {
      list = list.filter((q) => {
        if (String(q?.image_url ?? '').trim()) return true;
        const t = String(q?.question_text ?? '').toLowerCase();
        return /\b(graph|table|chart|figure|diagram)\b/.test(t);
      });
    }
    return list;
  }, [questions, subject, domains, skills, difficulties, fixedIdsPool, visualOnly]);

  const [mode, setMode] = React.useState('config'); // config | session | results
  const [session, setSession] = React.useState(null);
  /** Set when session-end XP bonus causes a level increase (from → to). */
  const [sessionLevelUp, setSessionLevelUp] = React.useState(null);

  React.useEffect(() => {
    if (mode !== 'results' || !session || !studentId) return;
    const sid = session.session_id;
    if (!sid || lastSessionBonusIdRef.current === sid) return;
    lastSessionBonusIdRef.current = sid;
    setSessionLevelUp(null);
    const correct = Object.values(session.answers).filter((a) => a.correct).length;
    const bonus = 25 + correct * 2;
    awardXp(studentId, bonus)
      .then((r) => {
        const started = practiceSessionStartLevelRef.current;
        if (r?.newLevel > started) {
          setSessionLevelUp({ from: started, to: r.newLevel });
        }
      })
      .catch(() => {});
  }, [mode, session, studentId]);
  const [questionStartMs, setQuestionStartMs] = React.useState(Date.now());
  const [mcqDraftSelection, setMcqDraftSelection] = React.useState('');
  const [frqDraftChanged, setFrqDraftChanged] = React.useState(false);
  const [mcqDraftChanged, setMcqDraftChanged] = React.useState(false);

  const startFromQuestionList = React.useCallback(
    (pickedQuestions) => {
      const picked = Array.isArray(pickedQuestions) ? pickedQuestions.filter(Boolean) : [];
      if (!picked.length) return;
      practiceSessionStartLevelRef.current = Number(publicProfile?.level) || 1;
      setSession({
        session_id: crypto.randomUUID(),
        questions: picked,
        idx: 0,
        answers: {},
        scoreByDomain: {},
        eliminated: {},
      });
      setFrqInput('');
      setMcqDraftSelection('');
      setFrqDraftChanged(false);
      setMcqDraftChanged(false);
      setQuestionStartMs(Date.now());
      lastSessionBonusIdRef.current = null;
      setSessionLevelUp(null);
      setMode('session');
    },
    [publicProfile?.level]
  );

  React.useEffect(() => {
    if (mode !== 'results' || !session || !studentId) return;
    saveLastPracticeRound(studentId, session);
  }, [mode, session, studentId]);

  React.useEffect(() => {
    if (mode !== 'session' || !session || !studentId) return;
    saveInProgressPractice(studentId, session);
  }, [mode, session, studentId]);

  React.useEffect(() => {
    if (!location.state?.resumePractice || !studentId) {
      resumePracticeHandledRef.current = false;
      return;
    }
    if (loading) return;

    const stored = loadLastSession(studentId);
    const snap = stored?.inProgress ? stored.session : null;
    if (!snap?.questionIds?.length) {
      navigate('.', { replace: true, state: {} });
      return;
    }
    if (resumePracticeHandledRef.current) return;
    resumePracticeHandledRef.current = true;

    const byId = new Map(questions.map((q) => [Number(q.id), q]));
    const picked = snap.questionIds.map((id) => byId.get(Number(id))).filter(Boolean);
    if (!picked.length) {
      navigate('.', { replace: true, state: {} });
      return;
    }

    const idx = Math.min(Math.max(0, Number(snap.idx) || 0), picked.length - 1);
    practiceSessionStartLevelRef.current = Number(publicProfile?.level) || 1;
    setSession({
      session_id: snap.session_id || crypto.randomUUID(),
      questions: picked,
      idx,
      answers: snap.answers ?? {},
      scoreByDomain: snap.scoreByDomain ?? {},
      eliminated: snap.eliminated ?? {},
    });
    setFrqInput('');
    setMcqDraftSelection('');
    setFrqDraftChanged(false);
    setMcqDraftChanged(false);
    setQuestionStartMs(Date.now());
    lastSessionBonusIdRef.current = null;
    setSessionLevelUp(null);
    setMode('session');
    navigate('.', { replace: true, state: {} });
  }, [location.state, studentId, loading, questions, navigate, publicProfile?.level]);

  function start() {
    const n = Math.max(1, Math.min(Number(count) || 1, pool.length || 1));
    startFromQuestionList(shuffle(pool).slice(0, n));
  }

  React.useEffect(() => {
    const ids = location.state?.reviewAuto?.ids;
    if (!Array.isArray(ids) || !ids.length) {
      reviewAutoHandledRef.current = false;
      return;
    }
    if (loading) return;
    const byId = new Map(questions.map((q) => [Number(q.id), q]));
    const picked = ids.map((id) => byId.get(Number(id))).filter(Boolean);
    if (!picked.length) {
      navigate('.', { replace: true, state: {} });
      return;
    }
    if (reviewAutoHandledRef.current) return;
    reviewAutoHandledRef.current = true;
    const n = Math.min(10, picked.length);
    setFixedIdsPool(picked);
    setCount(n);
    navigate('.', { replace: true, state: {} });
    startFromQuestionList(shuffle(picked).slice(0, n));
  }, [location.state, questions, loading, navigate, startFromQuestionList]);

  React.useEffect(() => {
    const payload = location.state?.retryMissesAuto;
    if (!payload?.ids?.length) return;
    if (loading) return;

    const ids = payload.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (!ids.length) {
      navigate('.', { replace: true, state: {} });
      setRetryMissesBooting(false);
      return;
    }

    const sessionQs = session?.questions ?? [];
    const byBank = new Map((questions ?? []).map((q) => [Number(q.id), q]));
    const missed = ids
      .map((id) => byBank.get(id) ?? sessionQs.find((q) => Number(q.id) === id))
      .filter(Boolean);
    if (!missed.length) {
      navigate('.', { replace: true, state: {} });
      setRetryMissesBooting(false);
      return;
    }

    const picked = buildRetryMissSet(missed, questions, 5);
    if (!picked.length) {
      navigate('.', { replace: true, state: {} });
      setRetryMissesBooting(false);
      return;
    }

    let cancelled = false;
    const delayMs = 650;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setFixedIdsPool(null);
      navigate('.', { replace: true, state: {} });
      startFromQuestionList(picked);
      setRetryMissesBooting(false);
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [location.state, questions, loading, session, navigate, startFromQuestionList]);

  function currentQuestion() {
    if (!session) return null;
    return session.questions[session.idx] ?? null;
  }

  const q = currentQuestion();
  const frq = isFrq(q);
  const [frqInput, setFrqInput] = React.useState('');
  const questionId = q?.id;

  React.useEffect(() => {
    if (questionId == null) return;
    setQuestionStartMs(Date.now());
    setMcqDraftSelection('');
    setMcqDraftChanged(false);
    setFrqDraftChanged(false);
  }, [questionId]);

  function toggleEliminate(choice) {
    if (!session || !q) return;
    const key = String(choice).toUpperCase();
    setSession((s) => {
      const perQ = s.eliminated?.[q.id] ?? {};
      const nextPerQ = { ...perQ, [key]: !perQ[key] };
      return { ...s, eliminated: { ...s.eliminated, [q.id]: nextPerQ } };
    });
  }

  function answer(choice) {
    if (!session || !q) return;
    if (session.answers[q.id]) return;

    const selected = String(choice);
    const correct = frq
      ? frqMatches(q.correct_answer, selected)
      : String(selected).toUpperCase() === String(q.correct_answer).toUpperCase();

    setSession((s) => {
      const nextAnswers = { ...s.answers, [q.id]: { selected, correct } };
      const domainKey = `${q.subject} • ${q.domain}`;
      const prev = s.scoreByDomain[domainKey] ?? { correct: 0, total: 0 };
      const nextScoreByDomain = {
        ...s.scoreByDomain,
        [domainKey]: {
          correct: prev.correct + (correct ? 1 : 0),
          total: prev.total + 1,
        },
      };
      return { ...s, answers: nextAnswers, scoreByDomain: nextScoreByDomain };
    });

    const timeSpentSeconds = Math.max(
      1,
      Math.round((Date.now() - questionStartMs) / 1000)
    );

    const answerChanged = frq ? frqDraftChanged : mcqDraftChanged;

    const responseRow = {
      student_id: studentId,
      student_email: studentEmail ?? '',
      student_name: studentName ?? '',
      session_id: session.session_id,
      question_id: q.id,
      subject: q.subject,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      selected_answer: selected,
      correct_answer: q.correct_answer,
      is_correct: correct,
      time_spent_seconds: timeSpentSeconds,
      answer_changed: answerChanged,
      timestamp: new Date().toISOString(),
    };

    appendResponseLog(responseRow).catch((e) => {
      console.error('Failed to append response log', e);
    });

    if (studentId) {
      void recordPracticeAnswer(studentId, { subject: q.subject, correct })
        .then(() => {
          if (!correct) return undefined;
          return tryGrantDailyFirstCorrectBonus(studentId).then(() =>
            awardXp(studentId, baseXpForCorrect(q.difficulty))
          );
        })
        .catch((e) => console.error('Practice stats / XP failed', e));
    }
  }

  function next() {
    if (!session) return;
    const isLast = session.idx >= session.questions.length - 1;
    if (isLast) {
      setMode('results');
      return;
    }
    setFrqInput('');
    setMcqDraftSelection('');
    setFrqDraftChanged(false);
    setMcqDraftChanged(false);
    setSession((s) => ({ ...s, idx: s.idx + 1 }));
  }

  if (loading) {
    return (
      <Card className="p-10">
        <div className="flex flex-col items-center justify-center gap-3 text-sm text-mist">
          <Spinner />
          <span className="text-[11.69px] uppercase tracking-kicker">
            Loading practice bank
          </span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="kicker text-accent">Firestore error</div>
        <div className="mt-2 text-sm text-ink">{error.message}</div>
      </Card>
    );
  }

  if (retryMissesBooting) {
    return (
      <Card className="p-10">
        <div className="flex max-w-md flex-col items-center justify-center gap-3 text-sm text-mist">
          <Spinner />
          <span className="text-[11.69px] uppercase tracking-kicker">Preparing retry set</span>
          <p className="text-center text-[13.81px] leading-relaxed">
            Up to 5 questions from what you missed and the same domain (and difficulty when we know
            it). You&apos;ll jump in right after this.
          </p>
        </div>
      </Card>
    );
  }

  if (mode === 'config') {
    const sessionSize = Math.max(1, Math.min(Number(count) || 1, pool.length || 1));
    const activeParts = [
      subject !== 'Both' ? subject : null,
      domains?.length ? `${domains.length} domain${domains.length === 1 ? '' : 's'}` : null,
      skills?.length ? `${skills.length} skill${skills.length === 1 ? '' : 's'}` : null,
      difficulties?.length
        ? difficulties.length === 1
          ? difficulties[0]
          : `${difficulties.length} difficulties`
        : null,
    ].filter(Boolean);
    return (
      <div className="space-y-5 pb-4 sm:space-y-8 sm:pb-6">
        <SectionHeader
          kicker="Practice / Configure"
          title="Build a focused set"
          sub="Pick a slice of the bank and run questions one at a time — instant feedback after each answer."
          right={`${pool.length} in pool`}
        />

        <Card className="overflow-hidden">
          {/* Summary strip — same flat language as results / dashboard */}
          <div className="grid grid-cols-1 divide-y divide-rule border-b border-rule bg-canvas sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="relative px-5 py-4 sm:px-6 sm:py-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />
              <div className="pl-3">
                <div className="kicker">Pool</div>
                <div className="mt-1.5 stat-num text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                  {pool.length}
                </div>
                <div className="mt-1 text-[11.69px] uppercase tracking-kicker text-mist">
                  Match filters
                </div>
              </div>
            </div>
            <div className="relative px-5 py-4 sm:px-6 sm:py-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-honey" aria-hidden />
              <div className="pl-3">
                <div className="kicker">Length</div>
                <div className="mt-1.5 stat-num text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                  {sessionSize}
                </div>
                <div className="mt-1 text-[11.69px] uppercase tracking-kicker text-mist">
                  Cap {Math.max(1, pool.length)}
                </div>
              </div>
            </div>
            <div className="relative px-5 py-4 sm:px-6 sm:py-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-jade" aria-hidden />
              <div className="min-w-0 pl-3">
                <div className="kicker">Focus</div>
                <div className="mt-1.5 truncate font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  {subject === 'Both' ? 'Math + English' : subject}
                </div>
                <div className="mt-1 text-[11.69px] uppercase tracking-kicker text-mist">Subject</div>
              </div>
            </div>
          </div>

          <div className="border-b border-rule bg-paper px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="kicker">Filters</div>
                <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Build your set
                </h2>
                {!activeParts.length ? (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">
                    No filters applied — the full pool is eligible. Narrow by subject, difficulty,
                    domain, or skill.
                  </p>
                ) : null}
                {activeParts.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2 sm:gap-2.5">
                    {activeParts.map((part) => (
                      <li key={part}>
                        <span className="inline-flex items-center rounded-full border border-rule bg-canvas px-3 py-1.5 text-xs font-medium text-ink">
                          {part}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <Button variant="secondary" className="shrink-0 self-start sm:self-auto" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          </div>

          <div className="space-y-8 bg-paper px-5 py-7 sm:px-8 sm:py-8 lg:space-y-9">
            <div className="rounded-md border border-rule bg-canvas p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-end lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8">
                <div className="md:col-span-1 lg:col-span-3">
                  <Field label="Subject">
                    <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                      <option value="Both">Both</option>
                      <option value="Math">Math only</option>
                      <option value="English">English only</option>
                    </Select>
                  </Field>
                </div>
                <div className="md:col-span-1 lg:col-span-3">
                  <Field label="Questions" hint={`Up to ${Math.max(1, pool.length)}`}>
                    <Input
                      type="number"
                      min={1}
                      max={Math.max(1, pool.length)}
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      className="min-h-[2.75rem] text-base tabular-nums"
                    />
                  </Field>
                </div>
                <div className="md:col-span-2 lg:col-span-6">
                  <Field label="Difficulty">
                    <MultiSelectPills
                      options={DIFFICULTIES}
                      selected={difficulties}
                      onChange={setDifficulties}
                      variant="difficulty"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
              <section className="flex min-h-[12rem] flex-col rounded-md border border-rule bg-canvas p-5 sm:min-h-[13rem] sm:p-6">
                <div className="kicker mb-3">Domain</div>
                <div className="min-h-0 flex-1">
                  <MultiSelectPills
                    options={domainOptions}
                    selected={domains}
                    onChange={setDomains}
                    emptyLabel="Pick a subject to see domains."
                  />
                </div>
              </section>
              <section
                className={clsx(
                  'flex min-h-[12rem] flex-col rounded-md border border-rule p-5 sm:min-h-[13rem] sm:p-6',
                  !domains.length ? 'bg-paper opacity-70' : 'bg-canvas'
                )}
              >
                <div className="kicker mb-3">Skill</div>
                <div className="min-h-0 flex-1">
                  <MultiSelectPills
                    options={skillOptions}
                    selected={skills}
                    onChange={setSkills}
                    disabled={!domains.length}
                    emptyLabel="Select one or more domains first."
                  />
                </div>
              </section>
            </div>

            <div className="border-t border-rule bg-canvas px-2 py-6 sm:px-4 sm:py-7">
              <div className="mx-auto w-full max-w-lg">
                <Button className="w-full" disabled={!pool.length} onClick={start} size="lg">
                  Start session →
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (mode === 'results' && session) {
    const total = session.questions.length;
    const correct = Object.values(session.answers).filter((a) => a.correct).length;
    const wrong = Math.max(0, total - correct);
    const pct = total ? Math.round((correct / total) * 100) : 0;

    const missIds = session.questions
      .filter((q) => session.answers[q.id] && !session.answers[q.id].correct)
      .map((q) => q.id);

    const byAccuracy = (a, b) => {
      const ra = a.total ? a.correct / a.total : 0;
      const rb = b.total ? b.correct / b.total : 0;
      if (ra !== rb) return ra - rb;
      if (a.correct !== b.correct) return a.correct - b.correct;
      return b.total - a.total;
    };

    const rows = Object.entries(session.scoreByDomain).map(([key, s]) => {
      const domainPct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
      return { domain: key, ...s, domainPct };
    });
    const activeRows = rows.filter((r) => r.total > 0);
    const breakdown = [...activeRows].sort(byAccuracy);
    const hadMissInDomain = activeRows.some((r) => r.correct < r.total);
    const weakest = hadMissInDomain && activeRows.length ? [...activeRows].sort(byAccuracy)[0] : null;
    const strongest =
      activeRows.length > 1 ? [...activeRows].sort((a, b) => -byAccuracy(a, b))[0] : null;
    const weakestParsed = weakest ? parseScoreDomainKey(weakest.domain) : null;

    const resetToConfig = (path) => {
      setSession(null);
      setSessionLevelUp(null);
      setFixedIdsPool(null);
      setSubject('Both');
      setDomains([]);
      setSkills([]);
      setDifficulties([]);
      setMode('config');
      navigate(path ?? '/practice', { replace: true });
    };

    const handleRetryMisses = () => {
      if (!missIds.length) return;
      setRetryMissesBooting(true);
      navigate('/practice', { replace: true, state: { retryMissesAuto: { ids: missIds } } });
    };

    const handlePracticeWeakest = () => {
      if (!weakestParsed) return;
      const q = new URLSearchParams({
        subject: weakestParsed.subject,
        domain: weakestParsed.domain,
        count: String(Math.min(10, Math.max(1, total || 1))),
      });
      resetToConfig(`/practice?${q.toString()}`);
    };

    const scoreStyle = scoreResultCellStyle(pct);

    return (
      <div className="space-y-5 pb-4 sm:space-y-8 sm:pb-6">
        <SectionHeader
          kicker="Practice / Results"
          title="Round complete"
          sub="Score, how each domain went, and quick ways to drill what still needs work."
          right="This round"
        />

        {sessionLevelUp && sessionLevelUp.to > sessionLevelUp.from ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="border border-accent bg-accent-soft px-6 py-5"
          >
            <div className="kicker text-accent">Level up</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-ink">
                Lv {sessionLevelUp.to}
              </span>
              <span className="text-[12.75px] text-mist">
                from Lv {sessionLevelUp.from}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink/80">
              {sessionLevelUp.to - sessionLevelUp.from > 1
                ? `+${sessionLevelUp.to - sessionLevelUp.from} levels in one set.`
                : 'XP from this set (and the session bonus) moved you up.'}
            </p>
          </motion.div>
        ) : null}

        <div className="grid grid-cols-1 divide-y divide-rule border border-rule bg-paper sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="relative px-6 py-6">
            <div className="absolute left-0 top-0 h-full w-px bg-jade" aria-hidden />
            <div className="kicker text-jade">Correct</div>
            <div className="mt-2 stat-num text-4xl font-semibold text-ink">{correct}</div>
          </div>
          <div className="relative px-6 py-6">
            <div className="absolute left-0 top-0 h-full w-px bg-red-600" aria-hidden />
            <div className="kicker text-red-700">Wrong</div>
            <div className="mt-2 stat-num text-4xl font-semibold text-ink">{wrong}</div>
          </div>
          <div
            className="relative px-6 py-6"
            style={{
              backgroundColor: scoreStyle.backgroundColor,
              color: scoreStyle.color,
            }}
          >
            <div className="absolute left-0 top-0 h-full w-1 bg-ink/20" aria-hidden />
            <div
              className="text-[10.63px] uppercase tracking-kicker"
              style={{ color: scoreStyle.kickerColor }}
            >
              Score
            </div>
            <div className="mt-2 stat-num text-4xl font-semibold tabular-nums">{pct}%</div>
          </div>
        </div>

        {strongest ? (
          <p className="text-sm text-mist">
            Strongest this round:{' '}
            <span className="font-medium text-ink">{strongest.domain}</span>{' '}
            <span className="text-[12.75px] text-mist">({strongest.domainPct}%)</span>
          </p>
        ) : null}

        {total > 0 ? (
          <Card className="overflow-hidden">
            <div className="border-b border-rule bg-canvas px-6 py-4">
              <div className="kicker">Next reps</div>
              <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">
                Suggested follow-ups
              </h2>
            </div>
            <div className="grid gap-8 p-6 sm:grid-cols-2 sm:gap-10">
              <div className="space-y-3">
                <div className="kicker text-red-700">Misses</div>
                {missIds.length > 0 ? (
                  <>
                    <p className="text-sm leading-relaxed text-mist">
                      Same questions you missed, plus matching items from the bank when needed — up
                      to five total. Short load, then you&apos;re back in the session.
                    </p>
                    <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={handleRetryMisses}>
                      Retry misses
                    </Button>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-mist">
                    No misses this round. Raise difficulty or add domains if you want more challenge.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div className="kicker">Weakest area</div>
                {weakestParsed ? (
                  <>
                    <p className="text-sm text-ink">
                      <span className="font-medium">{weakest.domain}</span>
                      <span className="text-mist"> — </span>
                      <span className="text-[12.75px] text-mist">
                        {weakest.domainPct}% ({weakest.correct}/{weakest.total})
                      </span>
                    </p>
                    <p className="text-sm leading-relaxed text-mist">
                      Opens configure with this domain selected so your next set targets that slice of
                      the bank.
                    </p>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={handlePracticeWeakest}
                    >
                      Practice this domain
                    </Button>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-mist">
                    {activeRows.length > 1
                      ? 'Accuracy matched across domains you hit — pick a topic in the breakdown or start a new mix.'
                      : activeRows.length === 1
                        ? 'Single-domain set — try another domain or widen filters for variety.'
                        : 'Keep practicing to see more domain-level patterns.'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="border-b border-rule bg-canvas px-6 py-4">
            <div className="kicker">By domain</div>
            <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">
              Breakdown
            </h2>
            <p className="mt-1 text-sm text-mist">Hardest domains first (by accuracy in this round).</p>
          </div>
          <ul className="divide-y divide-rule">
            {breakdown.map((b) => (
              <li
                key={b.domain}
                className={clsx(
                  'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-6 py-3',
                  weakest && b.domain === weakest.domain && 'border-l-[3px] border-l-accent bg-canvas'
                )}
              >
                <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{b.domain}</div>
                <div className="flex shrink-0 items-baseline gap-3">
                  <span className="text-[12.75px] text-mist">{b.domainPct}%</span>
                  <div className="stat-num text-sm text-ink">
                    {b.correct}
                    <span className="text-[11.69px] text-mist"> / {b.total}</span>
                  </div>
                </div>
              </li>
            ))}
            {breakdown.length === 0 ? (
              <li className="px-6 py-6 text-sm text-mist">No answered domains in this round.</li>
            ) : null}
          </ul>
        </Card>

        <div className="flex flex-col-reverse gap-3 border-t border-rule pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => resetToConfig('/practice')}>
            New session
          </Button>
        </div>
      </div>
    );
  }

  // Session mode
  if (!session || !q) return null;

  const total = session.questions.length;
  const answered = session.answers[q.id];
  const correctAnswer = frq ? String(q.correct_answer || '').trim() : String(q.correct_answer).toUpperCase();
  const progress = ((session.idx + 1) / total) * 100;
  const eliminatedForQ = session.eliminated?.[q.id] ?? {};
  const frqWrong = Boolean(frq && answered && !answered.correct);
  const choiceText = {
    A: q.choice_a,
    B: q.choice_b,
    C: q.choice_c,
    D: q.choice_d,
  };

  return (
    <div className="space-y-4 pb-4 sm:space-y-6 sm:pb-8">
      {/* Session bar — editorial header, hairline progress at the bottom */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="kicker text-accent">Live session</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="stat-num text-lg font-semibold text-ink">
                Q{session.idx + 1}<span className="text-[12.75px] text-mist"> / {total}</span>
              </span>
              <span className="text-mist/40" aria-hidden>·</span>
              <span className="text-[12.75px] uppercase tracking-kicker text-mist">
                {q.subject} · {q.domain}
              </span>
              {isAdmin ? (
                <>
                  <span className="text-mist/40" aria-hidden>·</span>
                  <span className="text-[11.69px] text-mist">id {q.id}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="w-full sm:w-[240px]">
            <div className="flex items-center justify-between text-[10.63px] uppercase tracking-kicker text-mist">
              <span>Progress</span>
              <span className="stat-num text-ink">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={progress} />
            </div>
          </div>
        </div>
      </Card>

      {/* Question card */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Card className="overflow-hidden">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
              <span className="rounded-sm border border-ink bg-ink px-1.5 py-0.5 text-[10.63px] font-semibold uppercase tracking-kicker text-white">
                {frq ? 'FRQ' : 'MCQ'}
              </span>
              {q.difficulty ? <DifficultyBadge difficulty={q.difficulty} /> : null}
              {q.skill ? (
                <span className="max-w-[16rem] truncate rounded-sm border border-rule bg-paper px-1.5 py-0.5 text-[10.63px] uppercase tracking-kicker text-mist sm:max-w-[24rem]">
                  {q.skill}
                </span>
              ) : null}
              <span className="ml-auto hidden text-[11.69px] uppercase tracking-kicker text-mist sm:inline">
                {frq ? 'Free response' : 'Multiple choice'}
              </span>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-rule">
              {/* Question stem */}
              <div className="border-b border-rule px-4 py-4 sm:px-6 sm:py-7 lg:px-8 lg:border-b-0 lg:pr-10">
                <div className="kicker mb-4">Question</div>
                <QuestionImage
                  questionId={q.id}
                  imageUrl={q.image_url}
                  sizing="adaptive"
                  containerClassName="mb-6 w-full"
                  imgClassName="border border-rule bg-paper"
                />
                <div className="mx-auto w-full max-w-prose lg:mx-0">
                  <div className="whitespace-pre-wrap text-[18.06px] leading-[1.7] text-ink">
                    <FormattedText text={q.question_text} />
                  </div>
                </div>
              </div>

              {/* Answers + feedback */}
              <div className="flex flex-col gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-7 lg:px-8 lg:pl-10">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="kicker">{frq ? 'Response' : 'Choices'}</div>
                  {studentId ? (
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="shrink-0 rounded-sm border border-red-200 bg-red-50 px-2 py-1 text-[11.69px] font-semibold uppercase tracking-kicker text-red-800 transition-colors hover:border-red-300 hover:bg-red-100"
                    >
                      Report question
                    </button>
                  ) : null}
                </div>

                {frq ? (
                  <div className="border border-rule bg-paper">
                    <div className="border-b border-rule px-5 py-3">
                      <div className="kicker">Your answer</div>
                    </div>
                    <div className="space-y-4 p-5">
                      <Field label="Response">
                        <Input
                          value={frqInput}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            if (frqInput && frqInput !== nextValue) {
                              setFrqDraftChanged(true);
                            }
                            setFrqInput(nextValue);
                          }}
                          placeholder="Type your answer…"
                          disabled={Boolean(answered)}
                          hasError={frqWrong}
                        />
                      </Field>
                      <Button
                        onClick={() => answer(frqInput)}
                        disabled={Boolean(answered) || !String(frqInput).trim()}
                        className="w-full sm:w-auto sm:self-end"
                        size="lg"
                      >
                        Check answer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ANSWER_CHOICES.map((c) => {
                      let state = 'neutral';
                      if (answered) {
                        if (c === correctAnswer) state = 'correct';
                        else if (c === String(answered.selected).toUpperCase()) state = 'wrong';
                      }
                      return (
                        <AnswerOption
                          key={c}
                          label={c}
                          text={choiceText[c]}
                          questionId={q.id}
                          state={state}
                          disabled={Boolean(answered)}
                          eliminated={Boolean(eliminatedForQ[c])}
                          selected={
                            Boolean(answered) &&
                            String(answered.selected).toUpperCase() === c
                          }
                          onClick={() => {
                            const upper = String(c).toUpperCase();
                            if (mcqDraftSelection && mcqDraftSelection !== upper) {
                              setMcqDraftChanged(true);
                            }
                            setMcqDraftSelection(upper);
                            answer(c);
                          }}
                          onToggleEliminate={() => toggleEliminate(c)}
                        />
                      );
                    })}
                  </div>
                )}

                <AnimatePresence mode="wait" initial={false}>
                  {answered ? (
                    <motion.div
                      key="feedback"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className={clsx(
                        'border-l-2 px-5 py-4',
                        answered.correct
                          ? 'border-jade bg-jade-soft'
                          : 'border-red-600 bg-red-50'
                      )}
                    >
                      <div
                        className={clsx(
                          'kicker',
                          answered.correct ? 'text-jade' : 'text-red-700'
                        )}
                      >
                        {answered.correct ? 'Correct' : 'Incorrect'}
                      </div>
                      {!answered.correct ? (
                        <div className="mt-1 text-[12.75px] text-red-900">
                          {frq ? (
                            <span>
                              Expected:{' '}
                              <FormattedText text={correctAnswer || '—'} />
                            </span>
                          ) : (
                            <span>
                              Correct answer: <FormattedText text={String(correctAnswer)} />
                            </span>
                          )}
                        </div>
                      ) : null}
                      <div
                        className={clsx(
                          'mt-3 whitespace-pre-wrap text-sm leading-6',
                          answered.correct ? 'text-ink' : 'text-red-950'
                        )}
                      >
                        <FormattedText
                          text={q.explanation?.trim() ? q.explanation : 'No explanation provided.'}
                        />
                      </div>
                    </motion.div>
                  ) : !frq ? (
                    <motion.div
                      key="await-answer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border border-dashed border-rule bg-canvas/40 px-4 py-2.5 text-center text-[11.69px] uppercase tracking-kicker text-mist"
                    >
                      Select an answer for instant feedback
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="mt-auto flex flex-col-reverse gap-3 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      if (!window.confirm('End this session?')) return;
                      setSession(null);
                      setFixedIdsPool(null);
                      setMode('config');
                      navigate('/practice', { replace: true });
                    }}
                  >
                    End session
                  </Button>
                  <Button
                    size="lg"
                    onClick={next}
                    disabled={!answered}
                    className="sm:min-w-[160px]"
                  >
                    {session.idx >= total - 1 ? 'Finish' : 'Next question →'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <QuestionReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={q.id}
        studentEmail={studentEmail}
      />
    </div>
  );
}
