import React from 'react';
import clsx from 'clsx';

function buildUrl(slug, ext) {
  const base = process.env.PUBLIC_URL || '';
  return `${base}/question-images/${slug}.${ext}`;
}

/**
 * Optional image for MCQ choice `public/question-images/{questionId}{A|B|C|D}.png` (then .jpg / .jpeg).
 * Returns null if all candidates fail to load.
 */
export function ChoiceOptionImage({ questionId, optionLetter, className }) {
  const id = Number(questionId);
  const L = String(optionLetter ?? '').toUpperCase();
  const slug = Number.isFinite(id) && id > 0 && /^[ABCD]$/.test(L) ? `${id}${L}` : null;

  const candidates = React.useMemo(() => {
    if (!slug) return [];
    return [buildUrl(slug, 'png'), buildUrl(slug, 'jpg'), buildUrl(slug, 'jpeg')];
  }, [slug]);

  const [idx, setIdx] = React.useState(0);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    setIdx(0);
    setHidden(false);
  }, [candidates]);

  const src = candidates[idx];
  if (!src || hidden) return null;

  return (
    <div className={clsx('flex justify-center', className)}>
      <img
        src={src}
        alt=""
        className="max-h-[min(38vh,320px)] w-full max-w-xl object-contain"
        loading="lazy"
        onError={() => {
          if (idx < candidates.length - 1) setIdx((i) => i + 1);
          else setHidden(true);
        }}
      />
    </div>
  );
}
