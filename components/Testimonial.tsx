import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';

export default function Testimonial() {
  return (
    <section className="bg-cream relative overflow-hidden">
      <DecorativeShape kind="sparkle" size={24} className="absolute top-10 right-[15%] animate-twinkle" />
      <DecorativeShape kind="star" size={20} className="absolute bottom-10 left-[12%] animate-twinkle" />

      <div className="container-prose section relative z-10 text-center">
        <PillLabel color="pink" className="mb-6">Why we built this</PillLabel>

        <div className="relative max-w-2xl mx-auto">
          <div className="rounded-[32px] bg-white border-2 border-outline p-10 md:p-12 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <p className="text-xl md:text-2xl leading-relaxed font-display italic text-ink">
              &ldquo;I made my son&apos;s first bedtime book the night he was born. It&apos;s now on Amazon KDP. Built this so other dads could do the same.&rdquo;
            </p>
          </div>
          {/* Speech bubble tail */}
          <svg
            width="32"
            height="24"
            viewBox="0 0 32 24"
            className="absolute left-1/2 -translate-x-1/2 -bottom-5"
            aria-hidden="true"
          >
            <path d="M0 0 L32 0 L16 24 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
          </svg>
        </div>

        {/* Avatar + name */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-sun border-2 border-outline flex items-center justify-center font-display font-bold text-2xl">
            A
          </div>
          <div className="text-left">
            <div className="font-medium text-ink">Aditya</div>
            <div className="text-xs text-ink-soft">New dad, CTO, built Plubis</div>
          </div>
        </div>
      </div>
    </section>
  );
}
