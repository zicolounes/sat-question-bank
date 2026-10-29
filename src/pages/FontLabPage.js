import React from 'react';
import { FONT_LAB_PRESETS } from '../fontLab/fontPresets';
import {
  applyFontLabPrefsToDocument,
  clearFontLabPrefs,
  defaultFontStacks,
  readFontLabPrefs,
  writeFontLabPrefs,
} from '../fontLab/fontLabPrefs';

export function FontLabPage() {
  const defaults = React.useMemo(() => defaultFontStacks(), []);
  const [sans, setSans] = React.useState(defaults.sans);
  const [display, setDisplay] = React.useState(defaults.display);
  const [mono, setMono] = React.useState(defaults.mono);
  const [googleHref, setGoogleHref] = React.useState('');
  const [status, setStatus] = React.useState('');

  React.useEffect(() => {
    const d = defaultFontStacks();
    const saved = readFontLabPrefs();
    if (saved) {
      setSans(saved.sans ?? d.sans);
      setDisplay(saved.display ?? d.display);
      setMono(saved.mono ?? d.mono);
      setGoogleHref(saved.googleHref ?? '');
    }
  }, []);

  function handleApply() {
    const prefs = { sans, display, mono, googleHref: googleHref.trim() || undefined };
    writeFontLabPrefs(prefs);
    applyFontLabPrefsToDocument(prefs);
    setStatus('Saved and applied. Reload any other tabs to pick this up.');
  }

  function handleReset() {
    clearFontLabPrefs();
    applyFontLabPrefsToDocument(null);
    setSans(defaults.sans);
    setDisplay(defaults.display);
    setMono(defaults.mono);
    setGoogleHref('');
    setStatus('Cleared. Reverted to defaults from index.css / tailwind.');
  }

  function loadPreset(p) {
    setSans(p.cssFamily);
    setDisplay(p.displayFamily || p.cssFamily);
    setGoogleHref(p.googleHref || '');
    setStatus(`Loaded “${p.label}”. Click Apply to use it.`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="kicker mb-1">Development</div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Font lab</h1>
      <p className="mt-2 text-sm text-mist">
        Try UI fonts without editing Tailwind on each pass. Add presets in{' '}
        <code className="rounded border border-rule bg-paper px-1 py-0.5 text-[11.69px] text-ink">
          src/fontLab/fontPresets.js
        </code>
        , drop local files under{' '}
        <code className="rounded border border-rule bg-paper px-1 py-0.5 text-[11.69px] text-ink">
          src/fonts/
        </code>{' '}
        and wire <code className="text-[11.69px]">@font-face</code> in{' '}
        <code className="text-[11.69px]">index.css</code>. Then refresh, pick a preset,
        Apply, and click through the app.
      </p>

      <section className="mt-8 rounded border border-rule bg-paper p-4 shadow-soft">
        <h2 className="font-display text-lg font-bold text-ink">Presets</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {FONT_LAB_PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full rounded border border-rule bg-canvas px-3 py-2 text-left text-sm font-medium text-ink transition hover:border-accent hover:bg-paper"
                onClick={() => loadPreset(p)}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded border border-rule bg-paper p-4 shadow-soft">
        <h2 className="font-display text-lg font-bold text-ink">Stacks (CSS font-family values)</h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-kicker text-mist">
          Sans / body (<code className="normal-case">--font-sans</code>)
        </label>
        <textarea
          className="mt-1 w-full rounded border border-rule bg-canvas px-3 py-2 text-[12.75px] text-ink"
          rows={2}
          value={sans}
          onChange={(e) => setSans(e.target.value)}
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-kicker text-mist">
          Display / headings (<code className="normal-case">--font-display</code>)
        </label>
        <textarea
          className="mt-1 w-full rounded border border-rule bg-canvas px-3 py-2 text-[12.75px] text-ink"
          rows={2}
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-kicker text-mist">
          Code stack (<code className="normal-case">--font-mono</code>, defaults to body)
        </label>
        <textarea
          className="mt-1 w-full rounded border border-rule bg-canvas px-3 py-2 text-[12.75px] text-ink"
          rows={2}
          value={mono}
          onChange={(e) => setMono(e.target.value)}
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-kicker text-mist">
          Optional Google Fonts CSS URL
        </label>
        <input
          type="url"
          className="mt-1 w-full rounded border border-rule bg-canvas px-3 py-2 text-[12.75px] text-ink"
          placeholder="https://fonts.googleapis.com/css2?family=..."
          value={googleHref}
          onChange={(e) => setGoogleHref(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            onClick={handleApply}
          >
            Apply &amp; save
          </button>
          <button
            type="button"
            className="rounded border border-rule px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
            onClick={handleReset}
          >
            Reset to defaults
          </button>
        </div>
        {status ? <p className="mt-3 text-sm text-mist">{status}</p> : null}
      </section>

      <section className="mt-8 rounded border border-rule bg-paper p-4 shadow-soft">
        <h2 className="font-display text-lg font-bold text-ink">Live preview</h2>
        <p className="font-display mt-3 text-2xl font-bold tracking-tight text-ink">
          The quick brown fox jumps over the lazy dog.
        </p>
        <p className="mt-2 text-base text-ink">
          Body text: SAT Math — Problem-Solving &amp; Data Analysis. Sample numbers: 0123456789
          <span className="tabular-nums"> 11:09 3.14159</span>
        </p>
        <p className="mt-2 text-[12.75px] text-mist">
          Small meta: Q12 · id 308 · MEDIUM
        </p>
      </section>
    </div>
  );
}
