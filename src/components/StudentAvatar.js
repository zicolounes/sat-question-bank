import React from 'react';
import clsx from 'clsx';
import { DEFAULT_AVATAR_SYMBOL, sanitizeAvatar } from '../lib/studentAvatar';

function SymbolShape({ id }) {
  const common = { fill: 'currentColor' };
  switch (id) {
    case 'triangle':
      return <polygon points="12,5 20,19 4,19" {...common} />;
    case 'diamond':
      return <polygon points="12,4 20,12 12,20 4,12" {...common} />;
    case 'ring':
      return <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />;
    case 'star':
      return (
        <path
          {...common}
          d="M12 4l2.2 5h5.6l-4.5 3.3 1.7 5.2L12 15.9l-5 1.6 1.7-5.2L4.2 9h5.6z"
        />
      );
    case 'bolt':
      return <path {...common} d="M13 3L6 14h5l-1 7 7-12h-5l1-6z" />;
    case 'plus':
      return <path {...common} d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />;
    case 'square':
      return <rect x="7" y="7" width="10" height="10" rx="1.5" {...common} />;
    case 'pentagon':
      return <polygon points="12,4 20,9 17.5,19 6.5,19 4,9" {...common} />;
    case 'spark':
      return (
        <path
          {...common}
          d="M12 4l2.4 5.5h5.5l-4.4 3.2 1.7 5.3L12 14.6 8.8 18l1.7-5.3-4.4-3.2h5.5z"
        />
      );
    case 'hex':
    default:
      return <polygon points="12,3 19.5,7.25 19.5,16.75 12,21 4.5,16.75 4.5,7.25" {...common} />;
  }
}

/**
 * Generated “profile picture”: solid color tile + geometric symbol (no external images).
 */
export function StudentAvatar({
  avatarColor,
  avatarSymbol,
  size = 36,
  className,
  title,
  rounded = 'rounded-2xl',
}) {
  const { avatarColor: bg, avatarSymbol: sym } = sanitizeAvatar({ avatarColor, avatarSymbol });

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center shadow-sm ring-1 ring-black/10',
        rounded,
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
      title={title}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[68%] w-[68%] text-white/90"
        aria-hidden="true"
      >
        <SymbolShape id={sym || DEFAULT_AVATAR_SYMBOL} />
      </svg>
    </div>
  );
}
