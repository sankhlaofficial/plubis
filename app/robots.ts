import type { MetadataRoute } from 'next';

/**
 * Next.js App Router robots.txt generator. Emitted at /robots.txt.
 *
 * Permissive for search engines on marketing pages and blog guides. Blocks
 * authenticated areas (/library, /new, /job) and the API surface — those
 * are either behind auth or return JSON and have no SEO value.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_DOMAIN?.startsWith('http')
    ? process.env.NEXT_PUBLIC_DOMAIN
    : `https://${process.env.NEXT_PUBLIC_DOMAIN || 'plubis.vercel.app'}`;

  return {
    rules: [
      // Default rule for all crawlers
      {
        userAgent: '*',
        allow: ['/', '/about', '/pricing', '/blog', '/login'],
        disallow: ['/api/', '/library', '/new', '/job/'],
      },
      // Allow AI retrieval bots (so content gets cited in AI answers)
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/about', '/pricing', '/blog'],
        disallow: ['/api/', '/library', '/new', '/job/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/about', '/pricing', '/blog'],
        disallow: ['/api/', '/library', '/new', '/job/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/about', '/pricing', '/blog'],
        disallow: ['/api/', '/library', '/new', '/job/'],
      },
      // Block AI training bots (no benefit — just feeds competitor models)
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'Google-Extended',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
