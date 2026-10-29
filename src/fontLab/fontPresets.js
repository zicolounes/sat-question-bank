/**
 * Add a row here when you want to try a new font quickly.
 *
 * - **local / @font-face**: Add @font-face rules in `src/index.css` (see Ranade block),
 *   then add a preset with `cssFamily` matching `font-family` in @font-face.
 * - **Google Fonts**: Paste the stylesheet URL from Google Fonts “Use on the web” → CSS,
 *   set `googleHref`, and set `cssFamily` / `displayFamily` to quoted family names.
 *
 * Workflow: edit this file → save → refresh → open /font-lab → pick preset → Apply.
 */
export const FONT_LAB_PRESETS = [
  {
    id: 'crimson-pro',
    label: 'Crimson Pro (local, default)',
    googleHref: '',
    cssFamily: "'Crimson Pro', ui-serif, Georgia, 'Times New Roman', serif",
    displayFamily: "'Crimson Pro', ui-serif, Georgia, 'Times New Roman', serif",
  },
  {
    id: 'ranade',
    label: 'Ranade (bundled in index.css)',
    googleHref: '',
    cssFamily: "'Ranade', ui-sans-serif, system-ui, sans-serif",
    displayFamily: "'Ranade', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'system',
    label: 'System UI stack only',
    googleHref: '',
    cssFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    displayFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans (Google) — UI + headings',
    googleHref:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
    cssFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    displayFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'dm-sans-serif-display',
    label: 'DM Sans + DM Serif Display (Google)',
    googleHref:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700&family=DM+Serif+Display:ital@0;1&display=swap',
    cssFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    displayFamily: '"DM Serif Display", Georgia, "Times New Roman", serif',
  },
];
