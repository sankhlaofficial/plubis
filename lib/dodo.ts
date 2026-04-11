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
 * Creates a hosted checkout session. Passes uid + creditAmount as metadata
 * so the webhook handler can attribute the purchase.
 *
 * Thin wrapper over the Dodo REST API — kept in one place so swapping
 * endpoints or upgrading the SDK is a single-file change.
 */
export async function createDodoCheckoutSession(input: DodoCheckoutSessionInput): Promise<DodoCheckoutSession> {
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) throw new Error('DODO_API_KEY not set');

  const resp = await fetch('https://api.dodopayments.com/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      line_items: [{ product_id: input.productId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
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
  return { url: data.checkout_url || data.url, id: data.id };
}
