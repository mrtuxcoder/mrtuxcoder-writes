import typography from '@tailwindcss/typography';

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${variableName}) calc(${opacityValue} * 100%), transparent)`;
    }
    return `var(${variableName})`;
  };
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: withOpacity('--background'),
        foreground: withOpacity('--foreground'),
        surface: withOpacity('--section-surface'),
        card: {
          DEFAULT: withOpacity('--card'),
          foreground: withOpacity('--card-foreground'),
        },
        primary: {
          DEFAULT: withOpacity('--primary'),
          foreground: withOpacity('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withOpacity('--secondary'),
          foreground: withOpacity('--secondary-foreground'),
        },
        muted: {
          DEFAULT: withOpacity('--muted'),
          foreground: withOpacity('--muted-foreground'),
        },
        border: withOpacity('--border'),
        accent: {
          emerald: '#10b981',
        },
      },
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'Geist Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      maxWidth: {
        'reading': '48rem', // 768px (max-w-3xl)
        'container': '64rem', // 1024px (max-w-5xl)
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            color: 'var(--foreground)',
            fontSize: '0.875rem', // 14px matches portfolio
            lineHeight: '1.7',
            a: {
              color: 'var(--primary)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              textDecorationColor: 'rgba(16, 185, 129, 0.4)',
              fontWeight: '500',
              '&:hover': {
                color: '#10b981',
                textDecorationColor: '#10b981',
              },
            },
            h1: {
              color: 'var(--primary)',
              fontWeight: '600',
              letterSpacing: '-0.02em',
              fontSize: '1.375rem', // 22px matches portfolio
              marginTop: '1.75rem',
              marginBottom: '0.75rem',
              lineHeight: '1.3',
            },
            h2: {
              color: 'var(--primary)',
              fontWeight: '600',
              letterSpacing: '-0.02em',
              fontSize: '1.125rem', // 18px matches portfolio
              marginTop: '1.5rem',
              marginBottom: '0.625rem',
              lineHeight: '1.35',
            },
            h3: {
              color: 'var(--primary)',
              fontWeight: '600',
              fontSize: '0.975rem', // 15.5px matches portfolio
              marginTop: '1.25rem',
              marginBottom: '0.5rem',
              lineHeight: '1.4',
            },
            h4: {
              color: 'var(--primary)',
              fontWeight: '600',
              fontSize: '0.875rem',
            },
            p: {
              marginTop: '0.875rem',
              marginBottom: '0.875rem',
              color: 'var(--foreground)',
              lineHeight: '1.7',
            },
            li: {
              color: 'var(--foreground)',
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
              fontSize: '0.875rem',
            },
            strong: {
              color: 'var(--primary)',
              fontWeight: '600',
            },
            code: {
              color: 'var(--foreground)',
              backgroundColor: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '0.1em 0.3em',
              borderRadius: '0.25rem',
              fontWeight: '500',
              fontSize: '1em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1.125rem',
              fontSize: '0.8125rem',
              lineHeight: '1.6',
              overflowX: 'auto',
            },
            'pre code': {
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
              fontSize: 'inherit',
              fontWeight: '400',
              color: 'inherit',
            },
            blockquote: {
              fontStyle: 'normal',
              color: 'var(--secondary)',
              borderLeftColor: '#10b981',
              borderLeftWidth: '3px',
              backgroundColor: 'var(--card)',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
            },
            hr: {
              display: 'none',
            },
            table: {
              width: '100%',
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
              borderCollapse: 'collapse',
              fontSize: '0.8125rem',
            },
            th: {
              color: 'var(--primary)',
              fontWeight: '600',
              borderBottom: '1px solid var(--border)',
              padding: '0.5rem 0.75rem',
              textAlign: 'left',
              backgroundColor: 'var(--muted)',
            },
            td: {
              borderBottom: '1px solid var(--border)',
              padding: '0.5rem 0.75rem',
              verticalAlign: 'top',
              color: 'var(--foreground)',
            },
            'ul > li::marker': {
              color: '#10b981',
            },
            'ol > li::marker': {
              color: 'var(--secondary)',
              fontWeight: '600',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
