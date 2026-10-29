/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        /** Page backgrounds — DEFAULT = light band, dim = page base, deep = dark band. */
        canvas: {
          DEFAULT: '#FFFFFF',
          dim: '#F8FAFE',
          deep: '#F4F7FD',
        },
        /** Card / surface — white (#FFFFFF). */
        paper: '#FFFFFF',
        /** Body text — blue-black for contrast on light blues. */
        ink: '#0a1224',
        /** Muted labels — blue-gray. */
        mist: '#3d4d73',
        /** Hairlines — soft blue border. */
        rule: '#B8C8F8',
        /** Stronger hairline / emphasis borders. */
        ruleStrong: '#9DB4FE',

        /** Primary brand blues (#0337E1 → #2557FC → #6186FD → #9DB4FE → #DAE2FF). */
        accent: {
          DEFAULT: '#0337E1',
          hover: '#2557FC',
          deep: '#022590',
          muted: '#6186FD',
          soft: '#9DB4FE',
          glow: 'rgba(97, 134, 253, 0.22)',
        },
        honey: { DEFAULT: '#2557FC', deep: '#0337E1' },
        sky: { DEFAULT: '#6186FD', soft: '#9DB4FE' },
        jade: {
          DEFAULT: '#0d6b56',
          bright: '#12a182',
          soft: 'rgba(13, 107, 86, 0.10)',
        },
        iris: '#3730a3',
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        edge: '0 0 0 1px #B8C8F8',
        edgeStrong: '0 0 0 1px #0a1224',
        soft: '0 1px 2px rgba(3, 55, 225, 0.05), 0 8px 24px -10px rgba(3, 55, 225, 0.07)',
        lift: '0 1px 0 rgba(3, 55, 225, 0.06), 0 12px 28px -14px rgba(3, 55, 225, 0.22), 0 0 0 1px #B8C8F8',
        glow: '0 0 0 1px rgba(37, 87, 252, 0.4), 0 10px 28px -10px rgba(3, 55, 225, 0.35)',
      },
      letterSpacing: {
        kicker: '0.18em',
      },
      fontSize: {
        kicker: ['11px', { lineHeight: '1', letterSpacing: '0.18em' }],
      },
    },
  },
  plugins: [],
  safelist: ['bg-canvas-dim', 'bg-canvas-deep'],
};
