import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { QuestionForm } from '../components/QuestionForm';
import { useIsAdmin } from '../context/AdminContext';
import { useQuestions } from '../context/QuestionsContext';

export function AddQuestionPage() {
  const isAdmin = useIsAdmin();
  const { addQuestion } = useQuestions();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="mb-6">
        <div className="kicker">Instructor / Bank</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Add question
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Saves a new document to the Firestore <span className="text-ink">questions</span>{' '}
          collection.
        </p>
      </div>

      {error ? (
        <div className="border border-accent bg-accent-soft p-4">
          <div className="kicker text-accent">Couldn’t save</div>
          <div className="mt-2 text-sm text-ink">{error.message}</div>
        </div>
      ) : null}

      <QuestionForm
        title="Question details"
        subtitle="Write the question, taxonomy, and (for MCQ) choices."
        submitLabel="Add question"
        submitting={submitting}
        onSubmit={async (draft) => {
          setSubmitting(true);
          setError(null);
          try {
            const created = await addQuestion(draft);
            navigate(`/browse?highlight=${created.id}`);
          } catch (e) {
            setError(e);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
