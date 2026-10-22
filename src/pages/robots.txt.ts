import { siteConfig } from '../site.config';

export function GET() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${siteConfig.siteUrl}/sitemap-index.xml
Sitemap: ${siteConfig.siteUrl}/sitemap.xml
`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
