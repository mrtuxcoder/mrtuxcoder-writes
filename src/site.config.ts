export interface CategoryConfig {
  slug: string;
  title: string;
  description: string;
}

export interface SiteConfig {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  portfolioUrl: string;
  portfolioLabel: string;
  author: string;
  social: {
    github: string;
    linkedin: string;
    x: string;
  };
  categories: Record<string, CategoryConfig>;
  navLinks: Array<{ label: string; href: string; external?: boolean }>;
}

export const siteConfig: SiteConfig = {
  siteName: 'guganraj.me / notes',
  siteTitle: 'Guganraj Rengaraju | Notes & Case Studies',
  siteDescription: 'Case studies, architectural decisions, guides, and engineering notes by Guganraj Rengaraju.',
  siteUrl: 'https://notes.guganraj.me',
  portfolioUrl: 'https://www.guganraj.me',
  portfolioLabel: 'guganraj.me',
  author: 'Guganraj Rengaraju',
  social: {
    github: 'https://github.com/mrtuxcoder',
    linkedin: 'https://www.linkedin.com/in/guganraj-rengaraju/',
    x: 'https://x.com/guganraj_k',
  },
  categories: {
    'case-study': {
      slug: 'case-study',
      title: 'Case Studies',
      description: "In-depth engineering breakdowns of systems, cloud infrastructure deployments, and open-source software.",
    },
    'blogs': {
      slug: 'blogs',
      title: 'Blogs',
      description: "Guides, discoveries, useful tools, personal projects, experiences, and things I've learned along the way.",
    },
    'thoughts': {
      slug: 'thoughts',
      title: 'Thoughts',
      description: "Personal reflections, ideas, opinions, observations, and engineering principles.",
    },
  },
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Case Studies', href: '/case-study' },
    { label: 'Blogs', href: '/blogs' },
    { label: 'Thoughts', href: '/thoughts' },
  ],
};
