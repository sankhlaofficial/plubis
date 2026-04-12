/**
 * Blog article data loader — reads the generator output from
 * content/blog.json and exposes type-safe accessors used by the index page,
 * the dynamic route, and the sitemap.
 *
 * The import is a JSON module so Next.js statically bundles the articles at
 * build time. Re-running the generator script produces a new JSON file;
 * a subsequent Vercel deploy picks it up without any runtime file reads.
 */

import type { BlogArticle } from './types';
import rawArticles from '@/content/blog.json';

// The JSON module is `unknown`-shaped from TypeScript's perspective; we cast
// after a light sanity check. Malformed articles are filtered so a bad entry
// can't crash the whole build.
const articles: BlogArticle[] = (rawArticles as unknown as BlogArticle[]).filter(
  (a) =>
    a &&
    typeof a.slug === 'string' &&
    typeof a.title === 'string' &&
    typeof a.body === 'string',
);

export function getAllArticles(): BlogArticle[] {
  return articles;
}

export function getArticleBySlug(slug: string): BlogArticle | null {
  return articles.find((a) => a.slug === slug) ?? null;
}

export function getArticleSlugs(): string[] {
  return articles.map((a) => a.slug);
}

/** Group articles by situation for the index page. */
export function getArticlesBySituation(): Record<string, BlogArticle[]> {
  const groups: Record<string, BlogArticle[]> = {};
  for (const a of articles) {
    (groups[a.situationSlug] ||= []).push(a);
  }
  // Sort each group by age ascending so 2-year-old comes before 6-year-old.
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.age - b.age);
  }
  return groups;
}
