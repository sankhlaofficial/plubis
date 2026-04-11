import Button from '@/components/Button';
import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';

const features = [
  '12-16 illustrated pages',
  'KDP-ready PDF (8.5 × 8.5 in)',
  'Kindle-compatible EPUB',
  'Yours forever — download anytime',
];

function Check() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#FFCC4D" stroke="#0F172A" strokeWidth="2" />
      <path d="M7 12.5L10.5 16L17 9" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WhatYouGet() {
  return (
    <section className="bg-mint relative overflow-hidden">
      <DecorativeShape kind="sparkle" size={40} className="absolute top-10 right-[10%] animate-twinkle" />
      <DecorativeShape kind="heart" size={32} className="absolute bottom-10 left-[8%] animate-float-slow" />

      <div className="container-prose section relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <PillLabel color="cream" className="mb-4">What you get</PillLabel>
            <h2 className="text-4xl md:text-6xl mb-4">One credit.<br />One full book.</h2>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-6xl md:text-7xl font-display font-bold text-outline">$5</span>
              <span className="text-ink-soft text-lg">per book</span>
            </div>
            <p className="text-ink-soft max-w-md">Pay once, download forever. No subscription. No hidden costs.</p>
          </div>

          <div className="bg-white rounded-[28px] border-2 border-outline p-8 md:p-10 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <ul className="space-y-4 mb-6">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <Check />
                  <span className="text-base md:text-lg">{f}</span>
                </li>
              ))}
            </ul>
            <Button href="/login" variant="primary" size="lg" fullWidth>
              Make a book — $5
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
