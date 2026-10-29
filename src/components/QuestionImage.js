import React from 'react';
import clsx from 'clsx';

function buildPublicImageUrl({ id, ext }) {
  const base = process.env.PUBLIC_URL || '';
  return `${base}/question-images/${id}.${ext}`;
}

/** Taller than wide — allow more vertical space so width scales up with object-contain. */
const RATIO_PORTRAIT = 1.12;
/** Wider than tall — keep height modest to avoid huge horizontal figures. */
const RATIO_LANDSCAPE = 0.88;

function adaptiveImgClass(aspect) {
  if (aspect === 'portrait') {
    return 'w-full max-h-[min(40vh,360px)] lg:max-h-[min(42vh,400px)] object-contain';
  }
  if (aspect === 'landscape') {
    return 'w-full max-h-[min(30vh,260px)] lg:max-h-[min(32vh,280px)] object-contain';
  }
  return 'w-full max-h-[min(36vh,320px)] object-contain';
}

/**
 * @param {'static' | 'adaptive'} [sizing='static'] — adaptive measures intrinsic ratio after load:
 *   portrait charts get a higher vh-capped max height; wide figures stay shorter.
 */
export function QuestionImage({
  questionId,
  imageUrl,
  className,
  containerClassName,
  imgClassName,
  sizing = 'static',
}) {
  const id = Number(questionId);
  const explicit = String(imageUrl ?? '').trim();

  const candidates = React.useMemo(() => {
    if (explicit) return [explicit];
    if (!Number.isFinite(id) || id <= 0) return [];
    return [
      buildPublicImageUrl({ id, ext: 'png' }),
      buildPublicImageUrl({ id, ext: 'jpg' }),
      buildPublicImageUrl({ id, ext: 'jpeg' }),
    ];
  }, [explicit, id]);

  const [idx, setIdx] = React.useState(0);
  const [hidden, setHidden] = React.useState(false);
  const [aspect, setAspect] = React.useState(null);

  React.useEffect(() => {
    setIdx(0);
    setHidden(false);
    setAspect(null);
  }, [candidates]);

  React.useEffect(() => {
    setAspect(null);
  }, [idx, sizing]);

  const src = candidates[idx];
  if (!src || hidden) return null;

  function handleLoad(e) {
    if (sizing !== 'adaptive') return;
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    const r = h / w;
    if (r >= RATIO_PORTRAIT) setAspect('portrait');
    else if (r <= RATIO_LANDSCAPE) setAspect('landscape');
    else setAspect('square');
  }

  const imgClasses =
    sizing === 'adaptive'
      ? clsx(
          imgClassName ?? className,
          aspect ? adaptiveImgClass(aspect) : 'w-full max-h-[min(36vh,320px)] object-contain'
        )
      : imgClassName ?? className;

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={`Question ${Number.isFinite(id) ? id : ''}`.trim()}
        className={imgClasses}
        loading="lazy"
        onLoad={handleLoad}
        onError={() => {
          if (idx < candidates.length - 1) setIdx((i) => i + 1);
          else setHidden(true);
        }}
      />
    </div>
  );
}
