'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { JobProgress } from '@/components/JobProgress';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DecorativeShape from '@/components/DecorativeShape';

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  return (
    <>
      <Header />
      <main className="bg-cream min-h-[60vh] relative overflow-hidden">
        <DecorativeShape kind="cloud" size={64} className="absolute top-12 left-[6%] animate-float-slow hidden md:block" />
        <DecorativeShape kind="star" size={24} className="absolute top-20 right-[10%] animate-twinkle hidden md:block" />
        <DecorativeShape kind="sparkle" size={28} className="absolute bottom-20 left-[10%] animate-twinkle hidden md:block" />
        <DecorativeShape kind="balloon" size={48} className="absolute bottom-16 right-[8%] animate-float-slow hidden md:block" />

        <div className="container-prose section relative z-10">
          {loading || !user ? (
            <div className="w-full max-w-md mx-auto">
              <div className="h-96 rounded-[28px] animate-shimmer" />
            </div>
          ) : (
            <JobProgress jobId={id} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
