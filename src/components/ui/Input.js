import clsx from 'clsx';
import { inputClassName } from './Field';

export function Input({ className, hasError, ...props }) {
  return (
    <input
      {...props}
      className={clsx(inputClassName({ hasError }), className)}
    />
  );
}

