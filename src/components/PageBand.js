import clsx from 'clsx';

export const PAGE_CONTENT_MAX = 'max-w-[min(94vw,calc(100vw-1rem))]';

/** Centered page column (use on standard pages). */
export function PageContent({ children, className }) {
  return (
    <div
      className={clsx(
        'mx-auto w-full px-4 py-5 sm:px-6 sm:py-8 lg:py-10',
        PAGE_CONTENT_MAX,
        className
      )}
    >
      {children}
    </div>
  );
}

/** Page masthead — kicker, title, optional subtitle and trailing actions. */
export function PageIntro({ kicker, title, sub, actions, children }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {kicker ? <div className="kicker">{kicker}</div> : null}
          {title ? (
            <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
              {title}
            </h1>
          ) : null}
          {sub ? <p className="mt-3 max-w-2xl text-sm text-mist">{sub}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Full-viewport background row; inner content stays in the page column. */
export function PageBand({ tone = 'light', children, className, flushTop = false }) {
  return (
    <section
      className={clsx(
        'band-bleed',
        tone === 'light' ? 'bg-canvas' : 'bg-canvas-deep',
        className
      )}
    >
      <div
        className={clsx(
          'mx-auto w-full px-4 sm:px-6',
          PAGE_CONTENT_MAX,
          flushTop ? 'pt-3 pb-5 sm:pt-6 sm:pb-7 lg:pt-8 lg:pb-8' : 'py-5 sm:py-8 lg:py-10',
        )}
      >
        {children}
      </div>
    </section>
  );
}
