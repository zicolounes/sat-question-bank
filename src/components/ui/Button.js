import clsx from 'clsx';

/**
 * Sharp, editorial buttons.
 *  - Primary: solid blue, near-square (4px), no shadow.
 *  - Secondary: paper with hairline border, no shadow.
 *  - Ghost: text-only with rule on hover.
 *  - Danger: deep blue (we keep palette tight).
 */
export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded font-medium tracking-tight transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-[13.81px]',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-11 px-5 text-[15.94px]',
        variant === 'primary' &&
          'bg-accent text-white hover:bg-accent-hover active:translate-y-px preserve-brand-colors',
        variant === 'secondary' &&
          'border border-rule bg-paper text-ink hover:border-ink hover:bg-canvas/60 active:translate-y-px',
        variant === 'ghost' &&
          'border border-transparent bg-transparent text-mist hover:border-rule hover:bg-canvas/60 hover:text-ink active:translate-y-px',
        variant === 'danger' &&
          'bg-ink text-white hover:bg-accent-deep active:translate-y-px',
        className
      )}
      {...props}
    />
  );
}
