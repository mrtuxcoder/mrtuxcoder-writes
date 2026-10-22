import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--section-surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        accent: {
          emerald: '#00bb7f',
        },
      },
      fontFamily: {
        sans: [
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
            lineHeight: '1.75',
            a: {
              color: 'var(--primary)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              textDecorationColor: 'rgba(28, 33, 43, 0.3)',
              fontWeight: '500',
              '&:hover': {
                textDecorationColor: 'var(--primary)',
              },
            },
            h1: {
              color: 'var(--primary)',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            },
            h2: {
              color: 'var(--primary)',
              fontWeight: '600',
              letterSpacing: '-0.02em',
              marginTop: '2rem',
              marginBottom: '0.75rem',
            },
            h3: {
              color: 'var(--primary)',
              fontWeight: '600',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
            },
            h4: {
              color: 'var(--primary)',
              fontWeight: '600',
            },
            p: {
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            strong: {
              color: 'var(--primary)',
              fontWeight: '600',
            },
            code: {
              color: 'var(--primary)',
              backgroundColor: 'rgba(28, 33, 43, 0.05)',
              padding: '0.2rem 0.4rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#fafafa',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '1rem 1.25rem',
              overflowX: 'auto',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              fontSize: '0.875rem',
              fontWeight: '400',
              color: 'inherit',
            },
            blockquote: {
              fontStyle: 'normal',
              color: 'var(--secondary)',
              borderLeftColor: 'var(--primary)',
              borderLeftWidth: '3px',
              paddingLeft: '1rem',
            },
            hr: {
              borderColor: 'var(--border)',
              marginTop: '2.5rem',
              marginBottom: '2.5rem',
            },
            table: {
              width: '100%',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            },
            th: {
              color: 'var(--primary)',
              fontWeight: '600',
              borderBottom: '2px solid var(--border)',
              padding: '0.625rem 0.75rem',
              textAlign: 'left',
              backgroundColor: 'var(--section-surface)',
            },
            td: {
              borderBottom: '1px solid var(--border)',
              padding: '0.625rem 0.75rem',
              verticalAlign: 'top',
            },
            'ul > li::marker': {
              color: 'var(--secondary)',
            },
            'ol > li::marker': {
              color: 'var(--secondary)',
              fontWeight: '500',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
