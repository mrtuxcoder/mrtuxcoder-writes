import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content' }),
  schema: z.object({
    title: z.string({
      required_error: 'Article title is required in frontmatter.',
    }),
    description: z.string().optional(),
    date: z
      .string()
      .or(z.date())
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (val instanceof Date) return val.toISOString().slice(0, 10);
        return String(val);
      }),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
