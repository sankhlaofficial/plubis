interface BookMockupProps {
  coverSrc: string;
  title: string;
  className?: string;
}

export default function BookMockup({ coverSrc, title, className }: BookMockupProps) {
  return (
    <div
      className={`relative mx-auto ${className || ''}`}
      style={{ perspective: '1200px' }}
    >
      <div
        className="relative"
        style={{
          transform: 'rotateY(-22deg) rotateX(4deg)',
          transformStyle: 'preserve-3d',
          width: '280px',
          height: '360px',
        }}
      >
        {/* Page edge stripe (right side) */}
        <div
          className="absolute top-2 bottom-2"
          style={{
            right: '-6px',
            width: '6px',
            background: 'linear-gradient(90deg, #E8DCC4, #F5EFE1)',
            borderRadius: '0 4px 4px 0',
            transform: 'translateZ(-3px)',
          }}
        />
        {/* Cover */}
        <div
          className="absolute inset-0 rounded-sm border-2 border-outline overflow-hidden"
          style={{
            boxShadow:
              '0 30px 60px rgba(15,23,42,0.25), 0 10px 20px rgba(15,23,42,0.15)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc} alt={title} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
