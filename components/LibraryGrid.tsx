'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job } from '@/lib/types';
import PillLabel from '@/components/PillLabel';
import BookCard from '@/components/BookCard';
import EmptyLibrary from '@/components/EmptyLibrary';

export function LibraryGrid() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);

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
    if (jobsLoaded) {
      setStuck(false);
      return;
    }
    const t = setTimeout(() => setStuck(true), 5000);
    return () => clearTimeout(t);
  }, [jobsLoaded]);

  return (
    <section className="container-prose section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <PillLabel color="mint" className="mb-3">Your library</PillLabel>
          <h1 className="text-4xl md:text-5xl">Your books</h1>
          <p className="text-ink-soft mt-2">Every bedtime story, all in one place.</p>
        </div>
      </div>

      {listenerError && (
        <div className="mb-6 rounded-2xl bg-red-50 border-2 border-red-200 p-4">
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

      {!listenerError && stuck && !jobsLoaded && (
        <div className="mb-6 rounded-2xl bg-peach border-2 border-outline p-4">
          <p className="text-outline text-sm font-medium mb-1">Still loading your library…</p>
          <p className="text-ink-soft text-xs mb-3">
            This usually means your browser is taking a moment to connect. If it doesn&apos;t finish in another few seconds, try reloading.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs underline text-outline"
          >
            Reload now
          </button>
        </div>
      )}

      {!jobsLoaded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 rounded-[28px] animate-shimmer" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {jobs.map((job) => (
            <BookCard key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}
