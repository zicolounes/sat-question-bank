import React from 'react';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { submitQuestionReport } from '../lib/firebase';

export function QuestionReportModal({
  open,
  onClose,
  questionId,
  studentEmail,
}) {
  const [reason, setReason] = React.useState('');
  const [missingImage, setMissingImage] = React.useState(false);
  const [looksWeird, setLooksWeird] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setMissingImage(false);
    setLooksWeird(false);
    setSending(false);
    setError(null);
    setDone(false);
  }, [open, questionId]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const r = String(reason ?? '').trim();
    if (r.length < 4) {
      setError('Please add a short note (at least 4 characters).');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitQuestionReport({
        studentEmail,
        questionId,
        reason: r,
        missingImage,
        looksWeird,
      });
      setDone(true);
    } catch (err) {
      const msg = String(err?.message ?? '');
      const permissionDenied =
        err?.code === 'permission-denied' || /insufficient permissions/i.test(msg);
      setError(
        permissionDenied
          ? 'Could not save your report. Sign out and back in, then try again. If it still fails, tell your instructor.'
          : msg || 'Could not send report.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-title"
    >
      <div className="w-full max-w-md rounded border border-rule bg-paper p-5 shadow-lift">
        <h2 id="qr-title" className="font-display text-lg font-bold text-ink">
          Report this question
        </h2>
        <p className="mt-2 text-sm text-mist">
          Question ID <span className="font-semibold text-ink">{questionId}</span>. Your instructor can
          review in the dev console.
        </p>

        {done ? (
          <p className="mt-4 text-sm text-ink">Thanks — your report was saved.</p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={missingImage}
                onChange={(e) => setMissingImage(e.target.checked)}
                className="rounded border-rule"
              />
              Missing or broken image / figure
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={looksWeird}
                onChange={(e) => setLooksWeird(e.target.checked)}
                className="rounded border-rule"
              />
              Formatting or wording looks wrong
            </label>
            <p className="text-[11.69px] text-mist">Optional — check any that apply. Your note below is enough to send a report.</p>
            <Field label="What should we fix?" hint="Be specific (e.g. equations run together, wrong graph label).">
              <textarea
                className="min-h-[96px] w-full rounded border border-rule bg-canvas px-3 py-2 text-sm text-ink"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                placeholder="Describe the issue…"
              />
            </Field>
            {error ? <div className="text-sm text-red-700">{error}</div> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Submit report'}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
