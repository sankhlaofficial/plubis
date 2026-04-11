import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyDodoSignature } from './dodo';

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyDodoSignature', () => {
  const secret = 'test-secret';
  const body = '{"event":"payment.succeeded","data":{"id":"pay_123"}}';

  it('returns true for a valid signature', () => {
    const sig = sign(secret, body);
    expect(verifyDodoSignature(body, sig, secret)).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const sig = sign(secret, body);
    const tampered = body.replace('pay_123', 'pay_999');
    expect(verifyDodoSignature(tampered, sig, secret)).toBe(false);
  });

  it('returns false for an empty signature', () => {
    expect(verifyDodoSignature(body, '', secret)).toBe(false);
  });

  it('is constant-time — returns false for wrong but same-length signature', () => {
    const sig = sign(secret, body);
    const wrong = sig.replace(/./g, 'a').slice(0, sig.length);
    expect(verifyDodoSignature(body, wrong, secret)).toBe(false);
  });
});
