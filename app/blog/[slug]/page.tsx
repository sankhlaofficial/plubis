import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import PillLabel from '@/components/PillLabel';
import { getAllArticles, getArticleBySlug } from '@/lib/blog/data';
import { renderMarkdown } from '@/lib/blog/markdown';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Tell Next.js to pre-render every article as a static page at build time.
// Empty array today (generator hasn't run) → no dynamic pages generated.
// After the generator runs and content/blog.json is populated, Vercel's next
// build will produce 125 static /blog/{slug}/page.html files.
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

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  // Deep-link the "Make a book" CTA into /new with the picker situation
  // pre-selected if this article maps to a picker-compatible situation.
  const ctaHref = article.pickerSlug
    ? `/new?situation=${encodeURIComponent(article.pickerSlug)}`
    : '/new';

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1">
        <article className="section">
          <div className="container-prose px-6 py-12 sm:py-16 max-w-2xl mx-auto">
            <Link
              href="/blog"
              className="text-sm text-ink-soft hover:text-ink underline decoration-outline/30 underline-offset-4"
            >
              ← All guides
            </Link>

            <div className="mt-6">
              <PillLabel color="mint">For {article.age}-year-olds</PillLabel>
            </div>

            <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-[1.15]">
              {article.title}
            </h1>

            <p className="mt-6 text-base text-ink-soft leading-relaxed">
              {article.metaDescription}
            </p>

            <div className="mt-2">
              {renderMarkdown(article.body)}
            </div>

            {/* Bottom CTA — every article funnels into /new */}
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
