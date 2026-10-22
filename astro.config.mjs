import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  site: 'https://notes.guganraj.me',
  output: 'static',
  trailingSlash: 'never',
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: false,
    },
    ...unified({
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: {
              className: ['heading-anchor', 'opacity-0', 'hover:opacity-100', 'transition-opacity', 'ml-2', 'text-secondary'],
              ariaLabel: 'Link to this section',
            },
            content: {
              type: 'text',
              value: '#',
            },
          },
        ],
      ],
    }),
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => !page.includes('/drafts/'),
    }),
  ],
});
