'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { NewBookForm } from '@/components/NewBookForm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';

export default function NewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  return (
    <>
      <Header />
      <main className="bg-cream relative overflow-hidden">
        <DecorativeShape
          kind="cloud"
          size={64}
          className="absolute top-16 left-[6%] animate-float-slow hidden md:block"
        />
        <DecorativeShape
          kind="star"
          size={24}
          className="absolute top-24 right-[10%] animate-twinkle hidden md:block"
        />
        <DecorativeShape
          kind="sparkle"
          size={28}
          className="absolute bottom-16 left-[12%] animate-twinkle hidden md:block"
        />
        <DecorativeShape
          kind="balloon"
          size={48}
          className="absolute bottom-20 right-[8%] animate-float-slow hidden md:block"
        />

        <div className="container-prose section relative z-10">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <PillLabel color="mint" className="mb-4">Start a new story</PillLabel>
            <h1 className="text-4xl md:text-5xl mb-3">
              What should tonight&apos;s book be about?
            </h1>
            <p className="text-ink-soft text-lg">
              One sentence is enough. Your child is the hero.
            </p>
          </div>

          <div className="max-w-xl mx-auto rounded-[28px] bg-white border-2 border-outline p-8 md:p-10 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            {loading || !user ? (
              <div className="h-80 rounded-[20px] animate-shimmer" />
            ) : (
              <Suspense fallback={<div className="h-80 rounded-[20px] animate-shimmer" />}>
                <NewBookForm />
              </Suspense>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
