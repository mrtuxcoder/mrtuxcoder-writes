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

export interface ReadingTimeStats {
  minutes: number;
  text: string;
  wordCount: number;
  proseWords: number;
  codeWords: number;
  headingsCount: number;
  codeBlocksCount: number;
  tablesCount: number;
}

/**
 * Calculates realistic reading time based on words, headings, sections, and technical blocks.
 *
 * Technical reading model:
 * - Prose reading speed: ~200 words per minute (~3.33 words/sec).
 * - Headings (H1/H2/H3): Readers pause ~6 seconds per heading/section transition to absorb structure.
 * - Code & diagram blocks: Inspected at ~80 words/min equivalent (~15-20 sec per block).
 * - Tables / structured metrics: ~10 seconds per table.
 *
 * Avoids destructive regex that mistakes comparison operators (<, >) for HTML tags.
 */
export function calculateReadingTime(rawContent?: string): string {
  return getReadingTimeStats(rawContent).text;
}

export function getReadingTimeStats(rawContent?: string): ReadingTimeStats {
  if (!rawContent || !rawContent.trim()) {
    return {
      minutes: 1,
      text: '1 min read',
      wordCount: 0,
      proseWords: 0,
      codeWords: 0,
      headingsCount: 0,
      codeBlocksCount: 0,
      tablesCount: 0,
    };
  }

  // 1. Strip YAML frontmatter if present
  const content = rawContent.replace(/^---[\s\S]*?---\s*/, '');

  // 2. Identify sections and headings (# Title, ## Section, ### Subsection)
  const headingMatches = content.match(/^#{1,6}\s+.+$/gm) || [];
  const headingsCount = headingMatches.length;

  // 3. Extract and analyze code blocks
  const codeBlockMatches = content.match(/```[\s\S]*?```/g) || [];
  const codeBlocksCount = codeBlockMatches.length;

  let codeWords = 0;
  for (const block of codeBlockMatches) {
    const codeBody = block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```$/, '');
    codeWords += codeBody.trim().split(/\s+/).filter(Boolean).length;
  }

  // 4. Count tables (pipes on consecutive lines)
  const tableMatches = content.match(/(?:^\|.+\|$\n?)+/gm) || [];
  const tablesCount = tableMatches.length;

  // 5. Clean prose content without corrupting math/inequality symbols (< 2 seconds, etc.)
  const proseWithoutCode = content.replace(/```[\s\S]*?```/g, ' ');
  const cleanProse = proseWithoutCode
    // Only match valid HTML open/close tags (e.g. <div>, </span>, <br />), NOT standalone < or >
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g, ' ')
    // Strip image Markdown syntax ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    // Keep link text from [text](url)
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Strip markdown formatting symbols but keep numbers and text intact
    .replace(/[#*`_~|]/g, ' ');

  const proseWords = cleanProse.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = proseWords + codeWords;

  // 6. Calculate total seconds based on human technical reading metrics:
  // - Prose reading: 200 words per minute
  const proseSeconds = (proseWords / 200) * 60;

  // - Technical code/architecture block reading: 80 words per minute
  const codeSeconds = (codeWords / 80) * 60;

  // - Heading/section context switch: 6 seconds pause per heading
  const headingSeconds = headingsCount * 6;

  // - Table data inspection: 10 seconds per table
  const tableSeconds = tablesCount * 10;

  const totalSeconds = proseSeconds + codeSeconds + headingSeconds + tableSeconds;
  const minutes = Math.max(1, Math.round(totalSeconds / 60));

  return {
    minutes,
    text: `${minutes} min read`,
    wordCount,
    proseWords,
    codeWords,
    headingsCount,
    codeBlocksCount,
    tablesCount,
  };
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
