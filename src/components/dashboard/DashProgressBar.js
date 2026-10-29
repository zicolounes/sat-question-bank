import React from 'react';
import clsx from 'clsx';

/** Solid colors only — flat editorial bars, no gradients. */
const PALETTE = {
  jade: '#0d6b56',
  accent: '#0337E1',
  accentHoney: '#2557FC',
  ink: '#0a1224',
};

function fillByPercent(pct) {
  if (pct >= 100) return '#0d6b56';
  if (pct >= 66) return '#0337E1';
  if (pct >= 33) return '#2557FC';
  return '#9DB4FE';
}

/**
 * Flat, square-ended progress bar (editorial). Square corners read more
 * “utility” than friendly pills.
 *
 * @param {'jade'|'accent'|'accentHoney'|'ink'|'byPercent'} [palette='accent']
 */
export function DashProgressBar({
  value,
  max = 100,
  className,
  trackClassName,
  height = 'h-1.5',
  palette = 'accent',
}) {
  const v = Number(value);
  const m = Number(max);
  const ratio =
    m <= 0 || !Number.isFinite(v) || !Number.isFinite(m) ? 0 : Math.min(1, Math.max(0, v / m));
  const widthPct = Math.min(100, Math.max(0, ratio * 100));
  const widthStr = `${Number(widthPct.toFixed(4))}%`;
  const pctRounded = Math.round(widthPct);

  const background =
    palette === 'byPercent' ? fillByPercent(pctRounded) : PALETTE[palette] ?? PALETTE.accent;

  return (
    <div
      className={clsx('w-full min-w-0 overflow-hidden bg-ink/[0.07]', height, trackClassName, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Number.isFinite(m) && m > 0 ? m : 100}
      aria-valuenow={Number.isFinite(v) ? Math.min(m > 0 ? m : 100, Math.max(0, v)) : 0}
    >
      <div
        className={clsx('block max-w-full', height)}
        style={{
          width: widthStr,
          minWidth: ratio > 0 ? 2 : 0,
          background,
        }}
      />
    </div>
  );
}
