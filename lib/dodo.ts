import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a Dodo webhook signature using the Standard Webhooks spec.
 * Dodo uses the svix-compatible format:
 *
 *   webhook-id:        msg_xxx
 *   webhook-timestamp: 1775919706 (unix seconds)
 *   webhook-signature: v1,<base64-of-hmac>
 *
 * The HMAC is computed over the concatenation `${id}.${timestamp}.${rawBody}`,
 * using the webhook secret with the `whsec_` prefix stripped and the rest
 * base64-decoded as the HMAC key. Multiple v1 signatures may be space-separated
 * (during key rotation); we accept the message if any one matches.
 *
 * Spec: https://www.standardwebhooks.com/
 *
 * Discovered during e2e QA on 2026-04-11 — the original implementation used
 * the wrong format (hex-encoded HMAC over just the body) and rejected every
 * real Dodo webhook with 401, meaning no real customer would ever get
 * credited. The fixture-based tests passed because they used the same wrong
 * format on both sides.
 */
export interface VerifyDodoInput {
  rawBody: string;
  signature: string;          // value of the webhook-signature header
  webhookId: string;          // value of the webhook-id header
  webhookTimestamp: string;   // value of the webhook-timestamp header
  secret: string;             // raw env value, may include `whsec_` prefix
  toleranceSeconds?: number;  // reject if timestamp older than this; default 5 min
}

export function verifyDodoSignature(input: VerifyDodoInput): boolean {
  const { rawBody, signature, webhookId, webhookTimestamp, secret } = input;
  const tolerance = input.toleranceSeconds ?? 5 * 60;

  if (!signature || !webhookId || !webhookTimestamp || !secret) return false;

  // Reject ancient or future-dated timestamps (replay protection).
  const ts = parseInt(webhookTimestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > tolerance) return false;

  // Standard svix convention:
  //   - Secrets starting with `whsec_` have a base64-encoded raw key after
  //     the prefix → base64-decode it.
  //   - Bare secrets (no prefix) are treated as raw utf-8 bytes.
  let key: Buffer;
  if (secret.startsWith('whsec_')) {
    key = Buffer.from(secret.slice(6), 'base64');
  } else {
    key = Buffer.from(secret, 'utf-8');
  }

  // Compute HMAC over `${id}.${timestamp}.${body}` and base64-encode it.
  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', key).update(signedPayload).digest('base64');

  // The header may contain multiple "v1,<sig>" entries separated by spaces
  // (during secret rotation Dodo / svix sends both old and new signatures).
  // Accept the message if any one of them matches in constant time.
  const candidates = signature.split(/\s+/);
  for (const cand of candidates) {
    const [version, sig] = cand.split(',');
    if (version !== 'v1' || !sig) continue;
    const sigBuf = Buffer.from(sig, 'base64');
    const expBuf = Buffer.from(expected, 'base64');
    if (sigBuf.length !== expBuf.length) continue;
    if (timingSafeEqual(sigBuf, expBuf)) return true;
  }
  return false;
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
