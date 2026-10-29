import clsx from 'clsx';
import { DashProgressBar } from './DashProgressBar';

/**
 * Editorial stat tile — paper, hairline, mono numeral.
 * Tone shows up only as a 1-row colored kicker rule on top.
 */
export function BentoStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'accent',
  loading,
  /** Optional `{ value, max }` — bar width = value/max. */
  progress,
  className,
}) {
  const tones = {
    accent: { rule: 'bg-accent', text: 'text-accent' },
    honey: { rule: 'bg-honey', text: 'text-honey' },
    jade: { rule: 'bg-jade', text: 'text-jade' },
    iris: { rule: 'bg-iris', text: 'text-iris' },
  };
  const t = tones[tone] ?? tones.accent;

  return (
    <div
      className={clsx(
        'group relative flex flex-col rounded-md bg-paper shadow-soft transition-colors',
        'hover:border-ink',
        className
      )}
    >
      {/* Tone bar — sharp edge, not a gradient blob */}
      <div className={clsx('h-px w-full', t.rule)} aria-hidden />

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="kicker">{label}</div>
          {Icon ? <Icon className={clsx('h-4 w-4 shrink-0', t.text)} /> : null}
        </div>

        {loading ? (
          <div className="mt-4 h-9 w-24 animate-pulse rounded-sm bg-ink/[0.06]" aria-hidden />
        ) : (
          <div className="mt-4 stat-num text-[29.75px] font-semibold leading-none text-ink">
            {value}
          </div>
        )}

        {hint && !loading ? (
          <div className="mt-2 text-[11.69px] font-semibold tracking-[0.08em] uppercase text-mist">
            {hint}
          </div>
        ) : null}

        {progress && !loading ? (
          <div className="mt-4">
            <DashProgressBar
              value={progress.value}
              max={progress.max}
              height="h-px"
              palette={tone === 'jade' ? 'jade' : tone === 'iris' ? 'ink' : 'accent'}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
