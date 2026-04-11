type Phase =
  | 'starting'
  | 'researching'
  | 'writing'
  | 'drafting-images'
  | 'generating-images'
  | 'building-pdf'
  | 'building-epub'
  | 'done'
  | 'failed'
  | string
  | undefined;

export default function JobPhaseAnimation({ phase, size = 160 }: { phase: Phase; size?: number }) {
  let bucket: 'moon' | 'quill' | 'palette' | 'easel' | 'book' | 'broken' = 'moon';
  let animClass = 'animate-pulse-soft';

  if (phase === 'researching' || phase === 'writing') {
    bucket = 'quill';
    animClass = 'animate-wobble';
  } else if (phase === 'drafting-images') {
    bucket = 'palette';
    animClass = 'animate-float-slow';
  } else if (phase === 'generating-images') {
    bucket = 'easel';
    animClass = 'animate-wobble';
  } else if (phase === 'building-pdf' || phase === 'building-epub') {
    bucket = 'book';
    animClass = 'animate-float-slow';
  } else if (phase === 'failed') {
    bucket = 'broken';
    animClass = '';
  }

  return (
    <div className={`inline-block ${animClass}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden="true">
        {bucket === 'moon' && <MoonGlyph />}
        {bucket === 'quill' && <QuillGlyph />}
        {bucket === 'palette' && <PaletteGlyph />}
        {bucket === 'easel' && <EaselGlyph />}
        {bucket === 'book' && <BookGlyph />}
        {bucket === 'broken' && <BrokenGlyph />}
      </svg>
    </div>
  );
}

function MoonGlyph() {
  return (
    <g>
      <circle cx="80" cy="80" r="56" fill="#FFCC4D" stroke="#0F172A" strokeWidth="3" />
      <path d="M90 50 a40 40 0 0 0 0 60 a50 50 0 1 1 0 -60z" fill="#FBF8F1" stroke="#0F172A" strokeWidth="3" />
      <circle cx="60" cy="70" r="3" fill="#0F172A" />
      <circle cx="55" cy="95" r="3" fill="#0F172A" />
      <path d="M55 108 Q60 112 65 108" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function QuillGlyph() {
  return (
    <g>
      <rect x="40" y="30" width="80" height="100" rx="6" fill="#FBF8F1" stroke="#0F172A" strokeWidth="3" />
      <line x1="55" y1="55" x2="100" y2="55" stroke="#0F172A" strokeWidth="2" />
      <line x1="55" y1="70" x2="105" y2="70" stroke="#0F172A" strokeWidth="2" />
      <line x1="55" y1="85" x2="95" y2="85" stroke="#0F172A" strokeWidth="2" />
      <line x1="55" y1="100" x2="100" y2="100" stroke="#0F172A" strokeWidth="2" />
      {/* Quill */}
      <path d="M110 20 L135 45 L120 60 L95 35 Z" fill="#FFCC4D" stroke="#0F172A" strokeWidth="3" />
      <line x1="120" y1="60" x2="95" y2="85" stroke="#0F172A" strokeWidth="3" />
    </g>
  );
}

function PaletteGlyph() {
  return (
    <g>
      <ellipse cx="80" cy="85" rx="55" ry="45" fill="#FCE4EC" stroke="#0F172A" strokeWidth="3" />
      <circle cx="60" cy="70" r="8" fill="#FFCC4D" stroke="#0F172A" strokeWidth="2" />
      <circle cx="85" cy="62" r="8" fill="#D4F0E0" stroke="#0F172A" strokeWidth="2" />
      <circle cx="105" cy="78" r="8" fill="#D6EFFA" stroke="#0F172A" strokeWidth="2" />
      <circle cx="100" cy="100" r="8" fill="#FFD9C4" stroke="#0F172A" strokeWidth="2" />
      <circle cx="65" cy="98" r="8" fill="#FCE4EC" stroke="#0F172A" strokeWidth="2" />
    </g>
  );
}

function EaselGlyph() {
  return (
    <g>
      <rect x="40" y="30" width="80" height="70" rx="4" fill="#FBF8F1" stroke="#0F172A" strokeWidth="3" />
      <circle cx="70" cy="60" r="8" fill="#FFCC4D" stroke="#0F172A" strokeWidth="2" />
      <path d="M50 85 Q80 65 110 85" stroke="#0F172A" strokeWidth="2" fill="none" />
      <line x1="60" y1="100" x2="40" y2="140" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      <line x1="100" y1="100" x2="120" y2="140" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      <line x1="80" y1="100" x2="80" y2="140" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function BookGlyph() {
  return (
    <g>
      <rect x="35" y="40" width="90" height="80" rx="4" fill="#FFCC4D" stroke="#0F172A" strokeWidth="3" />
      <line x1="80" y1="40" x2="80" y2="120" stroke="#0F172A" strokeWidth="2" />
      <line x1="48" y1="60" x2="72" y2="60" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="48" y1="75" x2="72" y2="75" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="48" y1="90" x2="72" y2="90" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="88" y1="60" x2="112" y2="60" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="88" y1="75" x2="112" y2="75" stroke="#0F172A" strokeWidth="1.5" />
      <line x1="88" y1="90" x2="112" y2="90" stroke="#0F172A" strokeWidth="1.5" />
    </g>
  );
}

function BrokenGlyph() {
  return (
    <g>
      <path d="M80 120 C40 100 30 70 45 55 C55 45 72 48 80 62 C88 48 105 45 115 55 C130 70 120 100 80 120 Z" fill="#FCE4EC" stroke="#0F172A" strokeWidth="3" />
      <path d="M80 62 L75 85 L85 85 L78 115" stroke="#0F172A" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}
