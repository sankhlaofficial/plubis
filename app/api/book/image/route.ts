import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { generateImage } from '@/lib/images';

export const runtime = 'nodejs';
export const maxDuration = 10;

const BodySchema = z.object({
  // Same character set + length cap as Firestore-safe IDs in /api/book/status.
  jobId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
  // page=0 is cover, page>=1 is story page index (1-based).
  page: z.number().int().min(0),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { jobId, page } = parsed.data;
  const db = adminDb();
  const jobRef = db.collection('jobs').doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const job = snap.data() as any;
  if (job.userId !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!job.bookJson) return NextResponse.json({ error: 'Book manifest not ready' }, { status: 409 });

  // Idempotency: if this image is already uploaded, return the existing URL.
  const existing =
    page === 0 ? job.imageUrls?.cover : job.imageUrls?.pages?.[page - 1];
  if (existing) {
    return NextResponse.json({ url: existing });
  }

  // Pick the prompt.
  let prompt: string;
  if (page === 0) {
    prompt = job.bookJson.cover?.prompt || `Cover illustration for "${job.bookJson.title}"`;
  } else {
    const p = job.bookJson.pages[page - 1];
    if (!p) return NextResponse.json({ error: 'Invalid page index' }, { status: 400 });
    prompt = p.imagePrompt;
  }

  // Inject personalization (Slice 3 passes childDescription; Slice 1 leaves it null).
  if (job.childDescription) {
    prompt = `${prompt}, featuring ${job.childDescription}`;
  }

  // Generate and upload.
  const bytes = await generateImage(prompt);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const ext = isJpeg ? 'jpg' : 'png';
  const contentType = isJpeg ? 'image/jpeg' : 'image/png';
  const fname = page === 0 ? 'cover' : `page_${page}`;
  const objectPath = `jobs/${jobId}/images/${fname}.${ext}`;

  const bucket = adminStorage().bucket();
  const file = bucket.file(objectPath);
  await file.save(Buffer.from(bytes), { contentType, resumable: false });

  // 24-hour signed URL.
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  // Atomic update of the job's imageUrls.
  await db.runTransaction(async (tx) => {
    const s = await tx.get(jobRef);
    const j = s.data() as any;
    const imageUrls = j.imageUrls || { cover: null, pages: new Array(j.bookJson.pages.length).fill(null) };
    if (page === 0) imageUrls.cover = url;
    else imageUrls.pages[page - 1] = url;
    tx.update(jobRef, { imageUrls });
  });

  return NextResponse.json({ url });
}
