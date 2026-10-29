import React from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { resendVerificationEmail, reloadCurrentUser } from '../lib/firebase';

export function VerifyEmailPage({ email, isAdmin, isVerified, onVerified }) {
  const [sending, setSending] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [status, setStatus] = React.useState('');

  if (isAdmin) return <Navigate to="/" replace />;
  if (isVerified) return <Navigate to="/" replace />;

  async function handleResend() {
    setSending(true);
    setStatus('');
    try {
      await resendVerificationEmail();
      setStatus('Verification email sent. Check your inbox (and spam).');
    } catch (e) {
      setStatus(String(e?.message ?? e));
    } finally {
      setSending(false);
    }
  }

  async function handleIVerified() {
    setChecking(true);
    setStatus('');
    try {
      const user = await reloadCurrentUser();
      if (user?.emailVerified) {
        onVerified?.(user);
        setStatus('Verified. Redirecting…');
      } else {
        setStatus('Not verified yet. Open the verification email and click the link, then try again.');
      }
    } catch (e) {
      setStatus(String(e?.message ?? e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="kicker">Account / Verify</div>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink">
        Verify your email
      </h1>
      <p className="mt-3 text-sm text-mist">
        We sent a verification link to{' '}
        <span className="font-semibold text-ink">{email}</span>. Open the message and use
        the link (or copy the URL into your browser if your mail app doesn’t make it clickable).
      </p>

      <Card className="mt-6 p-6">
        {status ? (
          <div className="mb-4 border-l-2 border-accent bg-accent-soft px-4 py-2 text-sm font-medium text-ink">
            {status}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full" disabled={sending} onClick={handleResend}>
            {sending ? 'Sending…' : 'Resend email'}
          </Button>
          <Button className="w-full" disabled={checking} onClick={handleIVerified}>
            {checking ? 'Checking…' : 'I verified my email'}
          </Button>
        </div>

        <div className="mt-4 space-y-1.5 text-[11.69px] text-mist">
          <p>Tip · if the link isn’t tappable, copy the full URL line instead.</p>
          <p>
            Customize the message in Firebase Console → Authentication → Templates → Email
            verification.
          </p>
        </div>
      </Card>
    </div>
  );
}
