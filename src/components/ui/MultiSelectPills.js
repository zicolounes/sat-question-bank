import clsx from 'clsx';
import { difficultyMultiSelectClasses } from './Badge';

function Pill({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={clsx(
        'rounded-md border px-3 py-1.5 text-[13.81px] font-medium leading-snug tracking-tight transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MultiSelectPills({
  label,
  options,
  selected,
  onChange,
  disabled,
  emptyLabel = 'No options',
  /** When `"difficulty"`, Easy/Medium/Hard pills use green / amber / red tones. */
  variant,
}) {
  const selectedSet = new Set(selected ?? []);
  return (
    <div className={clsx(disabled && 'opacity-60')}>
      {label ? <div className="kicker mb-2">{label}</div> : null}
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {options?.length ? (
          options.map((opt) => {
            const active = selectedSet.has(opt);
            const toneClass =
              variant === 'difficulty'
                ? difficultyMultiSelectClasses(opt, active)
                : active
                  ? 'border-ink bg-ink text-white'
                  : 'border-rule bg-paper text-ink hover:bg-canvas/60 hover:border-ink';
            return (
              <Pill
                key={opt}
                className={toneClass}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  const next = new Set(selectedSet);
                  if (active) next.delete(opt);
                  else next.add(opt);
                  onChange?.(Array.from(next));
                }}
              >
                {opt}
              </Pill>
            );
          })
        ) : (
          <div className="text-sm text-mist">{emptyLabel}</div>
        )}
      </div>
    </div>
  );
}
