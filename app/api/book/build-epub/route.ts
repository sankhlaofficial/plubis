import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from '@/lib/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { assembleEpub } from '@/lib/epub';

export const runtime = 'nodejs';
export const maxDuration = 10;

const BodySchema = z.object({ jobId: z.string().min(1) });

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const db = adminDb();
  const jobRef = db.collection('jobs').doc(parsed.data.jobId);
  const snap = await jobRef.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const job = snap.data() as any;
  if (job.userId !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!job.bookJson) return NextResponse.json({ error: 'Book manifest not ready' }, { status: 409 });
  if (!job.imageUrls || job.imageUrls.pages.some((u: string | null) => !u)) {
    return NextResponse.json({ error: 'Images not all ready' }, { status: 409 });
  }
  if (job.epubUrl) return NextResponse.json({ url: job.epubUrl });

  const bucket = adminStorage().bucket();
  const coverBytes = job.imageUrls.cover ? (await bucket.file(coverObjectPath(job.jobId, job.imageUrls.cover)).download())[0] : null;
  const pageBytesArr = await Promise.all(
    job.imageUrls.pages.map(async (_url: string, i: number) => {
      const ext = guessExtFromUrl(job.imageUrls.pages[i]);
      const [buf] = await bucket.file(`jobs/${job.jobId}/images/page_${i + 1}.${ext}`).download();
      return new Uint8Array(buf);
    }),
  );

  await jobRef.update({
    progress: { phase: 'building-epub', message: 'Assembling the EPUB...', percent: 95 },
  });

  const epubBuf = await assembleEpub({
    manifest: job.bookJson,
    coverBytes: coverBytes ? new Uint8Array(coverBytes) : null,
    pageBytes: pageBytesArr,
  });

  const objectPath = `jobs/${job.jobId}/book.epub`;
  const file = bucket.file(objectPath);
  await file.save(epubBuf, { contentType: 'application/epub+zip', resumable: false });
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  await jobRef.update({
    epubUrl: url,
    status: 'complete',
    progress: { phase: 'done', message: 'Done!', percent: 100 },
    completedAt: FieldValue.serverTimestamp(),
  });

  // Bump the user's total counter.
  const userRef = db.collection('users').doc(user.uid);
  await userRef.update({ totalBooksGenerated: FieldValue.increment(1) });

  return NextResponse.json({ url });
}

function coverObjectPath(jobId: string, signedUrl: string): string {
  const ext = guessExtFromUrl(signedUrl);
  return `jobs/${jobId}/images/cover.${ext}`;
}

function guessExtFromUrl(url: string): 'jpg' | 'png' {
  const pathOnly = url.split('?')[0];
  return pathOnly.toLowerCase().includes('.jpg') ? 'jpg' : 'png';
}
