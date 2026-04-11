'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { clientDb } from '@/lib/firebase-client';
import Logo from '@/components/Logo';
import Button from '@/components/Button';
import MobileMenu from '@/components/MobileMenu';

function CreditPill({
  credits,
  onBuy,
  buying,
}: {
  credits: number | null;
  onBuy: () => void;
  buying: boolean;
}) {
  if (credits === null) {
    return (
      <span className="pill bg-cream-200 border-2 border-outline px-4 py-2 text-xs">
        ...
      </span>
    );
  }

  if (buying) {
    return (
      <span className="pill bg-sun border-2 border-outline px-4 py-2 text-xs font-medium rounded-full">
        Opening checkout&hellip;
      </span>
    );
  }

  if (credits === 0) {
    return (
      <button
        type="button"
        onClick={onBuy}
        className="bg-sun border-2 border-outline px-4 py-2 text-xs font-medium rounded-full"
      >
        0 credits — buy one
      </button>
    );
  }

  // credits > 0: show balance link + small "+ Buy more" button side-by-side
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/new"
        className="pill bg-mint border-2 border-outline px-4 py-2 text-xs font-medium"
      >
        {credits} credit{credits === 1 ? '' : 's'}
      </Link>
      <button
        type="button"
        onClick={onBuy}
        aria-label="Buy more credits"
        title="Buy more credits"
        className="w-8 h-8 rounded-full bg-sun border-2 border-outline flex items-center justify-center hover:bg-sun-600 transition"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M7 1V13M1 7H13"
            stroke="#0F172A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default function Header() {
  const { user, signOut, getIdToken } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  useEffect(() => {
    if (!user) {
      setCredits(null);
      return;
    }
    const unsub = onSnapshot(
      doc(clientDb(), 'users', user.uid),
      (snap) => setCredits((snap.data() as { credits?: number } | undefined)?.credits ?? 0),
      () => setCredits(0),
    );
    return () => unsub();
  }, [user]);

  async function handleBuy() {
    setBuyError('');
    setBuying(true);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/checkout?product=credit_1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !data.url) {
        setBuyError(data.error || 'Failed to open checkout');
        return;
      }
      window.location.href = data.url;
    } catch {
      setBuyError('Network error — please try again');
    } finally {
      setBuying(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }

  const navLinks = user
    ? [
        { href: '/', label: 'Home' },
        { href: '/library', label: 'Library' },
        { href: '/new', label: 'New book' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/login', label: 'Sign in' },
      ];

  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-cream-200">
      <div className="container-prose flex items-center justify-between px-6 py-4">
        <Logo size="sm" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-ink-soft hover:text-ink">
            Home
          </Link>
          {user && (
            <Link href="/library" className="text-sm font-medium text-ink-soft hover:text-ink">
              Library
            </Link>
          )}
          {user && (
            <Link href="/new" className="text-sm font-medium text-ink-soft hover:text-ink">
              New book
            </Link>
          )}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {!user && (
            <div className="hidden md:block">
              <Button href="/login" variant="primary" size="sm">
                Sign in
              </Button>
            </div>
          )}
          {user && (
            <CreditPill credits={credits} onBuy={handleBuy} buying={buying} />
          )}
          {buyError && (
            <span className="text-xs text-red-600 hidden md:inline">{buyError}</span>
          )}
          {user && (
            <button
              onClick={handleSignOut}
              className="hidden md:inline-block text-sm text-ink-soft hover:text-ink underline"
            >
              Sign out
            </button>
          )}

          {/* Hamburger */}
          <button
            type="button"
            className="md:hidden w-10 h-10 rounded-full border-2 border-outline flex items-center justify-center"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M0 1H18M0 7H18M0 13H18"
                stroke="#0F172A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={navLinks}
        signedIn={!!user}
        onSignOut={handleSignOut}
        credits={credits}
        onBuy={handleBuy}
        buying={buying}
      />
    </header>
  );
}
