import clsx from 'clsx';

/** Editorial pill — square-ish, uppercase, hairline border. */
function badgeBase(className) {
  return clsx(
    'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10.63px] font-semibold uppercase tracking-kicker',
    className
  );
}

const DIFFICULTY_BADGE = {
  Easy: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Medium: 'border-amber-300 bg-amber-50 text-amber-900',
  Hard: 'border-red-300 bg-red-50 text-red-800',
};

/** Pills for MultiSelect when `variant="difficulty"` — matches badge hues. */
export function difficultyMultiSelectClasses(option, active) {
  const o = String(option ?? '');
  if (active) {
    if (o === 'Easy') return 'border-emerald-700 bg-emerald-700 text-white';
    if (o === 'Medium') return 'border-amber-600 bg-amber-500 text-white';
    if (o === 'Hard') return 'border-red-700 bg-red-600 text-white';
    return 'border-ink bg-ink text-white';
  }
  if (o === 'Easy') return 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100';
  if (o === 'Medium') return 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100';
  if (o === 'Hard') return 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100';
  return 'border-rule bg-paper text-ink hover:bg-canvas/60';
}

export function DifficultyBadge({ difficulty }) {
  return (
    <span className={badgeBase(DIFFICULTY_BADGE[difficulty] ?? 'border-rule bg-paper text-mist')}>
      {difficulty || '—'}
    </span>
  );
}

export function TierBadge({ tier }) {
  const map = {
    '1': 'border-sky-300 bg-sky-50 text-sky-800',
    '2': 'border-violet-300 bg-violet-50 text-violet-800',
    '3': 'border-blue-300 bg-blue-50 text-blue-800',
  };
  return (
    <span className={badgeBase(map[String(tier)] ?? 'border-rule bg-paper text-mist')}>
      T{tier || '—'}
    </span>
  );
}
