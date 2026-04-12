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
      {
        userAgent: '*',
        allow: ['/', '/about', '/pricing', '/blog', '/login'],
        disallow: ['/api/', '/library', '/new', '/job/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
