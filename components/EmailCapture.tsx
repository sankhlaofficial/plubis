'use client';

import { useState } from 'react';
import PillLabel from '@/components/PillLabel';
import DecorativeShape from '@/components/DecorativeShape';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    try {
      const resp = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), childName: childName.trim() || null }),
      });
      if (!resp.ok) throw new Error();
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="bg-sun relative overflow-hidden">
      <DecorativeShape kind="star" size={24} className="absolute top-8 left-[10%] animate-twinkle" />
      <DecorativeShape kind="cloud" size={32} className="absolute bottom-6 right-[8%] animate-float-slow" />

      <div className="container-prose section relative z-10 text-center max-w-xl mx-auto">
        <PillLabel color="cream" className="mb-4">Stay in the loop</PillLabel>
        <h2 className="text-3xl md:text-4xl mb-3">
          Get notified when we add new situations.
        </h2>
        <p className="text-ink-soft mb-8">
          We're building guides and books for every hard moment. Drop your
          email and we'll let you know when new ones land.
        </p>

        {status === 'done' ? (
          <div className="rounded-2xl bg-mint border-2 border-outline p-6 text-center">
            <p className="font-display text-xl font-bold text-ink">You're in.</p>
            <p className="text-sm text-ink-soft mt-2">
              We'll email you when new situations go live. No spam, ever.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your email"
              className="w-full rounded-2xl border-2 border-outline bg-cream px-5 py-4 text-base font-body focus:outline-none focus:ring-4 focus:ring-outline/20"
            />
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Your child's name (optional)"
              maxLength={60}
              className="w-full rounded-2xl border-2 border-outline bg-cream px-5 py-4 text-base font-body focus:outline-none focus:ring-4 focus:ring-outline/20"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-full bg-outline text-cream border-2 border-outline px-6 py-4 text-base font-semibold shadow-[0_4px_0_0_#0F172A] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#0F172A] transition disabled:opacity-50"
            >
              {status === 'sending' ? 'Joining...' : 'Keep me posted'}
            </button>
            {status === 'error' && (
              <p className="text-sm text-outline">Something went wrong. Try again?</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
