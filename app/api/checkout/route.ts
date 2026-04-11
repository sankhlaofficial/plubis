import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createDodoCheckoutSession } from '@/lib/dodo';
import { DOMAIN } from '@/lib/brand';

export const runtime = 'nodejs';
export const maxDuration = 10;

// Slice 1 only exposes credit_1 — Slice 2 adds credit_5 and credit_20.
const PRODUCT_MAP: Record<string, { productId: string; credits: number }> = {
  credit_1: {
    productId: process.env.DODO_PRODUCT_CREDIT_1 || '',
    credits: 1,
  },
};

export async function GET(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const url = new URL(request.url);
  const product = url.searchParams.get('product') || 'credit_1';
  const entry = PRODUCT_MAP[product];
  if (!entry || !entry.productId) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  }

  const origin = url.origin;
  const session = await createDodoCheckoutSession({
    productId: entry.productId,
    uid: user.uid,
    creditAmount: entry.credits,
    successUrl: `${origin}/library?purchase=success`,
    cancelUrl: `${origin}/pricing?purchase=cancelled`,
  });

  return NextResponse.redirect(session.url, 303);
}
