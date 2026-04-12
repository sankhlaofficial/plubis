import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import PillLabel from '@/components/PillLabel';

export const metadata: Metadata = {
  title: 'About — Plubis',
  description:
    'Plubis makes picture books for the hard conversations — new sibling, first day of school, grief, big feelings. Generated in 5 minutes. The first one is free.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="section">
          <div className="container-prose text-center px-6 py-16 sm:py-24 max-w-3xl mx-auto">
            <PillLabel>Our story</PillLabel>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-bold text-ink leading-[1.1]">
              A book for the hard things to explain.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed">
              Plubis makes picture books for the moments no parent has the
              perfect words for. A new sibling arriving. A first day of school.
              A pet who isn&rsquo;t coming back. A parent moving out. A big
              feeling the child can&rsquo;t name yet.
            </p>
          </div>
        </section>

        {/* The why */}
        <section className="section bg-cream-200 border-y-2 border-outline">
          <div className="container-prose px-6 py-16 max-w-2xl mx-auto space-y-6">
            <PillLabel color="mint">Why we built this</PillLabel>
            <h2 className="font-display text-3xl font-bold text-ink">
              Every child has a hard moment. Most of them don&rsquo;t have a
              book for it.
            </h2>
            <p className="text-base text-ink-soft leading-relaxed">
              Pediatricians, school counselors, and child therapists have been
              recommending specific picture books for specific situations for
              decades. It&rsquo;s called bibliotherapy, and it works. The
              problem is that the catalog is tiny, the right book for any one
              child is usually almost-right at best, and a parent at 10 p.m. on
              a Tuesday isn&rsquo;t going to drive to a library.
            </p>
            <p className="text-base text-ink-soft leading-relaxed">
              So we built a different answer. You pick the situation, you tell
              us your child&rsquo;s name, and in about five minutes we generate
              a picture book made for them — the protagonist, the feelings, the
              dedication page. Not a template, not a library pull. A book that
              didn&rsquo;t exist until your child needed it.
            </p>
          </div>
        </section>

        {/* What this is, and isn't */}
        <section className="section">
          <div className="container-prose px-6 py-16 max-w-3xl mx-auto">
            <PillLabel color="peach">What Plubis is</PillLabel>
            <h2 className="mt-6 font-display text-3xl font-bold text-ink">
              A conversation starter, not a replacement for one.
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="dashed-card p-6">
                <h3 className="font-display text-lg font-semibold text-ink mb-2">
                  Plubis is
                </h3>
                <ul className="text-sm text-ink-soft space-y-2">
                  <li>&middot; A picture book for a specific hard moment</li>
                  <li>&middot; Made in about five minutes</li>
                  <li>&middot; Personalized with your child&rsquo;s name</li>
                  <li>&middot; Yours forever as PDF and EPUB</li>
                  <li>&middot; Free for the first book</li>
                </ul>
              </div>
              <div className="dashed-card p-6">
                <h3 className="font-display text-lg font-semibold text-ink mb-2">
                  Plubis is not
                </h3>
                <ul className="text-sm text-ink-soft space-y-2">
                  <li>&middot; Therapy, treatment, or medical advice</li>
                  <li>&middot; A replacement for a pediatrician, counselor, or therapist</li>
                  <li>&middot; A promise that the hard thing will stop being hard</li>
                  <li>&middot; A substitute for the conversation you&rsquo;ll have</li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-xs text-ink-soft italic">
              If your child is struggling with a mental health concern, please
              talk to a qualified professional. A picture book is a wonderful
              opening move, not the whole game.
            </p>
          </div>
        </section>

        {/* How the story gets made */}
        <section className="section bg-cream-200 border-y-2 border-outline">
          <div className="container-prose px-6 py-16 max-w-3xl mx-auto">
            <PillLabel color="sky">How a book gets made</PillLabel>
            <h2 className="mt-6 font-display text-3xl font-bold text-ink">
              Four things happen in about five minutes.
            </h2>
            <ol className="mt-8 space-y-6">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-sun border-2 border-outline flex items-center justify-center font-display font-bold text-lg">
                  1
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    You tell us what&rsquo;s going on.
                  </h3>
                  <p className="text-sm text-ink-soft mt-1">
                    The child&rsquo;s name, the kind of story you want, and the
                    situation (or nothing in particular — a cozy story is a
                    valid answer).
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blossom border-2 border-outline flex items-center justify-center font-display font-bold text-lg">
                  2
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    We shape the story around the feeling.
                  </h3>
                  <p className="text-sm text-ink-soft mt-1">
                    Each situation has a carefully written framing — rules
                    about naming the feeling honestly, leaving room for the
                    hard part, and landing on &ldquo;you are loved through
                    this.&rdquo; Not &ldquo;everything will be fine.&rdquo;
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-mint border-2 border-outline flex items-center justify-center font-display font-bold text-lg">
                  3
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    The illustrations get drawn.
                  </h3>
                  <p className="text-sm text-ink-soft mt-1">
                    Page by page, a consistent art style carried through the
                    whole book. No stock art. Every picture is made for this
                    book.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-peach border-2 border-outline flex items-center justify-center font-display font-bold text-lg">
                  4
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    You get the book.
                  </h3>
                  <p className="text-sm text-ink-soft mt-1">
                    PDF and EPUB, both yours to keep. Read it on a tablet, read
                    it on paper if you print it, read it at bedtime. The
                    dedication page is a little surprise we leave inside.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="container-prose px-6 py-16 sm:py-24 max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink">
              Your first book is on us.
            </h2>
            <p className="mt-4 text-base text-ink-soft">
              No payment, no trial. Tell us who it&rsquo;s for, what&rsquo;s
              going on, and we&rsquo;ll make it in about five minutes.
            </p>
            <div className="mt-8">
              <Button href="/new" variant="primary" size="lg">
                Make a book
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
