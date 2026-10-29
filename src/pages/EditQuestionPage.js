import React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { QuestionForm } from '../components/QuestionForm';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useIsAdmin } from '../context/AdminContext';
import { useQuestions } from '../context/QuestionsContext';

export function EditQuestionPage() {
  const isAdmin = useIsAdmin();
  const { id } = useParams();
  const numericId = Number(id);
  const navigate = useNavigate();
  const { questions, loading, error, updateQuestion } = useQuestions();
  const [submitting, setSubmitting] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);

  const existing = React.useMemo(
    () => questions.find((q) => Number(q.id) === numericId),
    [questions, numericId]
  );

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-sm text-mist">
          <Spinner />
          <span className="text-[11.69px] uppercase tracking-kicker">Loading</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="kicker text-accent">Firestore error</div>
        <div className="mt-2 text-sm text-ink">{error.message}</div>
      </Card>
    );
  }

  if (!existing) {
    return (
      <Card className="p-6">
        <div className="kicker">Not found</div>
        <div className="mt-2 text-sm font-semibold text-ink">Question not found.</div>
        <div className="mt-3">
          <Link to="/browse">
            <Button variant="secondary">Back to bank</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="mb-6">
        <div className="kicker">Instructor / Bank</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Edit question <span className="stat-num text-mist">#{existing.id}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">
          Updates the existing document in Firestore.
        </p>
      </div>

      {saveError ? (
        <div className="border border-accent bg-accent-soft p-4">
          <div className="kicker text-accent">Couldn’t save</div>
          <div className="mt-2 text-sm text-ink">{saveError.message}</div>
        </div>
      ) : null}

      <QuestionForm
        title="Question details"
        subtitle="Edit the question fields, then save."
        initialValue={existing}
        submitLabel="Save changes"
        submitting={submitting}
        onSubmit={async (draft) => {
          setSubmitting(true);
          setSaveError(null);
          try {
            await updateQuestion(existing, draft);
            navigate(`/browse?highlight=${existing.id}`);
          } catch (e) {
            setSaveError(e);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
