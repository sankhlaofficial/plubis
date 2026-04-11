'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { JobProgress } from '@/components/JobProgress';

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <JobProgress jobId={id} />
    </main>
  );
}
