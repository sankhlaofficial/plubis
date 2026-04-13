/**
 * Blog article types — shared by the generator script, the blog data loader,
 * the dynamic route, the index page, and the sitemap.
 */

export interface BlogArticleConfig {
  /** URL-safe slug — 'picture-books-for-3-year-old-about-new-sibling' */
  slug: string;
  /** The age this article targets (2-6). */
  age: number;
  /** Situation slug shared with lib/situations.ts picker where possible. */
  situationSlug: string;
  /** Natural-language label for the situation, used in the title. */
  situationLabel: string;
  /** Short keyword form used in meta description. */
  situationKeyword: string;
  /** If this situation exists in the NewBookForm picker, the picker slug. */
  pickerSlug: string | null;
  /** Full article title, used as H1 and <title>. */
  title: string;
  /** Meta description, ~150 chars, used in <meta name="description">. */
  metaDescription: string;
}

/**
 * A generated article — the result of running the generator script against
 * a BlogArticleConfig. The body is a markdown string that gets rendered by
 * lib/blog/markdown.tsx.
 */
export interface BlogArticle extends BlogArticleConfig {
  /** ISO timestamp of when this article was generated. */
  generatedAt: string;
  /** ISO timestamp of the last content update (for freshness signals). */
  lastUpdated?: string;
  /** Raw markdown body — ~1500 words, includes headings and lists. */
  body: string;
}
