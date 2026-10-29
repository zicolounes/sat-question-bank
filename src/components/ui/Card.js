import clsx from 'clsx';

/**
 * Editorial card — flat paper, single hairline border, no soft halo.
 * Pages compose visual depth through layout, not stacked shadows.
 */
export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-md border-0 bg-paper shadow-soft',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={clsx('px-5 py-4', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={clsx('p-5', className)} {...props} />;
}
