import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyDodoSignature } from './dodo';

// Helper: produce a Standard Webhooks signature for given (id, timestamp, body, secret).
function sign(secret: string, id: string, ts: string, body: string): string {
  // Secret without whsec_ prefix is treated as raw bytes if not valid base64.
  const key = Buffer.from(secret, 'utf-8');
  const payload = `${id}.${ts}.${body}`;
  const sig = createHmac('sha256', key).update(payload).digest('base64');
  return `v1,${sig}`;
}

describe('verifyDodoSignature (Standard Webhooks / svix)', () => {
  const secret = 'test-secret';
  const body = '{"event":"payment.succeeded","data":{"id":"pay_123"}}';
  const webhookId = 'msg_test_123';
  // Use a current-ish timestamp so replay-protection doesn't reject it.
  const webhookTimestamp = String(Math.floor(Date.now() / 1000));

  it('returns true for a valid signature', () => {
    const signature = sign(secret, webhookId, webhookTimestamp, body);
    expect(verifyDodoSignature({ rawBody: body, signature, webhookId, webhookTimestamp, secret })).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const signature = sign(secret, webhookId, webhookTimestamp, body);
    const tampered = body.replace('pay_123', 'pay_999');
    expect(verifyDodoSignature({ rawBody: tampered, signature, webhookId, webhookTimestamp, secret })).toBe(false);
  });

  it('returns false for an empty signature header', () => {
    expect(verifyDodoSignature({ rawBody: body, signature: '', webhookId, webhookTimestamp, secret })).toBe(false);
  });

  it('returns false when webhook-id is missing', () => {
    const signature = sign(secret, webhookId, webhookTimestamp, body);
    expect(verifyDodoSignature({ rawBody: body, signature, webhookId: '', webhookTimestamp, secret })).toBe(false);
  });

  it('returns false when webhook-timestamp is missing', () => {
    const signature = sign(secret, webhookId, webhookTimestamp, body);
    expect(verifyDodoSignature({ rawBody: body, signature, webhookId, webhookTimestamp: '', secret })).toBe(false);
  });

  it('returns false for an old timestamp (replay attack)', () => {
    const oldTs = String(Math.floor(Date.now() / 1000) - 60 * 60); // 1 hour ago
    const signature = sign(secret, webhookId, oldTs, body);
    expect(verifyDodoSignature({ rawBody: body, signature, webhookId, webhookTimestamp: oldTs, secret })).toBe(false);
  });

  it('returns false for a future timestamp', () => {
    const futureTs = String(Math.floor(Date.now() / 1000) + 60 * 60);
    const signature = sign(secret, webhookId, futureTs, body);
    expect(verifyDodoSignature({ rawBody: body, signature, webhookId, webhookTimestamp: futureTs, secret })).toBe(false);
  });

  it('returns false when version prefix is missing', () => {
    const signature = sign(secret, webhookId, webhookTimestamp, body);
    const noVersion = signature.replace(/^v1,/, '');
    expect(verifyDodoSignature({ rawBody: body, signature: noVersion, webhookId, webhookTimestamp, secret })).toBe(false);
  });

  it('accepts a signature with multiple v1 versions (key rotation)', () => {
    const sig1 = sign(secret, webhookId, webhookTimestamp, body);
    const sig2 = sign('other-secret', webhookId, webhookTimestamp, body);
    const combined = `${sig2} ${sig1}`;
    expect(verifyDodoSignature({ rawBody: body, signature: combined, webhookId, webhookTimestamp, secret })).toBe(true);
  });

  it('returns false for a tampered (same-length) signature byte', () => {
    const signature = sign(secret, webhookId, webhookTimestamp, body);
    // Replace the last char of the base64 signature
    const tampered = signature.slice(0, -2) + 'AA';
    expect(verifyDodoSignature({ rawBody: body, signature: tampered, webhookId, webhookTimestamp, secret })).toBe(false);
  });

  it('handles secret with whsec_ prefix (base64-decodes the rest)', () => {
    // The whsec_<base64> form: when the body after whsec_ is valid base64, the
    // function decodes it and uses the resulting bytes as the HMAC key.
    const rawKey = Buffer.from('my-real-secret-key');
    const secretWithPrefix = 'whsec_' + rawKey.toString('base64');
    const payload = `${webhookId}.${webhookTimestamp}.${body}`;
    const expectedSig = 'v1,' + createHmac('sha256', rawKey).update(payload).digest('base64');
    expect(
      verifyDodoSignature({
        rawBody: body,
        signature: expectedSig,
        webhookId,
        webhookTimestamp,
        secret: secretWithPrefix,
      }),
    ).toBe(true);
  });
});
