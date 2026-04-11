import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';

const spreads = [
  { src: '/showcase-page-1.jpg', alt: 'Luna on a cloud' },
  { src: '/showcase-page-2.jpg', alt: 'Luna handing a star to a sleeping child' },
  { src: '/showcase-page-3.jpg', alt: 'Luna flying back into the sky' },
];

export default function ExampleBook() {
  return (
    <section className="bg-blossom relative overflow-hidden">
      <DecorativeShape kind="star" size={28} className="absolute top-10 left-[10%] animate-twinkle" />
      <DecorativeShape kind="cloud" size={64} className="absolute top-6 right-[12%] animate-float-slow" />
      <DecorativeShape kind="sparkle" size={32} className="absolute bottom-[15%] right-[8%] animate-twinkle" />

      <div className="container-prose section relative z-10 text-center">
        <PillLabel color="yellow" className="mb-4">An example</PillLabel>
        <h2 className="text-4xl md:text-6xl mb-4">Luna and the Little Song</h2>
        <p className="text-ink-soft text-lg max-w-2xl mx-auto mb-14">
          A crescent moon, a sleeping child, a tiny star. This book was made with Plubis in about 4 minutes.
        </p>

        {/* Shelf layout: big cover + 3 spreads */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="col-span-2 md:col-span-1 aspect-[3/4] rounded-[20px] bg-white border-2 border-outline overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/showcase-cover.jpg" alt="Luna's Little Song cover" className="w-full h-full object-cover" />
          </div>
          {spreads.map((s, i) => (
            <div
              key={s.src}
              className="aspect-[3/4] rounded-[20px] bg-white border-2 border-outline overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
              style={{ transform: `rotate(${i === 0 ? -1 : i === 1 ? 1 : -1.5}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
