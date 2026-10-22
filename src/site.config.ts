export interface CategoryConfig {
  slug: string;
  title: string;
  description: string;
}

export interface SiteConfig {
  // Temporary project name - configurable in this single location
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  portfolioUrl: string;
  portfolioLabel: string;
  author: string;
  categories: Record<string, CategoryConfig>;
  navLinks: Array<{ label: string; href: string; external?: boolean }>;
}

export const siteConfig: SiteConfig = {
  // Configurable project name: change here to rename across the entire site
  siteName: 'mrtuxcoder-writes',
  siteTitle: 'Guganraj Rengaraju | Notes & Technical Writing',
  siteDescription: 'Technical blogs, tutorials, infrastructure case studies, and engineering thoughts by Guganraj Rengaraju.',
  siteUrl: 'https://notes.guganraj.me',
  portfolioUrl: 'https://guganraj.me',
  portfolioLabel: 'guganraj.me',
  author: 'Guganraj Rengaraju',
  categories: {
    'case-study': {
      slug: 'case-study',
      title: 'Case Studies',
      description: 'In-depth writeups on infrastructure architecture, homelab systems, and DevOps engineering.',
    },
    'blogs': {
      slug: 'blogs',
      title: 'Blogs',
      description: 'Hands-on technical tutorials, guides, and practical engineering notes.',
    },
    'thoughts': {
      slug: 'thoughts',
      title: 'Thoughts',
      description: 'Reflections on software, developer tooling, systems thinking, and learning in public.',
    },
  },
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Case Studies', href: '/case-study' },
    { label: 'Blogs', href: '/blogs' },
    { label: 'Thoughts', href: '/thoughts' },
    { label: 'About', href: '/about' },
  ],
};
