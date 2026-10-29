import React from 'react';
import { Navigate } from 'react-router-dom';
import { canViewQuestionReports, fetchQuestionReports } from '../lib/firebase';

export function QuestionReportsDevPage({ viewerEmail }) {
  const allowed = canViewQuestionReports(viewerEmail);
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const list = await fetchQuestionReports(300);
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load reports.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="kicker">Instructor</div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Question reports</h1>
      <p className="max-w-2xl text-sm text-mist">
        Student submissions from “Report this question” during practice and full tests.
      </p>

      {loading ? <p className="text-sm text-mist">Loading…</p> : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      {!loading && !err ? (
        <div className="overflow-x-auto rounded border border-rule bg-paper">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-rule bg-canvas/80 text-[11.69px] uppercase tracking-kicker text-mist">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Q ID</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-mist">
                    No reports yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-rule last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-mist">
                      {r.created_at ? String(r.created_at).slice(0, 19).replace('T', ' ') : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold text-ink">{r.question_id}</td>
                    <td className="px-3 py-2 text-ink">
                      {[r.missing_image && 'image', r.looks_weird && 'format'].filter(Boolean).join(', ') ||
                        '—'}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-mist">{r.student_email || '—'}</td>
                    <td className="max-w-md px-3 py-2 whitespace-pre-wrap text-ink">{r.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
