import Link from 'next/link';
import { BRAND_NAME, TAGLINE, SUPPORT_EMAIL } from '@/lib/brand';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="bg-sky border-t-2 border-outline mt-20 relative overflow-hidden">
      <div className="container-prose px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Logo size="md" href={null} />
          <p className="mt-4 text-ink-soft max-w-sm">
            {TAGLINE} One credit, one picture book.
          </p>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-wider text-ink-soft mb-3 font-semibold">
            Product
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href="/new" className="hover:underline">
                Make a book
              </Link>
            </li>
            <li>
              <Link href="/library" className="hover:underline">
                Your library
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-wider text-ink-soft mb-3 font-semibold">
            Support
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-outline/20">
        <div className="container-prose px-6 py-6 flex items-center justify-between text-xs text-ink-soft">
          <span>
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </span>
          <span>v2 UI</span>
        </div>
      </div>
    </footer>
  );
}
