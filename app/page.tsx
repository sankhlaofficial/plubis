import Link from 'next/link';
import { BRAND_NAME, TAGLINE } from '@/lib/brand';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-6xl text-[#2C3E50] mb-6">{BRAND_NAME}</h1>
        <p className="text-xl text-[#5D6D7E] mb-10">{TAGLINE}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-full bg-[#5D6D7E] px-8 py-3 text-white font-medium hover:opacity-90"
          >
            Make a book — $5
          </Link>
        </div>
        <p className="mt-8 text-sm text-[#A0A0A0]">
          One credit = one full picture book (PDF + EPUB).
        </p>
      </div>
    </main>
  );
}
