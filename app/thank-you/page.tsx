import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Thanks for your purchase — ${BRAND_NAME}`,
};

export default function ThankYouPage() {
  const tweetText = encodeURIComponent(
    `Just made a custom picture book for my kid on @plubis_app — a book for the hard things to explain. First one is free.`,
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <section className="relative px-6 py-20 text-center max-w-xl mx-auto">
          <DecorativeShape kind="sparkle" size={28} className="absolute top-4 right-0 animate-twinkle" />
          <DecorativeShape kind="heart" size={24} className="absolute bottom-4 left-0 animate-float-slow" />

          <PillLabel color="mint" className="mb-6">Purchase complete</PillLabel>

          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight">
            You're all set.
          </h1>

          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            Your credits are ready. Go make something beautiful for your kid —
            pick a situation, type their name, and the book is yours in about
            five minutes.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/new" variant="primary" size="lg">
              Make a book now
            </Button>
            <Button href={tweetUrl} variant="secondary" size="lg" external>
              Share on X
            </Button>
          </div>

          <p className="mt-10 text-sm text-ink-soft">
            Love what you made? Tell a friend — every parent going through a
            hard moment could use a book like this.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
