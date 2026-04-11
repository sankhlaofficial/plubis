import React from 'react';

interface PillLabelProps {
  color?: 'yellow' | 'pink' | 'mint' | 'sky' | 'peach' | 'cream';
  children: React.ReactNode;
  className?: string;
}

const colorMap: Record<string, string> = {
  yellow: 'bg-sun',
  pink: 'bg-blossom',
  mint: 'bg-mint',
  sky: 'bg-sky',
  peach: 'bg-peach',
  cream: 'bg-cream-200',
};

export default function PillLabel({
  color = 'yellow',
  children,
  className,
}: PillLabelProps) {
  return (
    <span
      className={[
        'inline-block rounded-full px-4 py-1 text-[11px] uppercase tracking-[0.14em] font-semibold border-2 border-outline',
        colorMap[color],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
