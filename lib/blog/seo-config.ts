/**
 * Programmatic SEO config — the static grid of 5 ages × 25 situations =
 * 125 articles the generator script will fill in. Each article targets a
 * specific long-tail keyword like "picture books for a 3-year-old about a
 * new sibling" — low commercial competition, urgent-intent parents, direct
 * path into Plubis via the CTA.
 *
 * 19 of the 25 situations match the NewBookForm picker slugs so the article
 * can deep-link into /new?topic=... and carry the situation all the way
 * through. The other 6 are broader everyday topics — sharing, bedtime,
 * making friends — that fish for wider parenting search traffic.
 */

import type { BlogArticleConfig } from './types';

const AGES = [2, 3, 4, 5, 6] as const;

interface SituationDef {
  slug: string;
  /** Natural-language label for title ("a new sibling", "the first day of school"). */
  label: string;
  /** Short keyword form for meta description ("new sibling", "first day of school"). */
  keyword: string;
  /** Picker slug from lib/situations.ts, or null if SEO-only. */
  pickerSlug: string | null;
}

const SITUATIONS: SituationDef[] = [
  // 19 picker-matched situations — highest conversion intent
  { slug: 'new-sibling', label: 'a new baby brother or sister', keyword: 'new sibling', pickerSlug: 'new-sibling' },
  { slug: 'first-day-school', label: 'the first day of school', keyword: 'first day of school', pickerSlug: 'first-day-school' },
  { slug: 'grief-pet', label: 'the loss of a pet', keyword: 'losing a pet', pickerSlug: 'grief-pet' },
  { slug: 'grief-grandparent', label: 'losing a grandparent', keyword: 'a grandparent dying', pickerSlug: 'grief-grandparent' },
  { slug: 'divorce', label: 'parents getting divorced', keyword: 'divorce', pickerSlug: 'divorce' },
  { slug: 'moving', label: 'moving to a new home', keyword: 'moving house', pickerSlug: 'moving' },
  { slug: 'nightmares', label: 'being afraid of the dark', keyword: 'nightmares and the dark', pickerSlug: 'nightmares' },
  { slug: 'doctor-visit', label: 'going to the doctor', keyword: 'doctor visits', pickerSlug: 'doctor-visit' },
  { slug: 'dentist-visit', label: 'going to the dentist', keyword: 'dentist visits', pickerSlug: 'dentist-visit' },
  { slug: 'potty-regression', label: 'potty training', keyword: 'potty training', pickerSlug: 'potty-regression' },
  { slug: 'parent-travel', label: 'a parent going away', keyword: 'a parent traveling', pickerSlug: 'parent-travel' },
  { slug: 'deployment', label: 'a parent being deployed', keyword: 'military deployment', pickerSlug: 'deployment' },
  { slug: 'big-feelings', label: 'big feelings', keyword: 'big feelings', pickerSlug: 'big-feelings' },
  { slug: 'tantrums', label: 'tantrums and meltdowns', keyword: 'tantrums', pickerSlug: 'tantrums' },
  { slug: 'new-pet', label: 'getting a new pet', keyword: 'a new pet', pickerSlug: 'new-pet' },
  { slug: 'lost-friend', label: 'a friend moving away', keyword: 'a friend moving away', pickerSlug: 'lost-friend' },
  { slug: 'new-school', label: 'starting at a new school', keyword: 'a new school', pickerSlug: 'new-school' },
  { slug: 'new-language', label: 'learning a new language', keyword: 'a new language', pickerSlug: 'new-language' },
  { slug: 'parent-illness', label: 'a parent being unwell', keyword: 'a parent being sick', pickerSlug: 'parent-illness' },

  // 6 SEO-only broader topics — cast a wider parenting-search net
  { slug: 'bedtime', label: 'bedtime', keyword: 'bedtime routines', pickerSlug: null },
  { slug: 'sharing', label: 'learning to share', keyword: 'sharing', pickerSlug: null },
  { slug: 'making-friends', label: 'making new friends', keyword: 'making friends', pickerSlug: null },
  { slug: 'confidence', label: 'building confidence', keyword: 'confidence and self-esteem', pickerSlug: null },
  { slug: 'picky-eating', label: 'trying new foods', keyword: 'picky eating', pickerSlug: null },
  { slug: 'independence', label: 'being more independent', keyword: 'independence and big-kid skills', pickerSlug: null },
];

/**
 * Cross-product of ages × situations. Deterministic order so the generator
 * script produces stable output and git diffs stay small.
 */
export const BLOG_ARTICLE_CONFIGS: BlogArticleConfig[] = AGES.flatMap((age) =>
  SITUATIONS.map((s) => ({
    slug: `picture-books-for-${age}-year-old-about-${s.slug}`,
    age,
    situationSlug: s.slug,
    situationLabel: s.label,
    situationKeyword: s.keyword,
    pickerSlug: s.pickerSlug,
    title: `The best picture books to read to a ${age}-year-old about ${s.label}`,
    metaDescription: `Picture books for ${age}-year-olds going through ${s.keyword}. Our picks plus how to make a custom one for your child in five minutes.`,
  })),
);

/** Lookup a blog article config by slug. */
export function getBlogArticleConfig(slug: string): BlogArticleConfig | null {
  return BLOG_ARTICLE_CONFIGS.find((c) => c.slug === slug) ?? null;
}
