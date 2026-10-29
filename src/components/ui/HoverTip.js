import clsx from 'clsx';

/**
 * Hover affordance + popover (CSS `group-hover`). Prefer over native `title` when you want
 * instant feedback and no OS tooltip delay.
 */
export function HoverTip({
  content,
  children,
  placement = 'top',
  className,
  fullWidth,
  highlight = true,
}) {
  if (content == null || content === '') return children;
  const isTop = placement === 'top';
  return (
    <div className={clsx('group relative', fullWidth && 'w-full', className)}>
      <div
        className={clsx(
          fullWidth && 'block w-full',
          highlight &&
            'rounded-md px-1 py-0.5 transition-colors duration-150 ease-out group-hover:bg-mist/[0.14]',
          highlight && fullWidth && 'h-full min-h-0'
        )}
      >
        {children}
      </div>
      <div
        role="tooltip"
        className={clsx(
          'pointer-events-none absolute left-1/2 z-[60] w-max max-w-[min(22rem,calc(100vw-2.25rem))] -translate-x-1/2',
          'rounded-md border border-ruleStrong bg-paper px-3 py-2 text-left text-[13.81px] leading-snug text-ink shadow-soft',
          'opacity-0 transition duration-150 ease-out will-change-transform',
          'translate-y-0.5 group-hover:translate-y-0 group-hover:opacity-100',
          isTop ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
      >
        {content}
      </div>
    </div>
  );
}
