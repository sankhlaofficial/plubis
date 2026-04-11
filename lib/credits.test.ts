import { describe, it, expect, vi } from 'vitest';
import { spendCreditTx, topUpCreditsTx, refundCreditsTx, InsufficientCreditsError } from './credits';

// A minimal fake of a Firestore transaction that lets us assert updates.
// `userExists` controls whether the get() returns an existing doc or not.
function makeFakeTx(initialUser: { credits: number }, userExists = true) {
  const writes: any[] = [];
  const user = { ...initialUser };
  const tx = {
    async get(ref: any) {
      if (ref.__collection === 'users') {
        return { exists: userExists, data: () => (userExists ? user : undefined), id: 'uid' };
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
      if (ref.__collection === 'users') {
        Object.assign(user, data);
      }
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
    // After fix: existing user goes through update path
    expect(writes.some((w) => w.op === 'update' && w.data.credits === 6)).toBe(true);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'purchase')).toBe(true);
  });

  it('creates the user doc if it does not exist (first-touch)', async () => {
    const { tx, writes, user } = makeFakeTx({ credits: 0 }, /* userExists */ false);
    const userRef = { __collection: 'users', id: 'newuid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn99' }) };

    await topUpCreditsTx(tx as any, userRef as any, txnCol as any, 'newuid', 5, 'pay_first_touch');

    // After fix: missing user should be CREATED via set, not crashed
    expect(writes.some((w) => w.op === 'set' && w.ref.__collection === 'users' && w.data.credits === 5)).toBe(true);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'purchase')).toBe(true);
    expect(user.credits).toBe(5);
  });
});

describe('refundCreditsTx', () => {
  it('decrements credits and records a refund transaction', async () => {
    const { tx, writes, user } = makeFakeTx({ credits: 5 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn3' }) };

    await refundCreditsTx(tx as any, userRef as any, txnCol as any, 'uid', 1, 'rfd_456');

    expect(user.credits).toBe(4);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'refund')).toBe(true);
  });

  it('allows balance to go negative when user has spent the refunded credits', async () => {
    const { tx, user } = makeFakeTx({ credits: 0 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn4' }) };

    await refundCreditsTx(tx as any, userRef as any, txnCol as any, 'uid', 1, 'rfd_789');

    expect(user.credits).toBe(-1);
  });
});
