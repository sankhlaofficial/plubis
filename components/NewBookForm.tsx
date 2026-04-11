'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Button from '@/components/Button';

const SUGGESTIONS = [
  'a brave fox who learns to share',
  'a dragon afraid of the dark',
  'a moon that visits earth',
  'a shy whale finding her song',
];

export function NewBookForm() {
  const { getIdToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState('');
  const [pages, setPages] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from ?topic= query param (driven by example chips on the landing / library page).
  useEffect(() => {
    const qp = searchParams.get('topic');
    if (qp && topic === '') setTopic(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/book/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, pages }),
      });
      if (resp.status === 402) {
        router.push('/pricing');
        return;
      }
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const { jobId } = await resp.json();
      router.push(`/job/${jobId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full space-y-7">
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-ink-soft mb-2">
          What is the book about?
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="a brave little fox who learns to share"
          className="w-full rounded-2xl border-2 border-outline bg-cream px-5 py-4 text-lg font-body focus:outline-none focus:ring-4 focus:ring-sun"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTopic(s)}
              className="rounded-full bg-cream-200 border border-outline/20 px-3 py-1.5 text-xs text-ink-soft hover:bg-sun hover:text-outline hover:border-outline transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="pages" className="block text-sm font-medium text-ink-soft mb-2">
          How many pages? <span className="text-ink font-semibold">{pages}</span>
        </label>
        <input
          id="pages"
          type="range"
          min={8}
          max={16}
          value={pages}
          onChange={(e) => setPages(parseInt(e.target.value, 10))}
          className="w-full accent-outline"
        />
        <div className="flex justify-between text-xs text-ink-soft mt-1">
          <span>8 — quick bedtime</span>
          <span>16 — full adventure</span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-blossom border-2 border-outline p-4 text-sm text-outline">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting || topic.length < 3}>
        {submitting ? 'Starting…' : 'Generate book (1 credit)'}
      </Button>
    </form>
  );
}
