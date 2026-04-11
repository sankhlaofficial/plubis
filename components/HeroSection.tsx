import Button from '@/components/Button';
import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';
import BookMockup from '@/components/BookMockup';

export default function HeroSection() {
  return (
    <section className="relative bg-sun overflow-hidden">
      {/* Decorative shapes */}
      <DecorativeShape kind="cloud" size={80} className="absolute top-10 left-[6%] animate-float-slow" />
      <DecorativeShape kind="airplane" size={56} className="absolute top-24 right-[8%] animate-wobble" />
      <DecorativeShape kind="star" size={32} className="absolute top-[40%] left-[12%] animate-twinkle" />
      <DecorativeShape kind="sparkle" size={28} className="absolute bottom-[20%] right-[14%] animate-twinkle" />
      <DecorativeShape kind="star" size={24} className="absolute bottom-[15%] left-[18%] animate-twinkle" />

      <div className="container-prose section relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left column — text + CTAs */}
          <div className="space-y-6">
            <PillLabel color="cream">A bedtime story in 5 minutes</PillLabel>
            <h1 className="text-5xl md:text-7xl leading-[0.95]">
              Tonight&apos;s story is
              <br />
              <span className="italic">already written.</span>
            </h1>
            <p className="text-lg md:text-xl text-ink-soft max-w-md">
              Type a topic. We write, illustrate, and print it. Your child is the hero of a picture book in the time it takes to brush teeth.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/login" variant="primary" size="lg">Make a book — $5</Button>
              <Button href="#how-it-works" variant="secondary" size="lg">See how it works</Button>
            </div>
            <p className="text-xs text-ink-soft pt-2">One credit = one full picture book (PDF + EPUB).</p>
          </div>

          {/* Right column — Book mockup */}
          <div className="flex justify-center md:justify-end">
            <BookMockup coverSrc="/showcase-cover.jpg" title="Luna's Little Song" />
          </div>
        </div>
      </div>
    </section>
  );
}
