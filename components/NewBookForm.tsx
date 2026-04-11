'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function NewBookForm() {
  const { getIdToken } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [pages, setPages] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl w-full space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#5D6D7E] mb-2">
          What is the book about?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="a brave little fox who learns to share"
          className="w-full rounded-2xl border border-[#E0D9CC] bg-white px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#5D6D7E]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5D6D7E] mb-2">
          How many pages? ({pages})
        </label>
        <input
          type="range"
          min={8}
          max={16}
          value={pages}
          onChange={(e) => setPages(parseInt(e.target.value, 10))}
          className="w-full"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting || topic.length < 3}
        className="w-full rounded-full bg-[#5D6D7E] text-white py-4 font-medium text-lg hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Starting...' : 'Generate book (1 credit)'}
      </button>
    </form>
  );
}
