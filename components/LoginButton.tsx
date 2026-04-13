'use client';

import { signInWithPopup } from 'firebase/auth';
import { clientAuth, googleProvider } from '@/lib/firebase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.63z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.36 0-4.35-1.59-5.06-3.72H.92v2.33A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.94 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V4.96H.92A9 9 0 0 0 0 9c0 1.45.35 2.82.92 4.04l3.02-2.34z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.88 11.43 0 9 0A9 9 0 0 0 .92 4.96l3.02 2.34C4.65 5.17 6.64 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signInWithPopup(clientAuth(), googleProvider);
      const redirect = searchParams.get('redirect');
      router.push(redirect && redirect.startsWith('/') ? redirect : '/library');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      className="inline-flex items-center justify-center gap-3 rounded-full bg-sun text-outline border-2 border-outline px-8 py-4 text-lg font-medium shadow-[0_4px_0_0_#0F172A] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#0F172A] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <GoogleIcon />
      {loading ? 'Signing in…' : 'Sign in with Google'}
    </button>
  );
}
