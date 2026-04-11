import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { assemblePdf } from '@/lib/pdf';

export const runtime = 'nodejs';
export const maxDuration = 10;

const BodySchema = z.object({
  jobId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
});

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

  // Idempotency: if PDF already built, return.
  if (job.pdfUrl) return NextResponse.json({ url: job.pdfUrl });

  // Download images from Storage in parallel.
  const bucket = adminStorage().bucket();
  const coverBytes = job.imageUrls.cover ? (await bucket.file(coverObjectPath(job.jobId, job.imageUrls.cover)).download())[0] : null;
  const pageBytesArr = await Promise.all(
    job.imageUrls.pages.map(async (_url: string, i: number) => {
      const ext = guessExtFromUrl(job.imageUrls.pages[i]);
      const obj = `jobs/${job.jobId}/images/page_${i + 1}.${ext}`;
      const [buf] = await bucket.file(obj).download();
      return new Uint8Array(buf);
    }),
  );

  // Assemble.
  await jobRef.update({
    progress: { phase: 'building-pdf', message: 'Assembling the PDF...', percent: 85 },
  });

  // Pull the dedication date from the job's createdAt timestamp so every
  // rebuild of the same job produces the same date on the dedication page.
  const dedicationDate: Date = job.createdAt?.toDate ? job.createdAt.toDate() : new Date();

  const pdfBytes = await assemblePdf({
    manifest: job.bookJson,
    coverBytes: coverBytes ? new Uint8Array(coverBytes) : null,
    pageBytes: pageBytesArr,
    childName: job.childName ?? null,
    parentFirstName: job.parentFirstName ?? null,
    dedicationDate,
  });

  // Build a safe filename from the book title so the downloaded file lands as
  // e.g. "lunas-little-song.pdf" instead of a UUID hash.
  const slug = (job.bookJson?.title || 'plubis-book')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'plubis-book';
  const filename = `${slug}.pdf`;

  // Upload.
  const objectPath = `jobs/${job.jobId}/book.pdf`;
  const file = bucket.file(objectPath);
  await file.save(Buffer.from(pdfBytes), {
    metadata: {
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="${filename}"`,
    },
    resumable: false,
  });
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
    responseDisposition: `attachment; filename="${filename}"`,
  });

  await jobRef.update({
    pdfUrl: url,
    progress: { phase: 'building-pdf', message: 'PDF ready', percent: 92 },
  });

  return NextResponse.json({ url });
}

function coverObjectPath(jobId: string, signedUrl: string): string {
  const ext = guessExtFromUrl(signedUrl);
  return `jobs/${jobId}/images/cover.${ext}`;
}

function guessExtFromUrl(url: string): 'jpg' | 'png' {
  // Signed URLs encode the object name in the path. Look for .jpg or .png before the query string.
  const pathOnly = url.split('?')[0];
  return pathOnly.toLowerCase().includes('.jpg') ? 'jpg' : 'png';
}
