/**
 * PorcTrack 8 — Tailwind preset
 * Drop this into your tailwind.config.js:
 *
 *   const porctrack = require('./_shared/tailwind.config.js');
 *   module.exports = {
 *     presets: [porctrack],
 *     content: ['./src/!**!/!*.{ts,tsx,html}']
 *   };
 *
 * Colors use CSS vars from colors_and_type.css so runtime theme flip (.theme-day) works.
 */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        'bg-0':   'var(--bg-0)',
        'bg-1':   'var(--bg-1)',
        'bg-2':   'var(--bg-2)',
        border:   'var(--border)',
        // Text
        'text-0': 'var(--text-0)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          fg:      'var(--accent-fg)',
          dim:     'var(--accent-dim)',
        },
        // Signals
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger:  'var(--danger)',
        info:    'var(--info)',
        // Semantic
        amber: 'var(--amber)',
        red:   'var(--red)',
        blue:  'var(--blue)',
        gold:  'var(--gold)',
        coral: 'var(--coral)',
        teal:  'var(--teal)',
        cyan:  'var(--cyan)',
        // Tab accents
        'tab-cockpit':    'var(--accent-cockpit)',
        'tab-troupeau':   'var(--accent-troupeau)',
        'tab-cycles':     'var(--accent-cycles)',
        'tab-ressources': 'var(--accent-ressources)',
        'tab-pilotage':   'var(--accent-pilotage)',
      },
      borderRadius: {
        sm:    'var(--radius-sm)',
        md:    'var(--radius-md)',
        lg:    'var(--radius-lg)',
        xl:    'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      spacing: {
        1:  'var(--space-1)',
        2:  'var(--space-2)',
        3:  'var(--space-3)',
        4:  'var(--space-4)',
        5:  'var(--space-5)',
        6:  'var(--space-6)',
        8:  'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
      },
      boxShadow: {
        sm:            'var(--shadow-sm)',
        md:            'var(--shadow-md)',
        lg:            'var(--shadow-lg)',
        'glow-accent': 'var(--shadow-glow-accent)',
      },
      transitionTimingFunction: {
        spring:    'var(--ease-spring)',
        gentle:    'var(--ease-gentle)',
        snappy:    'var(--ease-snappy)',
        'out-expo':'var(--ease-out-expo)',
      },
      fontFamily: {
        display: ['BigShoulders', 'Big Shoulders Display', 'Impact', 'sans-serif'],
        body:    ['InstrumentSans', '-apple-system', 'system-ui', 'sans-serif'],
        values:  ['BricolageGrotesque', 'InstrumentSans', 'sans-serif'],
        mono:    ['DMMono', 'JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-xl': ['44px', { lineHeight: '1',    letterSpacing: '0.02em' }],
        'display-lg': ['36px', { lineHeight: '1',    letterSpacing: '0.02em' }],
        'display-md': ['28px', { lineHeight: '1',    letterSpacing: '0.02em' }],
        'display-sm': ['22px', { lineHeight: '1.1',  letterSpacing: '0.02em' }],
        'body-lg':    ['15px', { lineHeight: '1.45' }],
        'body-md':    ['13px', { lineHeight: '1.5'  }],
        'body-sm':    ['12px', { lineHeight: '1.5'  }],
        'label-xs':   ['11px', { lineHeight: '1',    letterSpacing: '0.06em' }],
      },
    },
  },
};
