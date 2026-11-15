import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--section-surface)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
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
            fontSize: '1.0625rem', // 17px comfortable reading size
            lineHeight: '1.8',
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
              fontWeight: '800',
              letterSpacing: '-0.02em',
              fontSize: '2rem',
              marginTop: '2.5rem',
              marginBottom: '1rem',
              lineHeight: '1.3',
            },
            h2: {
              color: 'var(--primary)',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              fontSize: '1.5rem',
              marginTop: '2.25rem',
              marginBottom: '0.875rem',
              lineHeight: '1.35',
            },
            h3: {
              color: 'var(--primary)',
              fontWeight: '600',
              fontSize: '1.25rem',
              marginTop: '1.75rem',
              marginBottom: '0.625rem',
              lineHeight: '1.4',
            },
            h4: {
              color: 'var(--primary)',
              fontWeight: '600',
              fontSize: '1.1rem',
            },
            p: {
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
              color: 'var(--foreground)',
            },
            li: {
              color: 'var(--foreground)',
              marginTop: '0.375rem',
              marginBottom: '0.375rem',
            },
            strong: {
              color: 'var(--primary)',
              fontWeight: '700',
            },
            code: {
              color: 'var(--foreground)',
              backgroundColor: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '0.2rem 0.45rem',
              borderRadius: '0.375rem',
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
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '1.125rem 1.375rem',
              fontSize: '0.925rem',
              lineHeight: '1.7',
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
              borderLeftWidth: '4px',
              backgroundColor: 'var(--card)',
              padding: '0.85rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
            },
            hr: {
              display: 'none',
            },
            table: {
              width: '100%',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              borderCollapse: 'collapse',
              fontSize: '0.95rem',
            },
            th: {
              color: 'var(--primary)',
              fontWeight: '600',
              borderBottom: '2px solid var(--border)',
              padding: '0.75rem 1rem',
              textAlign: 'left',
              backgroundColor: 'var(--muted)',
            },
            td: {
              borderBottom: '1px solid var(--border)',
              padding: '0.75rem 1rem',
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
