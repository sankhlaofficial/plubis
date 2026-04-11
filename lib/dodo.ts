import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a Dodo webhook signature (HMAC-SHA256 of the raw body, hex-encoded).
 * Uses timing-safe comparison. Never logs the secret or signature.
 */
export function verifyDodoSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

export interface DodoCheckoutSessionInput {
  productId: string;
  uid: string;
  creditAmount: number;
  successUrl: string;
  cancelUrl: string;
}

export interface DodoCheckoutSession {
  url: string;
  id: string;
}

/**
 * Creates a hosted checkout session via Dodo Payments. Passes uid +
 * creditAmount as metadata so the webhook handler can attribute the purchase.
 *
 * IMPORTANT: the live API host is `live.dodopayments.com` (NOT `api.dodo...`).
 * The endpoint is `/checkouts` and the body uses `product_cart` + `return_url`
 * (NOT line_items + success_url). The response shape is { session_id, checkout_url }.
 * These were verified by hitting the live API directly during QA on 2026-04-11.
 *
 * Dodo's /checkouts endpoint does not have a separate cancel_url — the user
 * just closes the checkout window if they cancel, returning them to the page
 * they came from.
 */
export async function createDodoCheckoutSession(input: DodoCheckoutSessionInput): Promise<DodoCheckoutSession> {
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) throw new Error('DODO_API_KEY not set');

  const resp = await fetch('https://live.dodopayments.com/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_cart: [{ product_id: input.productId, quantity: 1 }],
      return_url: input.successUrl,
      metadata: {
        uid: input.uid,
        creditAmount: String(input.creditAmount),
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Dodo checkout ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  return { url: data.checkout_url, id: data.session_id };
}
