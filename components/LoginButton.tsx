'use client';

import { signInWithPopup } from 'firebase/auth';
import { clientAuth, googleProvider } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signInWithPopup(clientAuth(), googleProvider);
      router.push('/library');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="rounded-full bg-[#5D6D7E] px-6 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
    >
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
