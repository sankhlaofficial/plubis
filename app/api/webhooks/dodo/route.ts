import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyDodoSignature } from '@/lib/dodo';
import { topUpCreditsTx } from '@/lib/credits';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-dodo-signature') || request.headers.get('dodo-signature') || '';
  const secret = process.env.DODO_WEBHOOK_SECRET || '';
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });

  if (!verifyDodoSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only act on successful payment events. Anything else = 200 to stop Dodo retries.
  if (event?.type !== 'payment.succeeded' && event?.event !== 'payment.succeeded') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = event.data || event.payment || event;
  const paymentId = payment.id || payment.payment_id;
  const metadata = payment.metadata || {};
  const uid = metadata.uid;
  const creditAmount = parseInt(metadata.creditAmount || '0', 10);

  if (!uid || !paymentId || !creditAmount) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
  }

  const db = adminDb();
  const userRef = db.collection('users').doc(uid);
  const txnCol = db.collection('credit_txns');

  // Idempotency: look up existing txn by dodoPaymentId before the transaction.
  const existing = await txnCol.where('dodoPaymentId', '==', paymentId).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  await db.runTransaction(async (tx) => {
    // Re-check inside the transaction.
    const recheck = await txnCol.where('dodoPaymentId', '==', paymentId).limit(1).get();
    if (!recheck.empty) return;
    await topUpCreditsTx(tx, userRef, txnCol, uid, creditAmount, paymentId);
  });

  return NextResponse.json({ ok: true });
}
