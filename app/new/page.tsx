'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { NewBookForm } from '@/components/NewBookForm';

export default function NewPage() {
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
      <h1 className="text-4xl mb-8 text-[#2C3E50]">A new book</h1>
      <NewBookForm />
    </main>
  );
}
