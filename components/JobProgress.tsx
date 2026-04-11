'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job } from '@/lib/types';
import PillLabel from '@/components/PillLabel';
import Button from '@/components/Button';
import JobPhaseAnimation from '@/components/JobPhaseAnimation';

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

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="rounded-[28px] bg-white border-2 border-outline p-10">
          <div className="flex justify-center mb-4">
            <PillLabel color="pink">Something went wrong</PillLabel>
          </div>
          <p className="text-ink-soft mb-6">{error}</p>
          <Button href="/library" variant="secondary" size="md">Back to library</Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="h-96 rounded-[28px] animate-shimmer" />
      </div>
    );
  }

  if (job.status === 'failed') {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="rounded-[28px] bg-white border-2 border-outline p-10">
          <div className="flex justify-center mb-4">
            <JobPhaseAnimation phase="failed" size={128} />
          </div>
          <div className="flex justify-center mb-3">
            <PillLabel color="pink">Something went wrong</PillLabel>
          </div>
          <h2 className="text-3xl mb-2">{job.bookJson?.title || job.topic}</h2>
          <p className="text-ink-soft mb-6">{job.error?.message || 'Unknown error'}</p>
          <div className="flex gap-3 justify-center">
            <Button href="/new" variant="primary" size="md">Start a new book</Button>
            <Button href="/library" variant="secondary" size="md">Back to library</Button>
          </div>
        </div>
      </div>
    );
  }

  if (job.status === 'complete' && job.pdfUrl && job.epubUrl) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="rounded-[28px] bg-white border-2 border-outline p-10 md:p-12">
          <div className="flex justify-center mb-4">
            <JobPhaseAnimation phase="done" size={128} />
          </div>
          <div className="flex justify-center mb-3">
            <PillLabel color="mint">Ready</PillLabel>
          </div>
          <h2 className="text-3xl md:text-4xl mb-2">{job.bookJson?.title || 'Your book'}</h2>
          <p className="text-ink-soft mb-6">Ready to read.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button href={job.pdfUrl} download size="md" variant="primary">Download PDF</Button>
            <Button href={job.epubUrl} download size="md" variant="secondary">Download EPUB</Button>
          </div>

          <div className="border-t-2 border-cream-200 pt-6 mt-6">
            <div className="flex justify-center mb-3">
              <PillLabel color="yellow">What&apos;s next?</PillLabel>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button href="/new" variant="primary" size="md">Make another book</Button>
              <CopyShareLinkButton jobId={jobId} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const percent = job.progress?.percent ?? 0;
  const message = job.progress?.message || 'Working…';
  const phase = job.progress?.phase;

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="rounded-[28px] bg-white border-2 border-outline p-10 md:p-12">
        <div className="flex justify-center mb-4">
          <JobPhaseAnimation phase={phase} size={128} />
        </div>
        <div className="flex justify-center mb-3">
          <PillLabel color="yellow">Making your book</PillLabel>
        </div>
        <h2 className="text-3xl mb-6">{job.bookJson?.title || job.topic}</h2>

        {/* Progress bar with dark outline */}
        <div className="w-full rounded-full border-2 border-outline bg-cream-200 h-5 overflow-hidden mb-3">
          <div
            className="h-full bg-sun transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-ink-soft text-sm">{message}</p>
      </div>
    </div>
  );
}

function CopyShareLinkButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    const url = `${window.location.origin}/job/${jobId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing — user can manually copy from the URL bar
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-full bg-cream border-2 border-outline px-6 py-3 text-base font-medium text-outline hover:bg-cream-200 transition"
    >
      {copied ? 'Copied!' : 'Copy share link'}
    </button>
  );
}
