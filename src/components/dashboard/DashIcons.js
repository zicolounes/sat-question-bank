import React from 'react';

export function IconSpark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinejoin="round" />
      <path d="M5 19l1-3M19 19l-1-3" strokeLinecap="round" />
    </svg>
  );
}

export function IconFlame({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M12 22c4-1 7-4 7-9 0-4-3-8-7-10-4 2-7 6-7 10 0 5 3 8 7 9z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTarget({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBook({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6a2 2 0 012-2h5v16H6a2 2 0 01-2-2V6zM13 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrendUp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 17l6-6 4 4 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlert({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="M10.3 3.6L1.8 18A2 2 0 003.5 21h17a2 2 0 001.7-3l-8.5-14.4a2 2 0 00-3.4 0z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrophy({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4zM17 4h2a2 2 0 012 2v1a3 3 0 01-3 3h-1M7 4H5a2 2 0 00-2 2v1a3 3 0 003 3h1" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClock({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
