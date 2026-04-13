import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import PillLabel from '@/components/PillLabel';
import { getAllArticles, getArticleBySlug } from '@/lib/blog/data';
import { renderMarkdown } from '@/lib/blog/markdown';
import { BRAND_NAME } from '@/lib/brand';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return { title: 'Guide not found — Plubis' };
  }
  return {
    title: `${article.title} — Plubis`,
    description: article.metaDescription,
  };
}

/** Extract book titles from markdown body. Matches **"Title" by Author** pattern. */
function extractBookTitles(body: string): string[] {
  const matches = body.matchAll(/\*\*"([^"]+)"\s+by\s+([^*]+)\*\*/g);
  const titles: string[] = [];
  for (const m of matches) {
    titles.push(`"${m[1]}" by ${m[2].trim()}`);
  }
  return titles;
}

/** Extract a short answer from the first paragraph after a ## heading. */
function extractFaqAnswer(body: string, headingPattern: RegExp): string {
  const match = body.match(headingPattern);
  if (!match) return '';
  const afterHeading = body.slice((match.index ?? 0) + match[0].length);
  const lines = afterHeading.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const firstPara = lines.slice(0, 3).join(' ').trim();
  return firstPara.slice(0, 300);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const ctaHref = article.pickerSlug
    ? `/new?situation=${encodeURIComponent(article.pickerSlug)}`
    : '/new';

  const baseUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN || 'plubis.vercel.app'}`;
  const articleUrl = `${baseUrl}/blog/${article.slug}`;
  const bookTitles = extractBookTitles(article.body);
  const datePublished = article.generatedAt;
  const dateModified = article.lastUpdated || article.generatedAt;

  // --- JSON-LD: Article schema ---
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    datePublished,
    dateModified,
    author: { '@type': 'Organization', name: BRAND_NAME, url: baseUrl },
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    image: `${baseUrl}/og-image.jpg`,
  };

  // --- JSON-LD: FAQPage schema ---
  const faqQuestions = [
    {
      q: `What picture books help a ${article.age}-year-old with ${article.situationLabel}?`,
      a: bookTitles.length > 0
        ? `Our top picks include ${bookTitles.slice(0, 4).join(', ')}. Each is age-appropriate for ${article.age}-year-olds dealing with ${article.situationKeyword}.`
        : article.metaDescription,
    },
    {
      q: `How do I read a book about ${article.situationKeyword} with my ${article.age}-year-old?`,
      a: extractFaqAnswer(article.body, /##\s*(How to|Reading|The conversation|reading)/i) ||
        `Read at calm moments, not during a crisis. Let your child point at faces, ask about feelings, and stop on pages that matter to them.`,
    },
    {
      q: `When should I get professional help instead of using a picture book?`,
      a: extractFaqAnswer(article.body, /##\s*(When a book|When it|When books)/i) ||
        `If your child shows persistent distress lasting more than a few weeks, talk to your pediatrician. Books are conversation starters, not a replacement for professional support.`,
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqQuestions.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  // --- JSON-LD: ItemList schema (book recommendations) ---
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best picture books for ${article.age}-year-olds about ${article.situationLabel}`,
    numberOfItems: bookTitles.length,
    itemListElement: bookTitles.slice(0, 10).map((title, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: title,
    })),
  };

  // Answer capsule — the AI-extractable summary at the top
  const topBooks = bookTitles.slice(0, 3);
  const answerCapsule = topBooks.length > 0
    ? `Our top picks: ${topBooks.map((t) => t.split(' by ')[0]).join(', ')}. Below: what to look for at age ${article.age}, how to read them together, and when a book isn't enough.`
    : null;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      {/* Triple JSON-LD for GEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main className="flex-1">
        <article className="section">
          <div className="container-prose px-6 py-12 sm:py-16 max-w-2xl mx-auto">
            <Link
              href="/blog"
              className="text-sm text-ink-soft hover:text-ink underline decoration-outline/30 underline-offset-4"
            >
              &larr; All guides
            </Link>

            <div className="mt-6">
              <PillLabel color="mint">For {article.age}-year-olds</PillLabel>
            </div>

            <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-[1.15]">
              {article.title}
            </h1>

            <p className="mt-3 text-sm text-ink-soft">
              Last updated {formatDate(dateModified)}
            </p>

            {/* Answer capsule — AI-extractable summary for GEO */}
            {answerCapsule && (
              <div className="mt-6 rounded-2xl border border-dashed border-outline/40 bg-mint/30 px-5 py-4 text-sm text-ink-soft leading-relaxed">
                <strong className="text-ink">Quick answer:</strong>{' '}
                {answerCapsule}
              </div>
            )}

            <p className="mt-6 text-base text-ink-soft leading-relaxed">
              {article.metaDescription}
            </p>

            <div className="mt-2">
              {renderMarkdown(article.body)}
            </div>

            {/* Bottom CTA */}
            <div className="mt-14 rounded-3xl border-2 border-outline bg-sun p-8 text-center shadow-[0_6px_0_0_#0F172A]">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                Or make a book that&rsquo;s just for your child.
              </h2>
              <p className="mt-3 text-base text-ink-soft">
                In about five minutes. With their name on it. Your first one
                is free.
              </p>
              <div className="mt-6">
                <Button href={ctaHref} variant="primary" size="lg">
                  Make my child&rsquo;s book
                </Button>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
