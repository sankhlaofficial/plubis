/**
 * Credit product catalog — single source of truth for PricingModal,
 * /pricing page, checkout API, and any marketing surface that mentions
 * prices. Update here, everywhere else follows.
 *
 * Pricing notes:
 *   - Single book anchors at $5 so the free-first-book feels valuable.
 *   - 3-pack at $12 saves ~20% ($15 undiscounted) — encourages a second
 *     purchase after the free book.
 *   - 10-pack at $35 saves 30% ($50 undiscounted) — unlocks the family
 *     library use case where a parent comes back for many situations over
 *     the years.
 */

export type CreditProductKey = 'credit_1' | 'credit_3' | 'credit_10';

export interface CreditProduct {
  key: CreditProductKey;
  /** Short headline for the card — "1 book", "3 books", "10 books". */
  label: string;
  credits: number;
  /** Price in USD, shown as "$5" on the card. */
  priceUsd: number;
  /** Per-book price in USD, shown as "$4 a book" under the big price. */
  perBookUsd: number;
  /** Savings vs. the single-book price, or null for the anchor tier. */
  savePct: number | null;
  /** Highlight this tier as the "most popular" on the pricing card grid. */
  popular?: boolean;
  /** One-liner under the label. */
  tagline: string;
}

export const CREDIT_PRODUCTS: CreditProduct[] = [
  {
    key: 'credit_1',
    label: '1 book',
    credits: 1,
    priceUsd: 5,
    perBookUsd: 5,
    savePct: null,
    tagline: 'One book. Ready in about 5 minutes.',
  },
  {
    key: 'credit_3',
    label: '3 books',
    credits: 3,
    priceUsd: 12,
    perBookUsd: 4,
    savePct: 20,
    popular: true,
    tagline: 'The small pack. $4 a book.',
  },
  {
    key: 'credit_10',
    label: '10 books',
    credits: 10,
    priceUsd: 35,
    perBookUsd: 3.5,
    savePct: 30,
    tagline: 'A book for every hard moment. $3.50 a book.',
  },
];

/** Lookup by key. Returns null for unknown keys. */
export function getCreditProduct(key: string): CreditProduct | null {
  return (
    CREDIT_PRODUCTS.find((p) => p.key === key) ?? null
  );
}
