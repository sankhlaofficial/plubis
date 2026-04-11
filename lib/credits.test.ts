import { describe, it, expect, vi } from 'vitest';
import { spendCreditTx, topUpCreditsTx, InsufficientCreditsError } from './credits';

// A minimal fake of a Firestore transaction that lets us assert updates.
function makeFakeTx(initialUser: { credits: number }) {
  const writes: any[] = [];
  const user = { ...initialUser };
  const tx = {
    async get(ref: any) {
      if (ref.__collection === 'users') {
        return { exists: true, data: () => user, id: 'uid' };
      }
      // Empty query result for idempotency checks.
      return { empty: true, size: 0 };
    },
    update(ref: any, data: any) {
      if (ref.__collection === 'users') {
        Object.assign(user, data);
      }
      writes.push({ op: 'update', ref, data });
    },
    set(ref: any, data: any) {
      writes.push({ op: 'set', ref, data });
    },
  };
  return { tx, writes, user };
}

describe('spendCreditTx', () => {
  it('decrements credits and records a spend transaction', async () => {
    const { tx, writes, user } = makeFakeTx({ credits: 3 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn1' }) };

    await spendCreditTx(tx as any, userRef as any, txnCol as any, 'uid', 'job1');

    expect(user.credits).toBe(2);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'spend')).toBe(true);
  });

  it('throws InsufficientCreditsError when balance is zero', async () => {
    const { tx } = makeFakeTx({ credits: 0 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn1' }) };
    await expect(
      spendCreditTx(tx as any, userRef as any, txnCol as any, 'uid', 'job1'),
    ).rejects.toThrow(InsufficientCreditsError);
  });
});

describe('topUpCreditsTx', () => {
  it('increments credits and records a purchase transaction', async () => {
    const { tx, writes, user } = makeFakeTx({ credits: 1 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn2' }) };

    await topUpCreditsTx(tx as any, userRef as any, txnCol as any, 'uid', 5, 'pay_123');

    expect(user.credits).toBe(6);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'purchase')).toBe(true);
  });
});
