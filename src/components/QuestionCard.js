import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { DifficultyBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useIsAdmin } from '../context/AdminContext';
import { isFrq } from '../lib/questionFormat';
import { FormattedText } from './FormattedText';
import { QuestionImage } from './QuestionImage';
import { ChoiceOptionImage } from './ChoiceOptionImage';

function ChoiceRow({ label, letter, questionId, text, highlight }) {
  const trimmed = String(text ?? '').trim();
  const qid = Number(questionId);
  const showImg = Number.isFinite(qid) && qid > 0 && letter;

  return (
    <div
      className={clsx(
        'border px-3 py-2.5',
        highlight ? 'border-emerald-600 bg-emerald-50' : 'border-rule bg-paper'
      )}
    >
      <div className="kicker">{label}</div>
      {showImg ? (
        <ChoiceOptionImage questionId={qid} optionLetter={letter} className="mt-2" />
      ) : null}
      <div className="mt-1.5 text-sm text-ink">
        {trimmed ? (
          <FormattedText text={text} />
        ) : showImg ? null : (
          <FormattedText text="—" />
        )}
      </div>
    </div>
  );
}

export function QuestionCard({ question, onDelete, defaultExpanded, canEdit }) {
  const [expanded, setExpanded] = React.useState(Boolean(defaultExpanded));
  const frq = isFrq(question);
  const isAdmin = useIsAdmin();

  const correct = String(question.correct_answer || '').toUpperCase();
  const choices = {
    A: question.choice_a,
    B: question.choice_b,
    C: question.choice_c,
    D: question.choice_d,
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="kicker">{question.subject}</div>
            <span className="text-mist/50" aria-hidden>·</span>
            <div className="truncate text-sm font-semibold text-ink">{question.domain}</div>
            <span className="text-mist/50" aria-hidden>·</span>
            <div className="truncate text-sm text-mist">{question.skill}</div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <DifficultyBadge difficulty={question.difficulty} />
            {frq ? (
              <span className="rounded-sm border border-rule bg-paper px-1.5 py-0.5 text-[10.63px] font-semibold uppercase tracking-kicker text-mist">
                FRQ
              </span>
            ) : (
              <span className="rounded-sm border border-rule bg-paper px-1.5 py-0.5 text-[10.63px] font-semibold uppercase tracking-kicker text-mist">
                MCQ
              </span>
            )}
            {isAdmin ? (
              <span className="rounded-sm border border-ink bg-ink px-1.5 py-0.5 text-[10.63px] font-semibold uppercase tracking-kicker text-white">
                ID {question.id}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Hide' : 'View'}
          </Button>
          {canEdit && isAdmin ? (
            <>
              <Link to={`/edit/${question.id}`}>
                <Button variant="secondary" size="sm">
                  Edit
                </Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (!window.confirm('Delete this question?')) return;
                  onDelete?.(question);
                }}
              >
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-rule p-5">
          <QuestionImage
            questionId={question.id}
            imageUrl={question.image_url}
            containerClassName="flex justify-center"
            imgClassName="max-h-48 w-auto max-w-full border border-rule bg-paper object-contain"
          />
          <div className="whitespace-pre-wrap text-[15.94px] leading-relaxed text-ink">
            <FormattedText text={question.question_text} />
          </div>

          {frq ? (
            <div className="border border-rule bg-paper">
              <div className="border-b border-rule px-3 py-2">
                <div className="kicker">Expected answer (FRQ)</div>
              </div>
              <div className="whitespace-pre-wrap p-3 text-sm text-ink">
                <FormattedText
                  text={question.correct_answer?.trim() ? question.correct_answer : '—'}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {['A', 'B', 'C', 'D'].map((k) => (
                <ChoiceRow
                  key={k}
                  label={`Choice ${k}`}
                  letter={k}
                  questionId={question.id}
                  text={choices[k]}
                  highlight={k === correct}
                />
              ))}
            </div>
          )}

          <div className="border border-rule bg-canvas/40">
            <div className="border-b border-rule px-3 py-2">
              <div className="kicker">Explanation</div>
            </div>
            <div className="whitespace-pre-wrap p-3 text-sm text-ink">
              <FormattedText
                text={question.explanation?.trim() ? question.explanation : '—'}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="max-h-16 overflow-hidden whitespace-pre-wrap text-sm text-mist">
            <FormattedText text={question.question_text} />
          </div>
        </div>
      )}
    </Card>
  );
}
