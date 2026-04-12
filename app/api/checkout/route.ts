import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createDodoCheckoutSession } from '@/lib/dodo';
import { CREDIT_PRODUCTS, type CreditProductKey } from '@/lib/products';

export const runtime = 'nodejs';
export const maxDuration = 10;

// Credit pack catalog — derived from lib/products.ts so the UI prices and
// the Dodo-side prices can't drift. Each tier maps its public product key
// to the Dodo productId stored in env vars. Set in Vercel project env:
//   DODO_PRODUCT_CREDIT_1, DODO_PRODUCT_CREDIT_3, DODO_PRODUCT_CREDIT_10.
const PRODUCT_MAP: Record<CreditProductKey, { productId: string; credits: number }> = {
  credit_1: {
    productId: process.env.DODO_PRODUCT_CREDIT_1 || '',
    credits: CREDIT_PRODUCTS.find((p) => p.key === 'credit_1')!.credits,
  },
  credit_3: {
    productId: process.env.DODO_PRODUCT_CREDIT_3 || '',
    credits: CREDIT_PRODUCTS.find((p) => p.key === 'credit_3')!.credits,
  },
  credit_10: {
    productId: process.env.DODO_PRODUCT_CREDIT_10 || '',
    credits: CREDIT_PRODUCTS.find((p) => p.key === 'credit_10')!.credits,
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
  const product = (url.searchParams.get('product') || 'credit_1') as CreditProductKey;
  const entry = PRODUCT_MAP[product];
  if (!entry || !entry.productId) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  }

  const origin = url.origin;
  const session = await createDodoCheckoutSession({
    productId: entry.productId,
    uid: user.uid,
    creditAmount: entry.credits,
    successUrl: `${origin}/thank-you`,
    cancelUrl: `${origin}/pricing?purchase=cancelled`,
  });

  // Return JSON instead of a redirect. The browser cannot send the
  // Authorization header during a plain link navigation, so the client
  // (LibraryGrid button) calls this via fetch + bearer token, reads the
  // url field, and does window.location = url to perform the navigation.
  return NextResponse.json({ url: session.url, sessionId: session.id });
}
