# mrtuxcoder-writes

A minimal, high-performance static publishing platform for technical blogs, tutorials, infrastructure case studies, and engineering thoughts.

- **Reference Design**: Inspired by [guganraj.me](https://guganraj.me)
- **Target Domain**: `notes.guganraj.me`
- **Architecture**: Astro (Static Site Generation), Tailwind CSS, Shiki
- **Deployment**: Cloudflare Pages (Pure static output)

---

## Directory Structure

```text
mrtuxcoder-writes/
├── content/                     # Markdown articles organized by category
│   ├── case-study/              # Infrastructure blueprints & deep dives (-> /case-study/*)
│   ├── blogs/                   # Technical guides & tutorials (-> /blogs/*)
│   └── thoughts/                # Engineering essays & notes (-> /thoughts/*)
├── public/                      # Static assets (favicons, robots, etc.)
│   └── favicon.svg
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── ArticleCard.astro    # Minimalist list row
│   │   ├── Footer.astro         # Site footer & copyright
│   │   ├── Header.astro         # Responsive top navigation & brand
│   │   ├── SearchModal.astro    # Zero-dependency client-side search dialog
│   │   └── TableOfContents.astro# Dynamic TOC for articles
│   ├── layouts/
│   │   ├── ArticleLayout.astro  # Comfortable reading container (max-w-3xl)
│   │   └── BaseLayout.astro     # Core HTML shell & container frame (max-w-5xl)
│   ├── pages/                   # Static page routes & endpoints
│   │   ├── [category]/
│   │   │   ├── [slug].astro     # Dynamic article route
│   │   │   └── index.astro      # Category listing page
│   │   ├── 404.astro            # Custom 404 page
│   │   ├── about.astro          # About publication page
│   │   ├── index.astro          # Minimal homepage
│   │   ├── robots.txt.ts        # Dynamic robots.txt
│   │   ├── rss.xml.ts           # RSS 2.0 XML feed
│   │   ├── search.json.ts       # Build-time JSON search index
│   │   └── sitemap.xml.ts       # Sitemap redirect/entrypoint
│   ├── styles/
│   │   └── global.css           # Design tokens, variables & typography rules
│   ├── utils/
│   │   └── articles.ts          # Article loader, draft filtering & sort logic
│   ├── content.config.ts        # Astro content collections schema
│   └── site.config.ts           # Single centralized site configuration
├── astro.config.mjs             # Astro SSG build settings & integrations
├── tailwind.config.mjs          # Tailwind theme & design tokens
├── tsconfig.json                # TypeScript configuration
└── package.json
```

---

## Renaming the Project

The temporary name `mrtuxcoder-writes` is configured in a single central file:

👉 **[`src/site.config.ts`](./src/site.config.ts)**

Edit `siteName`, `siteTitle`, or `siteDescription` in that file, and the change will instantly propagate across the header, navigation, footer, metadata, RSS feed, and search index.

---

## Adding & Publishing Content

### Supported Frontmatter

Each Markdown file in `content/<category>/<slug>.md` supports the following YAML frontmatter:

```yaml
---
title: "Article Title"              # Required: Displayed prominently
description: "A concise summary"    # Optional: Displayed in listings and SEO meta
date: "2026-10-22"                  # Optional: YYYY-MM-DD (determines sort order)
tags:                               # Optional: List of capsule tags
  - Linux
  - Docker
draft: false                        # Optional: true excludes the article from production builds
---
```

### URL Routing Rules

The folder name defines the category, and the filename defines the URL slug:

| File Location | Public Static URL |
| :--- | :--- |
| `content/case-study/chronicle.md` | `/case-study/chronicle` |
| `content/blogs/docker-networking.md` | `/blogs/docker-networking` |
| `content/thoughts/boring.md` | `/thoughts/boring` |

- **Drafts**: Setting `draft: true` keeps the article visible only during local `npm run dev` development; it is completely stripped from production builds, `/search.json`, `/rss.xml`, and the sitemap.
- **Auto-Discovery**: Any new file added to `content/<category>/` will automatically generate its static route and appear in category listings on the next build.

---

## Local Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build static production output
npm run build

# 4. Preview production static build locally
npm run preview
```

Static HTML files are generated into the `dist/` directory.

---

## Cloudflare Pages Deployment Guide

### Prerequisites
- Node.js runtime version $\ge$ 18 (Node 20 or 22 recommended).
- A GitHub repository connected to Cloudflare Pages.

### Step 1: Push Code to GitHub
```bash
git init -b main
git add .
git commit -m "feat: initial static publishing website"
git remote add origin git@github.com:<username>/mrtuxcoder-writes.git
git push -u origin main
```

### Step 2: Configure Cloudflare Pages
1. Go to the **Cloudflare Dashboard** $\rightarrow$ **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
2. Select the `mrtuxcoder-writes` repository.
3. Configure build settings:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `NODE_VERSION`: `22`
4. Click **Save and Deploy**.

### Step 3: Custom Domain Setup (`notes.guganraj.me`)
1. In Cloudflare Pages, navigate to **Custom Domains** $\rightarrow$ **Set up a custom domain**.
2. Enter: `notes.guganraj.me`.
3. If `guganraj.me` is managed on Cloudflare DNS, Cloudflare will automatically configure the CNAME record. If managed externally, create a CNAME record:
   - **Name**: `notes`
   - **Target**: `<your-project>.pages.dev`
   - **Proxy status**: Proxied (or DNS only as preferred)
