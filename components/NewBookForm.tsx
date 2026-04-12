'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import Button from '@/components/Button';
import { clientDb } from '@/lib/firebase-client';
import { SITUATIONS, SITUATION_OTHER, getSituation } from '@/lib/situations';

const SUGGESTIONS = [
  'a brave fox who learns to share',
  'a dragon afraid of the dark',
  'a moon that visits earth',
  'a shy whale finding her song',
];

// Derive a first-name-only string from a full display name so the hidden
// dedication page reads naturally. Falls back to an empty string for callers
// to handle — the create route will set a generic fallback if we pass nothing.
function firstToken(full: string | null | undefined): string {
  if (!full) return '';
  return full.trim().split(/\s+/)[0] || '';
}

export function NewBookForm() {
  const { user, getIdToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState('');
  const [childName, setChildName] = useState('');
  const [situationSlug, setSituationSlug] = useState<string>('');
  const [situationOther, setSituationOther] = useState('');
  const [pages, setPages] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live user-doc state so we can swap the CTA to "free" when the signup
  // bonus is available. null while loading so the button doesn't flash the
  // wrong label on first paint.
  const [credits, setCredits] = useState<number | null>(null);
  const [totalBooksGenerated, setTotalBooksGenerated] = useState<number | null>(null);

  // Prefill from ?topic= query param (driven by example chips on the landing / library page).
  useEffect(() => {
    const qp = searchParams.get('topic');
    if (qp && topic === '') setTopic(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Subscribe to the user doc so we know whether this is the user's first
  // book (signup bonus available) or a paid book.
  useEffect(() => {
    if (!user) {
      setCredits(null);
      setTotalBooksGenerated(null);
      return;
    }
    const unsub = onSnapshot(
      doc(clientDb(), 'users', user.uid),
      (snap) => {
        const data = snap.data() as
          | { credits?: number; totalBooksGenerated?: number }
          | undefined;
        setCredits(data?.credits ?? 0);
        setTotalBooksGenerated(data?.totalBooksGenerated ?? 0);
      },
      () => {
        setCredits(0);
        setTotalBooksGenerated(0);
      },
    );
    return () => unsub();
  }, [user]);

  const isFirstFreeBook =
    credits !== null &&
    totalBooksGenerated !== null &&
    totalBooksGenerated === 0 &&
    credits > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      // Parent first name is derived silently from the Firebase displayName so
      // the dedication page stays hidden — the parent discovers it in the PDF.
      const parentFirstName = firstToken(user?.displayName);
      const resp = await fetch('/api/book/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic,
          pages,
          childName: childName.trim() || null,
          parentFirstName: parentFirstName || null,
          situationSlug: situationSlug || null,
          situationOther:
            situationSlug === SITUATION_OTHER && situationOther.trim().length > 0
              ? situationOther.trim()
              : null,
        }),
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
        <label htmlFor="childName" className="block text-sm font-medium text-ink-soft mb-2">
          Who is the book for?
        </label>
        <input
          id="childName"
          type="text"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          required
          minLength={1}
          maxLength={60}
          placeholder="Your child's first name"
          autoComplete="off"
          className="w-full rounded-2xl border-2 border-outline bg-cream px-5 py-4 text-lg font-body focus:outline-none focus:ring-4 focus:ring-sun"
        />
        <p className="mt-2 text-xs text-ink-soft">
          We'll use their name in the story and on a little dedication page.
        </p>
      </div>

      <div>
        <label htmlFor="situation" className="block text-sm font-medium text-ink-soft mb-2">
          What's going on in their world?{' '}
          <span className="text-muted font-normal">(optional)</span>
        </label>
        <select
          id="situation"
          value={situationSlug}
          onChange={(e) => setSituationSlug(e.target.value)}
          className="w-full rounded-2xl border-2 border-outline bg-cream px-5 py-4 text-lg font-body focus:outline-none focus:ring-4 focus:ring-sun appearance-none"
        >
          <option value="">Nothing in particular — just a cozy story</option>
          {SITUATIONS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
          <option value={SITUATION_OTHER}>Something else…</option>
        </select>
        {situationSlug && situationSlug !== SITUATION_OTHER && (
          <p className="mt-2 text-xs italic text-ink-soft">
            {getSituation(situationSlug)?.hint}
          </p>
        )}
        {situationSlug === SITUATION_OTHER && (
          <textarea
            value={situationOther}
            onChange={(e) => setSituationOther(e.target.value)}
            maxLength={500}
            rows={3}
            required
            placeholder="Tell us what's going on — we'll shape the story around it."
            className="mt-3 w-full rounded-2xl border-2 border-outline bg-cream px-5 py-3 text-base font-body focus:outline-none focus:ring-4 focus:ring-sun resize-none"
          />
        )}
        {!situationSlug && (
          <p className="mt-2 text-xs text-ink-soft">
            If your child is going through a hard moment, picking it helps us
            shape the book around the feeling — not just the story.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-ink-soft mb-2">
          What kind of story?
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

      {isFirstFreeBook && (
        <div className="rounded-2xl bg-mint border-2 border-outline p-4 text-sm text-outline font-medium text-center">
          ✨ Your first book is on us. No payment needed.
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={
          submitting ||
          topic.length < 3 ||
          childName.trim().length < 1 ||
          (situationSlug === SITUATION_OTHER && situationOther.trim().length < 3)
        }
      >
        {submitting
          ? 'Starting…'
          : isFirstFreeBook
            ? 'Generate my free book'
            : 'Generate book (1 credit)'}
      </Button>
    </form>
  );
}
