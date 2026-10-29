import clsx from 'clsx';

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <div className="kicker">{label}</div>
          {hint ? <div className="text-[12.75px] text-mist">{hint}</div> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <div className="mt-1.5 text-[12.75px] font-semibold tracking-[0.06em] text-accent">
          {error}
        </div>
      ) : null}
    </label>
  );
}

export function inputClassName({ hasError } = {}) {
  return clsx(
    'block w-full rounded border border-rule bg-paper px-3 py-2 text-sm text-ink',
    'placeholder:text-mist/70 transition-colors',
    'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15',
    hasError && 'border-accent focus:border-accent focus:ring-accent/20'
  );
}
