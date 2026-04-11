import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';

const steps = [
  {
    num: '01',
    title: 'Type a topic',
    body: 'Pick a theme your child loves. A brave fox, a dragon, the moon — anything.',
    shape: 'cloud' as const,
  },
  {
    num: '02',
    title: 'We write and illustrate',
    body: 'Our AI writes the story and paints every page in soft watercolor style.',
    shape: 'balloon' as const,
  },
  {
    num: '03',
    title: 'Download and read',
    body: 'KDP-ready PDF + Kindle EPUB, delivered in about 5 minutes.',
    shape: 'book-stack' as const,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream">
      <div className="container-prose section text-center">
        <PillLabel color="mint" className="mb-4">How it works</PillLabel>
        <h2 className="text-4xl md:text-5xl mb-4 max-w-2xl mx-auto">Three taps from a blank page to a bedtime story.</h2>
        <p className="text-ink-soft text-lg max-w-2xl mx-auto mb-14">
          No design skills. No waiting. Just a story your child asks for twice.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s) => (
            <div
              key={s.num}
              className="rounded-[28px] bg-white border-2 border-outline shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-8 text-left"
            >
              <DecorativeShape kind={s.shape} size={56} className="mb-4" />
              <div className="text-xs font-semibold tracking-widest text-ink-soft mb-2">{s.num}</div>
              <h3 className="text-2xl mb-3">{s.title}</h3>
              <p className="text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
