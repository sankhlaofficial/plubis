import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyDodoSignature } from '@/lib/dodo';
import { topUpCreditsTx, refundCreditsTx } from '@/lib/credits';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get('webhook-signature') ||
    request.headers.get('x-dodo-signature') ||
    request.headers.get('dodo-signature') ||
    '';
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

  const eventType: string = event?.type || event?.event || '';
  const data = event.data || event.payment || event;

  switch (eventType) {
    case 'payment.succeeded':
      return await handlePaymentSucceeded(data);
    case 'refund.succeeded':
      return await handleRefundSucceeded(data);
    case 'payment.failed':
      // Log only — no DB action. User never reached success_url, no credits to revoke.
      console.log('[dodo webhook] payment.failed', { paymentId: data?.id || data?.payment_id });
      return NextResponse.json({ ok: true, type: 'payment.failed' });
    default:
      // Unknown / unsubscribed event — return 200 so Dodo stops retrying.
      return NextResponse.json({ ok: true, ignored: eventType });
  }
}

async function handlePaymentSucceeded(payment: any): Promise<Response> {
  const paymentId = payment.id || payment.payment_id;
  const metadata = payment.metadata || {};
  const uid = metadata.uid;
  const rawCreditAmount = metadata.creditAmount;

  // Strict validation: must be a string that parses to a positive integer.
  // Rejects: missing, empty, "0", "-5", "1.5", "five", null, undefined.
  // This guards against Dodo (or a spoofed metadata) ever silently debiting.
  if (!uid || !paymentId || typeof rawCreditAmount !== 'string') {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
  }
  if (!/^[1-9][0-9]*$/.test(rawCreditAmount)) {
    return NextResponse.json({ error: 'Invalid creditAmount — must be positive integer' }, { status: 400 });
  }
  const creditAmount = parseInt(rawCreditAmount, 10);

  const db = adminDb();
  const userRef = db.collection('users').doc(uid);
  const txnCol = db.collection('credit_txns');

  // Idempotency: pre-check before transaction.
  const existing = await txnCol.where('dodoPaymentId', '==', paymentId).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  await db.runTransaction(async (tx) => {
    const recheck = await txnCol.where('dodoPaymentId', '==', paymentId).limit(1).get();
    if (!recheck.empty) return;
    await topUpCreditsTx(tx, userRef, txnCol, uid, creditAmount, paymentId);
  });

  return NextResponse.json({ ok: true, type: 'payment.succeeded' });
}

async function handleRefundSucceeded(refund: any): Promise<Response> {
  // Refund events reference an original payment. Try several common field names.
  const refundId = refund.id || refund.refund_id;
  const originalPaymentId =
    refund.payment_id || refund.original_payment_id || refund.payment?.id;

  if (!refundId || !originalPaymentId) {
    return NextResponse.json({ error: 'Missing refund or payment id' }, { status: 400 });
  }

  const db = adminDb();
  const txnCol = db.collection('credit_txns');

  // Idempotency: have we already processed this refund?
  const existingRefund = await txnCol.where('dodoPaymentId', '==', refundId).limit(1).get();
  if (!existingRefund.empty) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  // Find the original purchase to know which user and how many credits to deduct.
  const purchase = await txnCol
    .where('dodoPaymentId', '==', originalPaymentId)
    .where('type', '==', 'purchase')
    .limit(1)
    .get();

  if (purchase.empty) {
    // Refund for a payment we never processed. Log and acknowledge so Dodo stops retrying.
    console.log('[dodo webhook] refund.succeeded for unknown payment', { originalPaymentId, refundId });
    return NextResponse.json({ ok: true, unknownPayment: true });
  }

  const purchaseDoc = purchase.docs[0];
  const purchaseData = purchaseDoc.data();
  const uid = purchaseData.userId as string;
  const amount = purchaseData.amount as number;
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const recheck = await txnCol.where('dodoPaymentId', '==', refundId).limit(1).get();
    if (!recheck.empty) return;
    await refundCreditsTx(tx, userRef, txnCol, uid, amount, refundId);
  });

  return NextResponse.json({ ok: true, type: 'refund.succeeded' });
}
