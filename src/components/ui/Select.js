import clsx from 'clsx';
import { inputClassName } from './Field';

export function Select({ className, ...props }) {
  return (
    <select
      {...props}
      className={clsx(inputClassName(), 'pr-9', className)}
    />
  );
}

