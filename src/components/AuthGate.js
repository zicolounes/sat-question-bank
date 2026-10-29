import React from 'react';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Input } from './ui/Input';
import { ADMIN_EMAIL, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../lib/firebase';

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * Editorial split — left rail for the brand pitch, right rail for the auth form.
 * No glass, no gradients; flat blue panel + paper form panel.
 */
export function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = React.useState('login');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  async function handleSignUp(e) {
    e.preventDefault();
    setError('');
    const first = firstName.trim();
    const last = lastName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (!first || !last || !normalizedEmail || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (normalizedEmail === ADMIN_EMAIL) {
        setError('This email is reserved for the instructor account.');
        return;
      }
      const user = await signUpWithEmail({
        email: normalizedEmail,
        password,
        firstName: first,
      });
      onAuthenticated(user);
    } catch (err) {
      const code = err?.code ?? '';
      if (code.includes('email-already-in-use')) {
        setError(
          'That email already has an account. Use Log in. If you never set a password, the user may be Google-only — set a password in Firebase Authentication.'
        );
      } else if (code.includes('weak-password')) {
        setError('Password must be at least 8 characters.');
      } else {
        setError(err?.message || 'Could not create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      if (normalizedEmail === ADMIN_EMAIL) {
        setError('Admin account must sign in with Google.');
        return;
      }
      const user = await signInWithEmail({
        email: normalizedEmail,
        password,
      });
      onAuthenticated(user);
    } catch (err) {
      const code = err?.code ?? '';
      if (code.includes('user-not-found')) {
        setError('No account with this email. Try signing up, or check for a typo.');
      } else if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        setError('Incorrect email or password.');
      } else if (code.includes('invalid-email')) {
        setError('That email address does not look valid.');
      } else if (code.includes('user-disabled')) {
        setError('This account has been disabled. Contact your instructor.');
      } else if (code.includes('too-many-requests')) {
        setError('Too many attempts. Wait a few minutes and try again.');
      } else {
        setError(err?.message || 'Could not log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid h-[100dvh] max-h-[100dvh] overflow-hidden grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      {/* Left: editorial brand panel */}
      <aside className="relative hidden flex-col justify-between bg-ink p-8 text-white lg:flex lg:p-9">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-sm font-bold preserve-brand-colors"
              style={{
                backgroundColor: '#0337E1',
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff',
              }}
            >
              LL
            </div>
            <div>
              <div className="font-display text-base font-bold leading-none">SAT Bank</div>
              <div className="mt-1 text-[10.63px] font-semibold tracking-[0.08em] uppercase text-white/60">
                Practice · v0.1
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-balance lg:text-[2rem]">
            The only SAT Prep you need.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            One SAT bank. Clean reps. Cleaner progress.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div>
            <div className="text-[10.63px] font-semibold tracking-[0.08em] uppercase text-white/50">
              Practice questions
            </div>
            <div className="mt-1 stat-num text-xl font-semibold">463+</div>
          </div>
          <div>
            <div className="text-[10.63px] font-semibold tracking-[0.08em] uppercase text-white/50">
              SAT skills
            </div>
            <div className="mt-1 stat-num text-xl font-semibold">29</div>
          </div>
          <div>
            <div className="text-[10.63px] font-semibold tracking-[0.08em] uppercase text-white/50">
              SAT domains
            </div>
            <div className="mt-1 stat-num text-xl font-semibold">8</div>
          </div>
        </div>
      </aside>

      {/* Right: form panel */}
      <main className="flex min-h-0 flex-col justify-center overflow-y-auto px-5 py-5 sm:px-10 sm:py-6 lg:px-12 lg:py-5">
        <div className="mx-auto w-full max-w-[22rem] sm:max-w-md">
          <div className="kicker">Account / {mode === 'signup' ? 'Sign up' : 'Log in'}</div>
          <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[1.65rem]">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-[13.81px] leading-snug text-mist sm:text-sm">
            {mode === 'signup'
              ? 'Sign up to save your SAT practice history.'
              : 'Log in to continue your SAT practice.'}
          </p>

          <form
            className="mt-4 space-y-2.5 sm:mt-4"
            onSubmit={mode === 'signup' ? handleSignUp : handleLogin}
          >
            {mode === 'login' ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    setError('');
                    setLoading(true);
                    try {
                      const user = await signInWithGoogle();
                      onAuthenticated(user);
                    } catch (e) {
                      setError(String(e?.message ?? e) || 'Could not sign in with Google.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Continue with Google
                </Button>
                <div className="flex items-center gap-2 py-0">
                  <div className="h-px flex-1 bg-rule" />
                  <span className="text-[10.63px] font-semibold tracking-[0.08em] uppercase text-mist">
                    or with email
                  </span>
                  <div className="h-px flex-1 bg-rule" />
                </div>
              </>
            ) : null}

            {mode === 'signup' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Zach"
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Lee"
                  />
                </Field>
              </div>
            ) : null}

            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </Field>

            {error ? (
              <div className="border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading} size="md">
              {loading
                ? mode === 'signup'
                  ? 'Creating account…'
                  : 'Logging in…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Log in'}
            </Button>
          </form>

          <div className="mt-3 border-t border-rule pt-2.5 text-center text-[11.69px] text-mist sm:text-[12.75px]">
            {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
            <button
              type="button"
              className="font-semibold uppercase tracking-kicker text-ink underline-offset-4 hover:underline"
              onClick={() => {
                setError('');
                setMode((m) => (m === 'signup' ? 'login' : 'signup'));
              }}
            >
              {mode === 'signup' ? 'Log in' : 'Sign up'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
