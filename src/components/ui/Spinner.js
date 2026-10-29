import clsx from 'clsx';

export function Spinner({ className }) {
  return (
    <div
      className={clsx(
        'h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-accent',
        className
      )}
      aria-label="Loading"
      role="status"
    />
  );
}
