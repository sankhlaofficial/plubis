import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PillLabel from '@/components/PillLabel';
import Button from '@/components/Button';
import { getAllArticles, getArticlesBySituation } from '@/lib/blog/data';
import { BLOG_ARTICLE_CONFIGS } from '@/lib/blog/seo-config';

export const metadata: Metadata = {
  title: 'Picture book guides for parents — Plubis',
  description:
    "Guides to picture books for the hard moments — new siblings, grief, first day of school, big feelings. And how to make a custom book for your child in 5 minutes.",
};

// Capitalize the first letter of each word in a situation label for display.
function titleCaseLabel(label: string): string {
  return label
    .split(' ')
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function BlogIndexPage() {
  const articles = getAllArticles();
  const grouped = getArticlesBySituation();
  const totalArticles = articles.length;
  const totalPlanned = BLOG_ARTICLE_CONFIGS.length;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="section">
          <div className="container-prose px-6 py-16 sm:py-20 max-w-3xl mx-auto text-center">
            <PillLabel color="mint">Parent guides</PillLabel>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl font-bold text-ink leading-[1.1]">
              Picture book guides for the moments no parent has the words for.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed">
              Our picks for published picture books, grouped by age and
              situation. And at the end of every guide, a way to make a
              custom book for your own child in about five minutes — the
              first one is free.
            </p>
          </div>
        </section>

        {totalArticles === 0 && (
          <section className="section bg-cream-200 border-y-2 border-outline">
            <div className="container-prose px-6 py-16 max-w-xl mx-auto text-center space-y-5">
              <h2 className="font-display text-2xl font-bold text-ink">
                Guides are coming soon.
              </h2>
              <p className="text-base text-ink-soft">
                We're drafting {totalPlanned} guides — one for every age and
                every hard moment. While you wait, your first book is free.
              </p>
              <div className="pt-2">
                <Button href="/new" variant="primary" size="lg">
                  Make a book for your child
                </Button>
              </div>
            </div>
          </section>
        )}

        {totalArticles > 0 && (
          <section className="section">
            <div className="container-prose px-6 py-12 max-w-4xl mx-auto space-y-12">
              {Object.entries(grouped).map(([situationSlug, group]) => {
                const label = group[0].situationLabel;
                return (
                  <div key={situationSlug}>
                    <h2 className="font-display text-2xl font-bold text-ink mb-4">
                      {titleCaseLabel(label)}
                    </h2>
                    <ul className="space-y-3">
                      {group.map((a) => (
                        <li key={a.slug}>
                          <Link
                            href={`/blog/${a.slug}`}
                            className="block rounded-2xl border-2 border-outline bg-cream-200 px-5 py-4 hover:bg-sun transition"
                          >
                            <span className="font-display text-lg text-ink">
                              {a.title}
                            </span>
                            <span className="block text-sm text-ink-soft mt-1">
                              {a.metaDescription}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
