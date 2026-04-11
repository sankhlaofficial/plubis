'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job, User } from '@/lib/types';

export function LibraryGrid() {
  const { user, getIdToken } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);

  async function handleBuyCredit() {
    setBuying(true);
    setBuyError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not signed in');
      const resp = await fetch('/api/checkout?product=credit_1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const { url } = await resp.json();
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (e: any) {
      setBuyError(e?.message || 'Could not start checkout');
      setBuying(false);
    }
  }

  // Subscribe to user doc for credit balance. Add an error callback so silent
  // failures (CSP, ITP, network) surface to the UI instead of leaving the
  // badge stuck on '...'.
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(clientDb(), 'users', user.uid),
      (snap) => {
        const data = snap.data() as User | undefined;
        setCredits(data?.credits ?? 0);
        setListenerError(null);
      },
      (err) => setListenerError(err.message || 'Failed to load credits'),
    );
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
    const unsub = onSnapshot(
      q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ ...(d.data() as any), jobId: d.id })));
        setJobsLoaded(true);
        setListenerError(null);
      },
      (err) => setListenerError(err.message || 'Failed to load books'),
    );
    return () => unsub();
  }, [user]);

  // Show a "still loading?" hint if Firestore hasn't responded after 5s.
  // Real users on Safari + ITP have hit a race where the first listener
  // never fires until refresh; this lets them recover without thinking
  // the app is broken.
  useEffect(() => {
    if (credits !== null && jobsLoaded) {
      setStuck(false);
      return;
    }
    const t = setTimeout(() => setStuck(true), 5000);
    return () => clearTimeout(t);
  }, [credits, jobsLoaded]);

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl text-[#2C3E50]">Your books</h1>
        <div className="flex items-center gap-4">
          <span className="text-[#5D6D7E]">
            {credits === null ? '...' : `${credits} credit${credits === 1 ? '' : 's'}`}
          </span>
          <button
            onClick={handleBuyCredit}
            disabled={buying}
            className="rounded-full bg-[#E8A87C] px-5 py-2 text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {buying ? 'Opening checkout...' : 'Buy 1 credit — $5'}
          </button>
          <Link
            href="/new"
            className="rounded-full bg-[#5D6D7E] px-5 py-2 text-white font-medium"
          >
            New book
          </Link>
        </div>
      </div>

      {buyError && (
        <p className="text-red-600 text-sm mb-4">{buyError}</p>
      )}

      {listenerError && (
        <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-4">
          <p className="text-red-700 text-sm font-medium mb-1">Couldn&apos;t load your library.</p>
          <p className="text-red-600 text-xs mb-3">{listenerError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs underline text-red-700"
          >
            Reload page
          </button>
        </div>
      )}

      {!listenerError && stuck && (credits === null || !jobsLoaded) && (
        <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-amber-800 text-sm font-medium mb-1">Still loading your library...</p>
          <p className="text-amber-700 text-xs mb-3">
            This usually means your browser is taking a moment to connect. If it doesn&apos;t finish in another few seconds, try reloading.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs underline text-amber-800"
          >
            Reload now
          </button>
        </div>
      )}

      {!jobsLoaded ? (
        <p className="text-[#5D6D7E]">Loading...</p>
      ) : jobs.length === 0 ? (
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
