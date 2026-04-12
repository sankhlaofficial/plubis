import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const childName = (body.childName || '').trim() || null;

    const db = adminDb();
    // Use email as doc ID for idempotency — duplicate submissions
    // update the timestamp without creating a new record.
    const docId = email.replace(/[^a-z0-9@._-]/gi, '_');
    await db.collection('leads').doc(docId).set(
      {
        email,
        childName,
        source: 'landing_email_capture',
        updatedAt: new Date(),
        createdAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('leads POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
