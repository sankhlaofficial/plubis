import Link from 'next/link';
import Button from '@/components/Button';
import DecorativeShape from '@/components/DecorativeShape';

const EXAMPLE_TOPICS = [
  'a brave fox who learns to share',
  'a dragon afraid of the dark',
  'a moon that visits earth',
];

export default function EmptyLibrary() {
  return (
    <div className="relative rounded-[28px] bg-sun/50 border-2 border-outline p-12 md:p-16 text-center overflow-hidden">
      <DecorativeShape kind="cloud" size={56} className="absolute top-6 left-6 animate-float-slow" />
      <DecorativeShape kind="star" size={24} className="absolute top-10 right-10 animate-twinkle" />
      <DecorativeShape kind="balloon" size={48} className="absolute bottom-8 right-12 animate-float-slow" />
      <DecorativeShape kind="sparkle" size={28} className="absolute bottom-12 left-12 animate-twinkle" />

      <div className="relative z-10 max-w-md mx-auto">
        <h2 className="text-4xl md:text-5xl mb-3">Your first story is waiting.</h2>
        <p className="text-ink-soft mb-6">Pick a topic your child loves. We&apos;ll take care of the rest.</p>
        <Button href="/new" variant="primary" size="lg">Start a new book</Button>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-ink-soft mb-3">Or try one of these</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_TOPICS.map((t) => (
              <Link
                key={t}
                href={`/new?topic=${encodeURIComponent(t)}`}
                className="inline-block rounded-full bg-white border-2 border-outline px-4 py-2 text-sm hover:bg-cream-200 transition"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
