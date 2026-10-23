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
  siteTitle: 'Guganraj Rengaraju | Notes & Explorations',
  siteDescription: 'A little corner of the internet for projects, useful discoveries, personal thoughts, and things worth sharing.',
  siteUrl: 'https://notes.guganraj.me',
  portfolioUrl: 'https://guganraj.me',
  portfolioLabel: 'guganraj.me',
  author: 'Guganraj Rengaraju',
  categories: {
    'case-study': {
      slug: 'case-study',
      title: 'Case Studies',
      description: "Stories of projects I've built, experiments I've run, problems I've solved, and the lessons behind them.",
    },
    'blogs': {
      slug: 'blogs',
      title: 'Blogs',
      description: "Guides, discoveries, useful tools, personal projects, experiences, and things I've learned along the way.",
    },
    'thoughts': {
      slug: 'thoughts',
      title: 'Thoughts',
      description: "Personal reflections, random ideas, opinions, observations, and whatever happens to be on my mind.",
    },
  },
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Case Studies', href: '/case-study' },
    { label: 'Blogs', href: '/blogs' },
    { label: 'Thoughts', href: '/thoughts' },
  ],
};
