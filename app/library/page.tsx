'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { LibraryGrid } from '@/components/LibraryGrid';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <>
        <Header />
        <main className="container-prose section min-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 rounded-[28px] animate-shimmer" />
            ))}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="bg-cream min-h-[60vh]">
        <LibraryGrid />
      </main>
      <Footer />
    </>
  );
}
