import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { buildBookPrompt } from '@/lib/prompts';
import { startBookSession } from '@/lib/agent';
import { spendCreditTx, InsufficientCreditsError } from '@/lib/credits';

export const runtime = 'nodejs';
export const maxDuration = 10;

const BodySchema = z.object({
  topic: z.string().min(3).max(200),
  pages: z.number().int().min(8).max(16).default(12),
  childName: z.string().max(60).optional().nullable(),
  childAge: z.number().int().min(0).max(18).optional().nullable(),
  childDescription: z.string().max(500).optional().nullable(),
  artStyle: z.string().max(60).optional().nullable(),
  parentFirstName: z.string().max(60).optional().nullable(),
  situationSlug: z.string().max(60).optional().nullable(),
  situationOther: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const db = adminDb();
  const userRef = db.collection('users').doc(user.uid);
  const jobRef = db.collection('jobs').doc();
  const txnCol = db.collection('credit_txns');

  // Pre-create the user doc on first call (can't be done by security rules).
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      uid: user.uid,
      email: user.email || '',
      displayName: '',
      photoURL: '',
      credits: 0,
      totalBooksGenerated: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  }

  // Atomic credit spend + job create.
  try {
    await db.runTransaction(async (tx) => {
      await spendCreditTx(tx, userRef, txnCol, user.uid, jobRef.id);
      tx.set(jobRef, {
        jobId: jobRef.id,
        userId: user.uid,
        status: 'pending',
        topic: parsed.data.topic,
        childName: parsed.data.childName ?? null,
        childAge: parsed.data.childAge ?? null,
        childDescription: parsed.data.childDescription ?? null,
        artStyle: parsed.data.artStyle ?? null,
        parentFirstName: parsed.data.parentFirstName ?? null,
        situationSlug: parsed.data.situationSlug ?? null,
        situationOther: parsed.data.situationOther ?? null,
        pages: parsed.data.pages,
        sessionId: '',
        lastEventCursor: null,
        progress: { phase: 'starting', message: 'Starting up...', percent: 5 },
        bookJson: null,
        imageUrls: null,
        pdfUrl: null,
        epubUrl: null,
        error: null,
        createdAt: FieldValue.serverTimestamp(),
        completedAt: null,
        creditDebited: true,
      });
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    throw err;
  }

  // Start the Managed Agents session (outside the transaction).
  try {
    const prompt = buildBookPrompt(parsed.data);
    const { sessionId } = await startBookSession(prompt);
    await jobRef.update({
      sessionId,
      status: 'generating',
    });
  } catch (err: any) {
    await jobRef.update({
      status: 'failed',
      error: { code: 'session_start_failed', message: err?.message || 'Unknown' },
    });
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }

  return NextResponse.json({ jobId: jobRef.id });
}
