import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { QuestionCard } from '../components/QuestionCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { MultiSelectPills } from '../components/ui/MultiSelectPills';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import {
  DIFFICULTIES,
  SAT_TAXONOMY,
  getSkillsForSubjectDomain,
} from '../constants/satTaxonomy';
import { useIsAdmin } from '../context/AdminContext';
import { useQuestions } from '../context/QuestionsContext';
import { filterQuestions, uniq } from '../lib/filtering';

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

export function BrowsePage({ canEdit }) {
  const isAdmin = useIsAdmin();
  const { questions, loading, error, deleteQuestion } = useQuestions();

  const [params] = useSearchParams();
  const highlightId = params.get('highlight');

  const [subject, setSubject] = React.useState('Both');
  const [domains, setDomains] = React.useState([]);
  const [skills, setSkills] = React.useState([]);
  const [difficulties, setDifficulties] = React.useState([]);
  const [keyword, setKeyword] = React.useState('');

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

  const filtered = React.useMemo(
    () =>
      filterQuestions(questions, {
        subject,
        domains,
        skills,
        difficulties,
        keyword,
      }),
    [questions, subject, domains, skills, difficulties, keyword]
  );

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="mb-6">
        <div className="kicker">Instructor / Bank</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Question bank
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Filter, view, edit, or delete questions from Firestore.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Subject">
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="Both">Both</option>
              <option value="Math">Math only</option>
              <option value="English">English only</option>
            </Select>
          </Field>

          <Field label="Keyword search">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search question text…"
            />
          </Field>

          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setDomains([]);
                setSkills([]);
                setDifficulties([]);
                setKeyword('');
                setSubject('Both');
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MultiSelectPills
            label="Domain"
            options={domainOptions}
            selected={domains}
            onChange={setDomains}
            emptyLabel="Pick a subject to see domains."
          />
          <MultiSelectPills
            label="Skill"
            options={skillOptions}
            selected={skills}
            onChange={setSkills}
            disabled={!domains.length}
            emptyLabel="Select one or more domains first."
          />
        </div>

        <div className="mt-6 border-t border-rule pt-6">
          <MultiSelectPills
            label="Difficulty"
            variant="difficulty"
            options={DIFFICULTIES}
            selected={difficulties}
            onChange={setDifficulties}
          />
        </div>
      </Card>

      {loading ? (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-sm text-mist">
            <Spinner />
            <span className="text-[11.69px] uppercase tracking-kicker">Loading questions</span>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-6">
          <div className="kicker text-accent">Firestore error</div>
          <div className="mt-2 text-sm text-ink">{error.message}</div>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between mb-3">
            <div className="kicker">Results</div>
            <div className="text-[12.75px] text-mist">
              <span className="stat-num text-ink">{filtered.length}</span>
              <span className="text-mist/50"> / </span>
              <span className="stat-num">{questions.length}</span>
            </div>
          </div>

          {filtered.length ? (
            filtered.map((q) => (
              <div
                key={q.id}
                className={clsx(q.id === Number(highlightId) && 'ring-2 ring-accent')}
              >
                <QuestionCard
                  question={q}
                  onDelete={deleteQuestion}
                  defaultExpanded={q.id === Number(highlightId)}
                  canEdit={Boolean(canEdit && isAdmin)}
                />
              </div>
            ))
          ) : (
            <Card className="p-6">
              <div className="kicker">No matches</div>
              <div className="mt-2 text-sm font-semibold text-ink">
                No questions match these filters.
              </div>
              <div className="mt-1 text-sm text-mist">
                Try clearing a few filters or removing the keyword.
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
