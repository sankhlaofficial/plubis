import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { listNewEvents, extractBookJsonFromEvents, deriveProgress } from '@/lib/agent';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

  const db = adminDb();
  const jobRef = db.collection('jobs').doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const job = snap.data() as any;
  if (job.userId !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // If already past generation, just return current state.
  if (job.status !== 'generating') {
    return NextResponse.json(job);
  }

  // Poll for new events since lastEventCursor.
  try {
    const { events, nextCursor, isIdle } = await listNewEvents(job.sessionId, job.lastEventCursor);
    const progress = deriveProgress(events);

    const updates: any = {
      lastEventCursor: nextCursor,
      progress,
    };

    if (isIdle) {
      // Fetch the full event history to find book.json (the final `write` tool call).
      const full = await listNewEvents(job.sessionId, null);
      const bookJson = extractBookJsonFromEvents(full.events);
      if (bookJson) {
        updates.bookJson = bookJson;
        updates.status = 'building';
        updates.progress = { phase: 'generating-images', message: 'Generating illustrations...', percent: 70 };
        // Pre-allocate the imageUrls array to match the page count.
        updates.imageUrls = {
          cover: null,
          pages: new Array(bookJson.pages.length).fill(null),
        };
      } else {
        updates.status = 'failed';
        updates.error = { code: 'no_book_json', message: 'Agent finished but book.json not found in events' };
      }
    }

    await jobRef.update(updates);
    const updated = (await jobRef.get()).data();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: 'Poll failed', message: err?.message }, { status: 500 });
  }
}
