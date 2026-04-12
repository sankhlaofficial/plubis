'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase-client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Track which UIDs we've already init'd this session so we don't spam
  // /api/users/init on every page navigation or tab focus.
  const initedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth(), async (u) => {
      setUser(u);
      setLoading(false);

      // First-touch user init: creates the user doc + grants the free
      // first-book signup bonus. Idempotent on the server side via the
      // signupBonusGranted flag; idempotent on the client side via the
      // initedRef set to avoid redundant network calls in the same session.
      if (u && !initedRef.current.has(u.uid)) {
        initedRef.current.add(u.uid);
        try {
          const token = await u.getIdToken();
          await fetch('/api/users/init', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Swallowed — the init will retry on the next sign-in, and
          // /api/book/create has its own fallback grant path if this ever
          // silently fails.
        }
      }
    });
    return () => unsub();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signOut: async () => {
      await signOut(clientAuth());
    },
    getIdToken: async () => {
      if (!user) return null;
      return await user.getIdToken();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
