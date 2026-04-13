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
      // cheap. Up to 5 attempts per image with escalating spacing.
      const generateOne = async (p: number): Promise<boolean> => {
        const delays = [2000, 3000, 5000, 8000]; // spacing between attempts
        for (let attempt = 1; attempt <= 5; attempt++) {
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
          if (attempt < 5) await new Promise((r) => setTimeout(r, delays[attempt - 1] || 5000));
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
        // Auto-reload once — the imagesKickedOff ref resets on fresh mount
        // so the retry loop starts again automatically. Only show error if
        // this is already a reload (detected via sessionStorage flag).
        const retryKey = `plubis_img_retry_${jobId}`;
        const alreadyRetried = sessionStorage.getItem(retryKey);
        if (!alreadyRetried) {
          sessionStorage.setItem(retryKey, '1');
          window.location.reload();
          return;
        }
        // Second attempt also failed — show a gentle error with auto-retry
        sessionStorage.removeItem(retryKey);
        setError(`${failed} illustration${failed > 1 ? 's are' : ' is'} taking longer than usual. Please refresh the page to try again.`);
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
    const isImageRetry = error.includes('illustration');
    const isPermission = error.toLowerCase().includes('permission') || error.toLowerCase().includes('unauthenticated');
    const isNotFound = error.includes('not found');

    let pill = 'Something went wrong';
    let pillColor: 'pink' | 'yellow' | 'mint' = 'pink';
    let message = error;
    let primaryAction = { label: 'Refresh', href: '', onClick: () => window.location.reload() };
    let secondaryAction = { label: 'Back to library', href: '/library' };

    if (isImageRetry) {
      pill = 'Almost there';
      pillColor = 'yellow';
      primaryAction.label = 'Try again';
    } else if (isPermission) {
      pill = 'Sign in to view this book';
      pillColor = 'yellow';
      message = 'This book belongs to a different account, or you need to sign in to view it.';
      primaryAction = { label: 'Sign in', href: `/login?redirect=${encodeURIComponent(`/job/${jobId}`)}`, onClick: () => {} };
      secondaryAction = { label: 'Go home', href: '/' };
    } else if (isNotFound) {
      pill = 'Book not found';
      message = "We couldn't find this book. It may have been removed, or the link might be wrong.";
    }

    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="rounded-[28px] bg-white border-2 border-outline p-10">
          <div className="flex justify-center mb-4">
            <JobPhaseAnimation phase={isImageRetry ? 'generating-images' : 'failed'} size={128} />
          </div>
          <div className="flex justify-center mb-3">
            <PillLabel color={pillColor}>{pill}</PillLabel>
          </div>
          <p className="text-ink-soft mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            {primaryAction.href ? (
              <Button href={primaryAction.href} variant="primary" size="md">{primaryAction.label}</Button>
            ) : (
              <Button onClick={primaryAction.onClick} variant="primary" size="md">{primaryAction.label}</Button>
            )}
            <Button href={secondaryAction.href} variant="secondary" size="md">{secondaryAction.label}</Button>
          </div>
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
            <DownloadButton url={job.pdfUrl} filename={`${slugify(job.bookJson?.title)}.pdf`} variant="primary">Download PDF</DownloadButton>
            <DownloadButton url={job.epubUrl} filename={`${slugify(job.bookJson?.title)}.epub`} variant="secondary">Download EPUB</DownloadButton>
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

/** Slugify a title for use as a download filename. */
function slugify(title: string | undefined): string {
  return (title || 'plubis-book')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'plubis-book';
}

/**
 * Cross-browser download button. Fetches the file as a blob and triggers
 * a save dialog with the correct filename. Works in Chrome, Safari, Firefox
 * regardless of cross-origin restrictions on the download attribute.
 */
function DownloadButton({
  url,
  filename,
  variant,
  children,
}: {
  url: string;
  filename: string;
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab if fetch fails
      window.open(url, '_blank');
    }
    setDownloading(false);
  }

  const base =
    'inline-flex items-center justify-center rounded-full font-medium border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-base';
  const variantClass =
    variant === 'primary'
      ? 'bg-sun text-outline border-outline shadow-[0_4px_0_0_#0F172A] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#0F172A]'
      : 'bg-cream text-outline border-outline hover:bg-cream-200';

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`${base} ${variantClass}`}
    >
      {downloading ? 'Downloading...' : children}
    </button>
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
