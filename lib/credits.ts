import type {
  CollectionReference,
  DocumentReference,
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
  const data = snap.data() as { credits?: number } | undefined;
  const current = data?.credits ?? 0;
  const newBalance = current + amount;

  tx.update(userRef, { credits: newBalance });
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
