import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  tone?: 'ink' | 'cream';
}

const sizeMap = {
  sm: { text: 'text-xl', disc: 'w-7 h-7' },
  md: { text: 'text-2xl', disc: 'w-9 h-9' },
  lg: { text: 'text-4xl', disc: 'w-12 h-12' },
};

export default function Logo({ size = 'md', href = '/', tone = 'ink' }: LogoProps) {
  const { text, disc } = sizeMap[size];

  const content = (
    <span className="inline-flex items-center gap-2">
      {/* Yellow disc with moon + star glyph */}
      <span
        className={`${disc} rounded-full bg-sun flex items-center justify-center shrink-0`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[65%] h-[65%]"
        >
          {/* Crescent moon */}
          <path
            d="M20 8C16.686 8 14 10.686 14 14C14 17.314 16.686 20 20 20C18.343 20 17 18.657 17 17C17 15.343 18.343 14 20 14C21.657 14 23 15.343 23 17C23 20.314 20.314 23 17 23C13.686 23 11 20.314 11 17C11 13.686 13.686 11 17 11"
            stroke="#0F172A"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Small star */}
          <path
            d="M23 8L23.5 9.5L25 10L23.5 10.5L23 12L22.5 10.5L21 10L22.5 9.5L23 8Z"
            fill="#0F172A"
          />
        </svg>
      </span>
      {/* Wordmark */}
      <span
        className={`font-display font-semibold ${text} ${
          tone === 'cream' ? 'text-cream' : 'text-ink'
        }`}
      >
        {BRAND_NAME}
      </span>
    </span>
  );

  if (href === null || href === undefined) {
    return <span>{content}</span>;
  }

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
