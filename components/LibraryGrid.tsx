'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job, User } from '@/lib/types';

export function LibraryGrid() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  // Subscribe to user doc for credit balance.
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(clientDb(), 'users', user.uid), (snap) => {
      const data = snap.data() as User | undefined;
      setCredits(data?.credits ?? 0);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to user's jobs.
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(clientDb(), 'jobs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setJobs(
        snap.docs.map((d) => ({ ...(d.data() as any), jobId: d.id })),
      );
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl text-[#2C3E50]">Your books</h1>
        <div className="flex items-center gap-4">
          <span className="text-[#5D6D7E]">
            {credits === null ? '...' : `${credits} credit${credits === 1 ? '' : 's'}`}
          </span>
          <Link
            href="/api/checkout?product=credit_1"
            className="rounded-full bg-[#E8A87C] px-5 py-2 text-white font-medium"
          >
            Buy 1 credit — $5
          </Link>
          <Link
            href="/new"
            className="rounded-full bg-[#5D6D7E] px-5 py-2 text-white font-medium"
          >
            New book
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="text-[#5D6D7E]">No books yet. Start with a credit.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <Link
              key={job.jobId}
              href={`/job/${job.jobId}`}
              className="block rounded-2xl bg-white border border-[#E0D9CC] p-6 hover:shadow-md transition"
            >
              <h2 className="text-xl mb-2 text-[#2C3E50]">
                {job.bookJson?.title || job.topic}
              </h2>
              <p className="text-sm text-[#5D6D7E] capitalize">{job.status}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
