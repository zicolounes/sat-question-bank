import clsx from 'clsx';
import { inputClassName } from './Field';

export function Textarea({ className, ...props }) {
  return (
    <textarea
      {...props}
      className={clsx(inputClassName(), 'min-h-28 resize-y', className)}
    />
  );
}

