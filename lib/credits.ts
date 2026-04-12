import type {
  CollectionReference,
  DocumentReference,
  Firestore,
  Transaction,
} from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * The size of the free-first-book signup bonus, in credits. Stored here so
 * the same constant is visible to UI copy ("first book is free") and to the
 * backend grant logic — no drift.
 */
export const SIGNUP_BONUS_CREDITS = 1;

/**
 * Grants the free-first-book signup bonus to a user. Idempotent via the
 * `signupBonusGranted` flag on the user doc, so calling this more than once
 * is a no-op after the first call. Creates the user doc on the fly if
 * missing. Safe to call from /api/users/init AND /api/book/create so either
 * entry point can initialize a brand-new user without stepping on the other.
 *
 * Returns `{ granted: boolean, credits: number }` so callers can tell whether
 * a grant just happened and what the current balance is after the call.
 */
export async function grantSignupBonus(
  db: Firestore,
  userId: string,
  opts: { email?: string | null } = {},
): Promise<{ granted: boolean; credits: number }> {
  const userRef = db.collection('users').doc(userId);
  const txnCol = db.collection('credit_txns');

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const exists = snap.exists;
    const data = (snap.data() || {}) as {
      credits?: number;
      signupBonusGranted?: boolean;
      totalBooksGenerated?: number;
    };

    // Already granted: no-op. Return current balance.
    if (exists && data.signupBonusGranted === true) {
      return { granted: false, credits: data.credits ?? 0 };
    }

    // Legacy users who already generated books before signup-bonus existed
    // shouldn't retroactively get a free book. Mark them as granted so future
    // calls short-circuit, but don't actually add credits.
    if (exists && (data.totalBooksGenerated ?? 0) > 0) {
      tx.update(userRef, { signupBonusGranted: true });
      return { granted: false, credits: data.credits ?? 0 };
    }

    const currentCredits = data.credits ?? 0;
    const newBalance = currentCredits + SIGNUP_BONUS_CREDITS;

    if (exists) {
      tx.update(userRef, {
        credits: newBalance,
        signupBonusGranted: true,
        lastActiveAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(userRef, {
        uid: userId,
        email: opts.email || '',
        displayName: '',
        photoURL: '',
        credits: newBalance,
        totalBooksGenerated: 0,
        signupBonusGranted: true,
        createdAt: FieldValue.serverTimestamp(),
        lastActiveAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(txnCol.doc(), {
      userId,
      type: 'signup_bonus',
      amount: SIGNUP_BONUS_CREDITS,
      balanceAfter: newBalance,
      jobId: null,
      dodoPaymentId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { granted: true, credits: newBalance };
  });
}

/**
 * Inside a Firestore transaction, decrement the user's credit balance by 1
 * and record a 'spend' credit_txn. Throws InsufficientCreditsError if the
 * balance is < 1.
 */
export async function spendCreditTx(
  tx: Transaction,
  userRef: DocumentReference,
  txnCol: CollectionReference,
  userId: string,
  jobId: string,
): Promise<number> {
  const snap = await tx.get(userRef);
  const data = snap.data() as { credits?: number } | undefined;
  const current = data?.credits ?? 0;
  if (current < 1) throw new InsufficientCreditsError();

  const newBalance = current - 1;
  tx.update(userRef, { credits: newBalance });
  tx.set(txnCol.doc(), {
    userId,
    type: 'spend',
    amount: -1,
    balanceAfter: newBalance,
    jobId,
    dodoPaymentId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return newBalance;
}

/**
 * Inside a Firestore transaction, increment credits by `amount` and record
 * a 'purchase' credit_txn. Idempotent via dodoPaymentId — caller should
 * pre-check by querying for an existing txn with this paymentId before
 * running the transaction.
 *
 * Uses set with merge so the user doc is created on the fly if the user
 * has paid before they ever called /api/book/create (which is the only
 * other place that pre-creates the doc). Without merge, tx.update would
 * throw on a non-existent user doc.
 */
export async function topUpCreditsTx(
  tx: Transaction,
  userRef: DocumentReference,
  txnCol: CollectionReference,
  userId: string,
  amount: number,
  dodoPaymentId: string,
): Promise<number> {
  const snap = await tx.get(userRef);
  const exists = snap.exists;
  const data = snap.data() as { credits?: number } | undefined;
  const current = data?.credits ?? 0;
  const newBalance = current + amount;

  if (exists) {
    tx.update(userRef, { credits: newBalance });
  } else {
    // First-touch user doc creation. Other fields (email, displayName, etc.)
    // get filled in on first /api/book/create call.
    tx.set(userRef, {
      uid: userId,
      email: '',
      displayName: '',
      photoURL: '',
      credits: newBalance,
      totalBooksGenerated: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  }

  tx.set(txnCol.doc(), {
    userId,
    type: 'purchase',
    amount,
    balanceAfter: newBalance,
    jobId: null,
    dodoPaymentId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return newBalance;
}

/**
 * Inside a Firestore transaction, decrement credits by `amount` (in response
 * to a refund or chargeback) and record a 'refund' credit_txn. Allows the
 * resulting balance to go negative — if a user spent the credits before the
 * refund, their balance becomes negative until they buy more. This protects
 * against chargeback abuse where a user pays, generates a book, then refunds.
 *
 * Idempotent via refundPaymentId — caller should pre-check by querying for
 * an existing refund txn with this paymentId before running the transaction.
 */
export async function refundCreditsTx(
  tx: Transaction,
  userRef: DocumentReference,
  txnCol: CollectionReference,
  userId: string,
  amount: number,
  refundPaymentId: string,
): Promise<number> {
  const snap = await tx.get(userRef);
  const data = snap.data() as { credits?: number } | undefined;
  const current = data?.credits ?? 0;
  const newBalance = current - amount;

  tx.update(userRef, { credits: newBalance });
  tx.set(txnCol.doc(), {
    userId,
    type: 'refund',
    amount: -amount,
    balanceAfter: newBalance,
    jobId: null,
    dodoPaymentId: refundPaymentId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return newBalance;
}
