'use client';

import Link from 'next/link';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: Array<{ href: string; label: string }>;
  signedIn: boolean;
  onSignOut?: () => void;
  credits: number | null;
}

export default function MobileMenu({
  open,
  onClose,
  links,
  signedIn,
  onSignOut,
  credits,
}: MobileMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/40 z-40 transition-opacity duration-250 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-cream border-l-2 border-outline z-50 p-8 flex flex-col gap-6 transition-transform duration-250 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="self-end rounded-full border-2 border-outline p-2"
          aria-label="Close menu"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M2 2L14 14M14 2L2 14"
              stroke="#0F172A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <nav className="flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              className="text-2xl font-display font-semibold hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {signedIn && credits !== null && (
          <div className="pill bg-mint border-2 border-outline px-4 py-2 text-sm font-medium self-start">
            {credits} credit{credits === 1 ? '' : 's'}
          </div>
        )}

        {signedIn && onSignOut && (
          <button
            type="button"
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="text-left text-ink-soft underline"
          >
            Sign out
          </button>
        )}
      </aside>
    </>
  );
}
