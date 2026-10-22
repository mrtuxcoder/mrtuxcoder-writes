import { getCollection, type CollectionEntry } from 'astro:content';

export interface ParsedArticle {
  entry: CollectionEntry<'articles'>;
  category: string;
  slug: string;
  url: string;
  title: string;
  description?: string;
  date?: string;
  formattedDate?: string;
  tags: string[];
  draft: boolean;
  readingTime: string;
}

/**
 * Calculates reading time based on 200 wpm.
 */
export function calculateReadingTime(text?: string): string {
  if (!text) return '1 min read';
  const clean = text.replace(/<\/?[^>]+(>|$)/g, '').replace(/```[\s\S]*?```/g, '');
  const words = clean.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Formats YYYY-MM-DD or ISO date string to readable format e.g. "Oct 22, 2026".
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Splits entry.id into category and slug.
 */
export function parseArticleId(id: string): { category: string; slug: string } {
  const parts = id.split('/');
  if (parts.length >= 2) {
    const category = parts[0];
    const slug = parts.slice(1).join('/').replace(/\.md$/, '');
    return { category, slug };
  }
  return { category: 'blogs', slug: id.replace(/\.md$/, '') };
}

/**
 * Fetches all articles, parses routes and metadata, and filters drafts in production.
 */
export async function getAllArticles(options: { includeDrafts?: boolean } = {}): Promise<ParsedArticle[]> {
  const rawArticles = await getCollection('articles');
  const isProduction = import.meta.env.PROD;
  const allowDrafts = options.includeDrafts ?? !isProduction;

  const parsed: ParsedArticle[] = [];

  for (const entry of rawArticles) {
    const { category, slug } = parseArticleId(entry.id);
    const draft = Boolean(entry.data.draft);

    if (draft && !allowDrafts) {
      continue;
    }

    const date = entry.data.date;
    parsed.push({
      entry,
      category,
      slug,
      url: `/${category}/${slug}`,
      title: entry.data.title,
      description: entry.data.description,
      date,
      formattedDate: formatDate(date),
      tags: entry.data.tags || [],
      draft,
      readingTime: calculateReadingTime(entry.body),
    });
  }

  // Sort: newest first by date, fallback alphabetically by title
  parsed.sort((a, b) => {
    if (a.date && b.date) {
      return b.date.localeCompare(a.date);
    }
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.title.localeCompare(b.title);
  });

  return parsed;
}

/**
 * Returns articles belonging to a specific category.
 */
export async function getArticlesByCategory(
  category: string,
  options: { includeDrafts?: boolean } = {}
): Promise<ParsedArticle[]> {
  const all = await getAllArticles(options);
  return all.filter((a) => a.category === category);
}

/**
 * Returns recent articles up to a given limit.
 */
export async function getRecentArticles(limit = 5): Promise<ParsedArticle[]> {
  const all = await getAllArticles();
  return all.slice(0, limit);
}
