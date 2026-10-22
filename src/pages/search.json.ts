import { getAllArticles } from '../utils/articles';

export async function GET() {
  const articles = await getAllArticles();

  const searchData = articles.map((article) => ({
    title: article.title,
    description: article.description || '',
    url: article.url,
    category: article.category,
    tags: article.tags || [],
    date: article.formattedDate || '',
  }));

  return new Response(JSON.stringify(searchData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
