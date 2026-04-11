'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Job } from '@/lib/types';
import DecorativeShape from '@/components/DecorativeShape';

const PALETTES = ['#FFCC4D', '#FCE4EC', '#D4F0E0', '#FFD9C4', '#D6EFFA'];

function statusMeta(status: Job['status']) {
  switch (status) {
    case 'complete':   return { label: 'Ready',      bg: 'bg-mint' };
    case 'building':   return { label: 'Building…',  bg: 'bg-sun' };
    case 'generating': return { label: 'Writing…',   bg: 'bg-sun' };
    case 'pending':    return { label: 'Pending…',   bg: 'bg-cream-200' };
    case 'failed':     return { label: 'Failed',     bg: 'bg-blossom' };
    default:           return { label: status,       bg: 'bg-cream-200' };
  }
}

export default function BookCard({ job }: { job: Job }) {
  const [imgError, setImgError] = useState(false);
  const title = job.bookJson?.title || job.topic;
  const cover = job.imageUrls?.cover;
  const showFallback = !cover || imgError;
  const bgColor = PALETTES[job.jobId.charCodeAt(0) % PALETTES.length];
  const meta = statusMeta(job.status);
  const pageCount = job.bookJson?.pages.length ?? 0;

  return (
    <Link
      href={`/job/${job.jobId}`}
      className="group block rounded-[28px] p-4 bg-white border-2 border-outline shadow-[0_4px_12px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] transition"
    >
      <div className="relative aspect-[3/4] rounded-[20px] dashed-card overflow-hidden bg-cream-200">
        {/* Status badge */}
        <span
          className={`absolute top-3 left-3 z-10 pill ${meta.bg} border-2 border-outline px-3 py-1 text-[10px] uppercase tracking-wider font-semibold`}
        >
          {meta.label}
        </span>

        {showFallback ? (
          <div
            className="w-full h-full flex items-center justify-center p-6 relative"
            style={{ backgroundColor: bgColor }}
          >
            <DecorativeShape kind="star" size={24} className="absolute top-4 right-4" />
            <span className="font-display text-2xl text-center text-outline line-clamp-4">
              {title}
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="p-2 pt-4">
        <h3 className="text-lg line-clamp-2">{title}</h3>
        {pageCount > 0 && (
          <p className="text-xs text-ink-soft mt-1">
            {pageCount} page{pageCount === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </Link>
  );
}
