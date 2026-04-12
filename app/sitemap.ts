import type { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/blog/data';

/**
 * Next.js App Router sitemap generator. Emitted at /sitemap.xml.
 *
 * Includes:
 *   - Marketing pages (/, /about, /pricing, /blog, /login)
 *   - Every generated blog article at /blog/{slug}
 *
 * Skips authenticated-only pages (/library, /new, /job/[id]) — those are
 * intentionally not in the sitemap because they require a signed-in user
 * and are behind a client-side guard.
 *
 * Submit this to Google Search Console once the custom domain is live:
 *   https://search.google.com/search-console → property → Sitemaps → submit `sitemap.xml`
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_DOMAIN?.startsWith('http')
    ? process.env.NEXT_PUBLIC_DOMAIN
    : `https://${process.env.NEXT_PUBLIC_DOMAIN || 'plubis.vercel.app'}`;

  const now = new Date();

  const marketingPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const articles = getAllArticles();
  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: new Date(a.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...marketingPages, ...articlePages];
}
