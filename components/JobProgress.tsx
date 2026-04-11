'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job } from '@/lib/types';

export function JobProgress({ jobId }: { jobId: string }) {
  const { getIdToken } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imagesKickedOff = useRef(false);
  const pdfKickedOff = useRef(false);
  const epubKickedOff = useRef(false);

  // Subscribe to the job doc in realtime.
  useEffect(() => {
    const ref = doc(clientDb(), 'jobs', jobId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError('Job not found');
          return;
        }
        setJob({ ...(snap.data() as any), jobId: snap.id });
      },
      (err) => setError(err.message),
    );
    return () => unsub();
  }, [jobId]);

  // Poll /api/book/status while generating.
  useEffect(() => {
    if (!job) return;
    if (job.status !== 'generating') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const token = await getIdToken();
        await fetch(`/api/book/status?jobId=${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Swallow — realtime listener picks up changes regardless.
      }
      if (!cancelled) setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [job?.status, jobId, getIdToken]);

  // Kick off parallel image generation once bookJson is ready.
  useEffect(() => {
    if (!job) return;
    if (job.status !== 'building') return;
    if (!job.bookJson) return;
    if (imagesKickedOff.current) return;
    imagesKickedOff.current = true;

    (async () => {
      const token = await getIdToken();
      const pageCount = job.bookJson!.pages.length;

      // Per-image retry: Cloudflare Flux Schnell occasionally takes >10s,
      // which trips Vercel Hobby's function timeout and returns 504. The
      // /api/book/image route is idempotent (returns existing url if the
      // image is already uploaded) so retrying the same page is safe and
      // cheap. Up to 3 attempts per image with 2s spacing between tries.
      const generateOne = async (p: number): Promise<boolean> => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const resp = await fetch('/api/book/image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ jobId, page: p }),
            });
            if (resp.ok) return true;
            // Retry on transient 5xx — leave 4xx alone, they won't get better.
            if (resp.status < 500) return false;
          } catch {
            // network error — fall through to retry
          }
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
        }
        return false;
      };

      // Fire all images in parallel, each with its own retry loop.
      // 1 cover + N pages.
      const tasks: Promise<boolean>[] = [];
      for (let p = 0; p <= pageCount; p++) {
        tasks.push(generateOne(p));
      }
      const results = await Promise.all(tasks);
      const failed = results.filter((ok) => !ok).length;
      if (failed > 0) {
        // After all retries exhausted, surface the error to the UI so the
        // user can hit Reload (which will re-trigger this effect because
        // the imagesKickedOff guard resets on a fresh mount).
        setError(`${failed} of ${pageCount + 1} illustrations failed after 3 retries — refresh to try again`);
      }
    })().catch((e) => setError(e.message));
  }, [job?.status, job?.bookJson, jobId, getIdToken]);

  // Kick off PDF build once all images present.
  useEffect(() => {
    if (!job) return;
    if (job.status !== 'building') return;
    if (!job.imageUrls) return;
    const allReady = job.imageUrls.cover && job.imageUrls.pages.every((u) => !!u);
    if (!allReady) return;
    if (job.pdfUrl || pdfKickedOff.current) return;
    pdfKickedOff.current = true;

    (async () => {
      const token = await getIdToken();
      await fetch('/api/book/build-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
    })().catch((e) => setError(e.message));
  }, [job?.imageUrls, job?.pdfUrl, jobId, getIdToken]);

  // Kick off EPUB build once PDF is done.
  useEffect(() => {
    if (!job) return;
    if (!job.pdfUrl) return;
    if (job.epubUrl || epubKickedOff.current) return;
    epubKickedOff.current = true;

    (async () => {
      const token = await getIdToken();
      await fetch('/api/book/build-epub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
    })().catch((e) => setError(e.message));
  }, [job?.pdfUrl, job?.epubUrl, jobId, getIdToken]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!job) return <p>Loading...</p>;

  if (job.status === 'failed') {
    return (
      <div className="text-center">
        <h2 className="text-2xl mb-2">Something went wrong</h2>
        <p className="text-[#5D6D7E] mb-4">{job.error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  if (job.status === 'complete' && job.pdfUrl && job.epubUrl) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-3xl">{job.bookJson?.title || 'Your book'}</h2>
        <p className="text-[#5D6D7E]">Ready to read.</p>
        <div className="flex gap-3 justify-center">
          <a
            href={job.pdfUrl}
            className="rounded-full bg-[#5D6D7E] px-6 py-3 text-white font-medium"
            download
          >
            Download PDF
          </a>
          <a
            href={job.epubUrl}
            className="rounded-full bg-[#E8A87C] px-6 py-3 text-white font-medium"
            download
          >
            Download EPUB
          </a>
        </div>
      </div>
    );
  }

  const percent = job.progress?.percent ?? 0;
  const message = job.progress?.message || 'Working...';

  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-2xl mb-6">{job.topic}</h2>
      <div className="w-full bg-white rounded-full h-4 border border-[#E0D9CC] overflow-hidden mb-3">
        <div
          className="h-full bg-[#5D6D7E] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[#5D6D7E]">{message}</p>
    </div>
  );
}
