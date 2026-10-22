import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllArticles } from '../utils/articles';
import { siteConfig } from '../site.config';

export async function GET(context: APIContext) {
  const articles = await getAllArticles();

  return rss({
    title: siteConfig.siteTitle,
    description: siteConfig.siteDescription,
    site: context.site || siteConfig.siteUrl,
    items: articles.map((article) => ({
      title: article.title,
      description: article.description || '',
      pubDate: article.date ? new Date(article.date) : new Date(),
      link: article.url,
      categories: [article.category, ...(article.tags || [])],
    })),
    customData: `<language>en-us</language>`,
  });
}
