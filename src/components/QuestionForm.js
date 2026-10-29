import React from 'react';
import {
  ANSWER_CHOICES,
  DIFFICULTIES,
  SUBJECTS,
  getDomainsForSubject,
  getSkillsForSubjectDomain,
} from '../constants/satTaxonomy';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Field } from './ui/Field';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import {
  isFrq,
  normalizeFrqCorrectAnswerText,
  tierFromDifficultyWord,
} from '../lib/questionFormat';

function emptyDraft() {
  return {
    subject: '',
    domain: '',
    skill: '',
    difficulty: '',
    difficulty_tier: '',
    question_text: '',
    image_url: '',
    choice_a: '',
    choice_b: '',
    choice_c: '',
    choice_d: '',
    correct_answer: '',
    explanation: '',
  };
}

export function QuestionForm({
  title,
  subtitle,
  initialValue,
  submitLabel = 'Save',
  onSubmit,
  submitting,
}) {
  const [draft, setDraft] = React.useState(() => ({
    ...emptyDraft(),
    ...(initialValue ?? {}),
  }));
  const [touched, setTouched] = React.useState({});
  const [format, setFormat] = React.useState(() =>
    isFrq(initialValue) ? 'FRQ' : 'MCQ'
  );
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState(() =>
    String(initialValue?.image_url ?? '')
  );

  React.useEffect(() => {
    const merged = { ...emptyDraft(), ...(initialValue ?? {}) };
    merged.difficulty_tier = tierFromDifficultyWord(merged.difficulty);
    setDraft(merged);
    setTouched({});
    setFormat(isFrq(initialValue) ? 'FRQ' : 'MCQ');
    setImagePreviewUrl(String(initialValue?.image_url ?? ''));
  }, [initialValue]);

  React.useEffect(() => {
    if (!draft.difficulty) {
      if (draft.difficulty_tier) setDraft((d) => ({ ...d, difficulty_tier: '' }));
      return;
    }
    const nextTier = tierFromDifficultyWord(draft.difficulty);
    if (nextTier && draft.difficulty_tier !== nextTier) {
      setDraft((d) => ({ ...d, difficulty_tier: nextTier }));
    }
  }, [draft.difficulty, draft.difficulty_tier]);

  const domains = React.useMemo(
    () => getDomainsForSubject(draft.subject),
    [draft.subject]
  );
  const skills = React.useMemo(
    () => getSkillsForSubjectDomain(draft.subject, draft.domain),
    [draft.subject, draft.domain]
  );

  function setField(name, value) {
    setDraft((d) => ({ ...d, [name]: value }));
  }

  function markTouched(name) {
    setTouched((t) => ({ ...t, [name]: true }));
  }

  const errors = {};
  if (!draft.subject) errors.subject = 'Required';
  if (!draft.domain) errors.domain = 'Required';
  if (!draft.skill) errors.skill = 'Required';
  if (!draft.difficulty) errors.difficulty = 'Required';
  if (!draft.question_text?.trim()) errors.question_text = 'Required';
  if (format === 'MCQ') {
    if (!draft.choice_a?.trim()) errors.choice_a = 'Required';
    if (!draft.choice_b?.trim()) errors.choice_b = 'Required';
    if (!draft.choice_c?.trim()) errors.choice_c = 'Required';
    if (!draft.choice_d?.trim()) errors.choice_d = 'Required';
    if (!draft.correct_answer) errors.correct_answer = 'Required';
  } else {
    if (!normalizeFrqCorrectAnswerText(draft.correct_answer)) {
      errors.correct_answer = 'Required';
    }
  }

  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  return (
    <Card>
      <CardHeader>
        <div className="kicker">Question</div>
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-1.5 text-sm text-mist">{subtitle}</p> : null}
      </CardHeader>

      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched({
              subject: true,
              domain: true,
              skill: true,
              difficulty: true,
              question_text: true,
              choice_a: format === 'MCQ',
              choice_b: format === 'MCQ',
              choice_c: format === 'MCQ',
              choice_d: format === 'MCQ',
              correct_answer: true,
            });
            if (!canSubmit) return;
            const tier = tierFromDifficultyWord(draft.difficulty);
            if (format === 'FRQ') {
              onSubmit?.({
                ...draft,
                difficulty_tier: tier,
                choice_a: '',
                choice_b: '',
                choice_c: '',
                choice_d: '',
                correct_answer: normalizeFrqCorrectAnswerText(draft.correct_answer),
              });
              return;
            }
            onSubmit?.({ ...draft, difficulty_tier: tier });
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Question type">
              <Select
                value={format}
                onChange={(e) => {
                  const next = e.target.value;
                  setFormat(next);
                  setTouched((t) => ({ ...t, choice_a: false, choice_b: false, choice_c: false, choice_d: false }));
                  if (next === 'FRQ') {
                    setDraft((d) => ({
                      ...d,
                      choice_a: '',
                      choice_b: '',
                      choice_c: '',
                      choice_d: '',
                      correct_answer: normalizeFrqCorrectAnswerText(d.correct_answer),
                    }));
                  } else {
                    setDraft((d) => ({
                      ...d,
                      correct_answer: ['A', 'B', 'C', 'D'].includes(String(d.correct_answer).toUpperCase())
                        ? String(d.correct_answer).toUpperCase()
                        : '',
                    }));
                  }
                }}
              >
                <option value="MCQ">Multiple choice</option>
                <option value="FRQ">Free response (FRQ)</option>
              </Select>
            </Field>

            <Field label="Subject" error={touched.subject ? errors.subject : null}>
              <Select
                value={draft.subject}
                onChange={(e) => {
                  const subject = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    subject,
                    domain: '',
                    skill: '',
                  }));
                }}
                onBlur={() => markTouched('subject')}
              >
                <option value="">Select…</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Domain" error={touched.domain ? errors.domain : null}>
              <Select
                value={draft.domain}
                onChange={(e) => {
                  const domain = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    domain,
                    skill: '',
                  }));
                }}
                onBlur={() => markTouched('domain')}
                disabled={!draft.subject}
              >
                <option value="">{draft.subject ? 'Select…' : 'Select subject first'}</option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Skill" error={touched.skill ? errors.skill : null}>
              <Select
                value={draft.skill}
                onChange={(e) => setField('skill', e.target.value)}
                onBlur={() => markTouched('skill')}
                disabled={!draft.domain}
              >
                <option value="">{draft.domain ? 'Select…' : 'Select domain first'}</option>
                {skills.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Difficulty" error={touched.difficulty ? errors.difficulty : null}>
              <Select
                value={draft.difficulty}
                onChange={(e) => setField('difficulty', e.target.value)}
                onBlur={() => markTouched('difficulty')}
              >
                <option value="">Select…</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Question text"
            hint="Write the full question body."
            error={touched.question_text ? errors.question_text : null}
          >
            <Textarea
              value={draft.question_text}
              onChange={(e) => setField('question_text', e.target.value)}
              onBlur={() => markTouched('question_text')}
              placeholder="Enter the question..."
              className="min-h-40"
            />
          </Field>

          <Field
            label="Question image (optional)"
            hint="Paste a public image URL (e.g. Imgur, Cloudinary, etc.)."
          >
            <div className="space-y-3">
              <Input
                value={draft.image_url}
                onChange={(e) => {
                  const next = e.target.value;
                  setField('image_url', next);
                  setImagePreviewUrl(String(next || ''));
                }}
                placeholder="https://..."
              />
              {imagePreviewUrl ? (
                <div className="flex justify-center border border-rule bg-paper">
                  <img
                    src={imagePreviewUrl}
                    alt="Question"
                    className="max-h-40 w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ) : null}
              {draft.image_url ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setImagePreviewUrl('');
                      setField('image_url', '');
                    }}
                  >
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>
          </Field>

          {format === 'MCQ' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Choice A" error={touched.choice_a ? errors.choice_a : null}>
                <Input
                  value={draft.choice_a}
                  onChange={(e) => setField('choice_a', e.target.value)}
                  onBlur={() => markTouched('choice_a')}
                  placeholder="Answer choice A"
                />
              </Field>
              <Field label="Choice B" error={touched.choice_b ? errors.choice_b : null}>
                <Input
                  value={draft.choice_b}
                  onChange={(e) => setField('choice_b', e.target.value)}
                  onBlur={() => markTouched('choice_b')}
                  placeholder="Answer choice B"
                />
              </Field>
              <Field label="Choice C" error={touched.choice_c ? errors.choice_c : null}>
                <Input
                  value={draft.choice_c}
                  onChange={(e) => setField('choice_c', e.target.value)}
                  onBlur={() => markTouched('choice_c')}
                  placeholder="Answer choice C"
                />
              </Field>
              <Field label="Choice D" error={touched.choice_d ? errors.choice_d : null}>
                <Input
                  value={draft.choice_d}
                  onChange={(e) => setField('choice_d', e.target.value)}
                  onBlur={() => markTouched('choice_d')}
                  placeholder="Answer choice D"
                />
              </Field>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={format === 'FRQ' ? 'Expected answer (FRQ)' : 'Correct answer'}
              error={touched.correct_answer ? errors.correct_answer : null}
            >
              {format === 'MCQ' ? (
                <Select
                  value={draft.correct_answer}
                  onChange={(e) => setField('correct_answer', e.target.value)}
                  onBlur={() => markTouched('correct_answer')}
                >
                  <option value="">Select…</option>
                  {ANSWER_CHOICES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={draft.correct_answer}
                  onChange={(e) => setField('correct_answer', e.target.value)}
                  onBlur={() => markTouched('correct_answer')}
                  placeholder='Example: "42" (use "||" for multiple acceptable answers)'
                />
              )}
            </Field>

            <Field label="Explanation (optional)" hint="Shown after answering.">
              <Textarea
                value={draft.explanation}
                onChange={(e) => setField('explanation', e.target.value)}
                placeholder="Optional explanation..."
                className="min-h-24"
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

