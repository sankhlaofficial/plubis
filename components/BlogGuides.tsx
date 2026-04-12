import Link from 'next/link';
import PillLabel from '@/components/PillLabel';
import Button from '@/components/Button';
import DecorativeShape from '@/components/DecorativeShape';

/**
 * Curated set of emotional situations to highlight on the landing page.
 * Ordered by urgency/search intent — the situations parents are most
 * likely to search for late at night.
 */
const FEATURED_SITUATIONS = [
  { slug: 'new-sibling', label: 'New baby sibling', emoji: '👶' },
  { slug: 'grief-pet', label: 'Loss of a pet', emoji: '🐾' },
  { slug: 'divorce', label: 'Divorce', emoji: '💔' },
  { slug: 'nightmares', label: 'Fear of the dark', emoji: '🌙' },
  { slug: 'first-day-school', label: 'First day of school', emoji: '🎒' },
  { slug: 'big-feelings', label: 'Big feelings', emoji: '😤' },
  { slug: 'moving', label: 'Moving house', emoji: '📦' },
  { slug: 'grief-grandparent', label: 'Losing a grandparent', emoji: '🕊️' },
  { slug: 'tantrums', label: 'Tantrums', emoji: '🌪️' },
  { slug: 'parent-travel', label: 'Parent going away', emoji: '✈️' },
  { slug: 'doctor-visit', label: 'Doctor visits', emoji: '🩺' },
  { slug: 'making-friends', label: 'Making friends', emoji: '🤝' },
];

export default function BlogGuides() {
  return (
    <section className="bg-cream relative overflow-hidden">
      <DecorativeShape kind="sparkle" size={28} className="absolute top-8 left-[8%] animate-twinkle" />
      <DecorativeShape kind="star" size={22} className="absolute bottom-12 right-[12%] animate-twinkle" />

      <div className="container-prose section relative z-10">
        <div className="text-center mb-10">
          <PillLabel color="mint" className="mb-4">Free guides</PillLabel>
          <h2 className="text-3xl md:text-5xl mb-4">
            Guides for every hard moment.
          </h2>
          <p className="text-ink-soft max-w-xl mx-auto text-lg">
            125 picture-book guides for parents — one for every age and every
            situation. Real book picks. Honest advice. No fluff.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {FEATURED_SITUATIONS.map((s) => (
            <Link
              key={s.slug}
              href={`/blog/picture-books-for-3-year-old-about-${s.slug}`}
              className="flex items-center gap-2 rounded-2xl border-2 border-outline bg-white px-4 py-3 text-sm font-medium text-ink hover:bg-sun hover:border-outline transition shadow-[0_2px_0_0_#0F172A]"
            >
              <span className="text-lg" aria-hidden="true">{s.emoji}</span>
              <span>{s.label}</span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button href="/blog" variant="secondary" size="md">
            Browse all 125 guides
          </Button>
        </div>
      </div>
    </section>
  );
}
