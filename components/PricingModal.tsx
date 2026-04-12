'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { CREDIT_PRODUCTS, type CreditProductKey } from '@/lib/products';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal overlay that shows the 3 credit tiers (1 / 3 / 10 books) and routes
 * the user into a Dodo checkout session when they pick one. Used by the
 * Header's "+" button and by LibraryGrid's empty-state CTA.
 */
export default function PricingModal({ open, onClose }: PricingModalProps) {
  const { getIdToken } = useAuth();
  const [buyingKey, setBuyingKey] = useState<CreditProductKey | null>(null);
  const [error, setError] = useState<string>('');

  async function handleBuy(key: CreditProductKey) {
    setError('');
    setBuyingKey(key);
    try {
      const token = await getIdToken();
      const resp = await fetch(`/api/checkout?product=${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !data.url) {
        setError(data.error || 'Failed to open checkout');
        setBuyingKey(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error — please try again');
      setBuyingKey(null);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/50 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-modal-title"
      >
        <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="w-full max-w-3xl bg-cream border-2 border-outline rounded-3xl shadow-[0_8px_0_0_#0F172A] p-5 sm:p-8 my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2
                id="pricing-modal-title"
                className="font-display text-2xl sm:text-3xl font-bold text-ink"
              >
                Pick a pack
              </h2>
              <p className="text-sm text-ink-soft mt-1">
                One book, a few for the next situations, or a whole shelf.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-2 border-outline p-2 hover:bg-cream-200 transition"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2 2L14 14M14 2L2 14"
                  stroke="#0F172A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {CREDIT_PRODUCTS.map((p) => (
              <PricingCard
                key={p.key}
                product={p}
                buying={buyingKey === p.key}
                onBuy={() => handleBuy(p.key)}
              />
            ))}
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-blossom border-2 border-outline p-4 text-sm text-outline text-center">
              {error}
            </div>
          )}

          <p className="mt-6 text-xs text-ink-soft text-center">
            Credits never expire. Every book includes PDF + EPUB downloads.
          </p>
        </div>
        </div>
      </div>
    </>
  );
}

interface PricingCardProps {
  product: (typeof CREDIT_PRODUCTS)[number];
  buying: boolean;
  onBuy: () => void;
}

function PricingCard({ product, buying, onBuy }: PricingCardProps) {
  const isPopular = product.popular === true;
  return (
    <div
      className={`relative rounded-2xl border-2 border-outline p-6 flex flex-col ${
        isPopular ? 'bg-sun shadow-[0_6px_0_0_#0F172A]' : 'bg-cream-200 shadow-[0_4px_0_0_#0F172A]'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mint border-2 border-outline px-3 py-1 text-xs font-semibold">
          Most popular
        </div>
      )}

      <h3 className="font-display text-xl font-bold text-ink">{product.label}</h3>
      <p className="text-sm text-ink-soft mt-1">{product.tagline}</p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold text-ink">${product.priceUsd}</span>
        {product.savePct !== null && (
          <span className="text-xs font-semibold bg-mint border-2 border-outline rounded-full px-2 py-0.5">
            Save {product.savePct}%
          </span>
        )}
      </div>
      <p className="text-xs text-ink-soft mt-1">
        ${product.perBookUsd.toFixed(product.perBookUsd % 1 === 0 ? 0 : 2)} per book
      </p>

      <button
        type="button"
        onClick={onBuy}
        disabled={buying}
        className="mt-6 w-full rounded-full bg-cream border-2 border-outline px-5 py-3 text-sm font-semibold text-outline shadow-[0_4px_0_0_#0F172A] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#0F172A] transition disabled:opacity-50"
      >
        {buying ? 'Opening checkout…' : `Buy ${product.label}`}
      </button>
    </div>
  );
}
