# Storybook SaaS — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working $5 children's book generator that takes one paid user from Google sign-in through credit purchase, book generation, and PDF + EPUB download — deployed on free-tier cardless infrastructure.

**Architecture:** Next.js 15 App Router on Vercel Hobby + Firebase Spark (Auth + Firestore + Storage) + Dodo Payments, with the existing Managed Agents agent (`agent_011CZv5BFMhRFqHNKuRzR1wh`) running on Anthropic's servers. The browser orchestrates a multi-step generation flow, calling short Vercel API routes (all under 10 seconds each) so nothing requires a long-running worker.

**Tech Stack:** Next.js 15, React 18, TypeScript 5.4, Tailwind 3.4, shadcn/ui, Firebase Admin SDK, Firebase client SDK (v10), `@anthropic-ai/sdk@^0.87.0`, `pdf-lib@^1.17.1`, `archiver`, `dodo-payments`, `vitest` for unit tests, `zod` for runtime validation.

**Spec reference:** `docs/superpowers/specs/2026-04-11-storybook-saas-design.md` — implements Slice 1 only (Section 13).

**Source to reuse:** The CLI at `/Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/{agent,pdf,epub,images}.js` — ported file-by-file into `lib/`.

---

## File Structure (Slice 1)

Files created during Slice 1:

```
storybook-saas/
├── .env.example                         Env var template
├── .gitignore                           Already exists
├── firestore.rules                      Security rules
├── next.config.ts                       Next.js config
├── package.json                         Dependencies
├── postcss.config.mjs                   PostCSS (Tailwind)
├── tailwind.config.ts                   Tailwind config
├── tsconfig.json                        TypeScript config
├── vitest.config.ts                     Vitest config
├── app/
│   ├── globals.css                      Tailwind base + custom CSS vars
│   ├── layout.tsx                       Root layout, fonts, AuthProvider
│   ├── page.tsx                         Minimal landing page (public)
│   ├── login/page.tsx                   Google sign-in button
│   ├── new/page.tsx                     Book creation form (authed)
│   ├── library/page.tsx                 Book list (authed)
│   ├── job/[id]/page.tsx                Live progress + download (authed)
│   └── api/
│       ├── book/
│       │   ├── create/route.ts          POST: start session, deduct credit
│       │   ├── status/route.ts          GET:  poll events, update job
│       │   ├── image/route.ts           POST: generate one Cloudflare image
│       │   ├── build-pdf/route.ts       POST: assemble PDF
│       │   └── build-epub/route.ts      POST: assemble EPUB
│       ├── checkout/route.ts            GET:  create Dodo checkout
│       └── webhooks/dodo/route.ts       POST: process payment → top up credits
├── components/
│   ├── AuthProvider.tsx                 Firebase auth context
│   ├── LoginButton.tsx                  Google sign-in button
│   ├── NewBookForm.tsx                  /new form component
│   ├── JobProgress.tsx                  /job/[id] live progress component
│   └── LibraryGrid.tsx                  /library grid component
└── lib/
    ├── agent.ts                         Ported from storybook-agent/src/agent.js
    ├── auth.ts                          Verify Firebase ID token (server helper)
    ├── brand.ts                         BRAND_NAME, DOMAIN, SUPPORT_EMAIL
    ├── credits.ts                       Atomic Firestore credit mutations
    ├── credits.test.ts                  Unit tests for credit helpers
    ├── dodo.ts                          Dodo client + HMAC verification
    ├── dodo.test.ts                     Unit tests for HMAC verification
    ├── epub.ts                          Ported from storybook-agent/src/epub.js
    ├── firebase-admin.ts                Server-side Firebase SDK init
    ├── firebase-client.ts               Client-side Firebase SDK init
    ├── images.ts                        Ported from storybook-agent/src/images.js
    ├── pdf.ts                           Ported from storybook-agent/src/pdf.js
    ├── prompts.ts                       Build agent message from topic
    ├── prompts.test.ts                  Unit tests for prompt builder
    └── types.ts                         Shared TypeScript types (Job, User, CreditTxn)
```

Each file has one clear responsibility. API routes are thin wrappers that call library functions — business logic lives in `lib/`.

---

## Task 1: Scaffold Next.js 15 project with TypeScript + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Initialize Next.js**

The current directory already contains `docs/` and `.gitignore`, which will conflict with `create-next-app`. Move them aside, scaffold, then merge back.

Run:
```bash
cd /Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas
mv docs .docs.tmp
mv .gitignore .gitignore.tmp
npx create-next-app@15 . --ts --tailwind --app --no-src-dir --import-alias="@/*" --eslint --use-npm --skip-install
```

Expected: create-next-app scaffolds the project in place without prompting (all flags non-interactive). If it still prompts about an existing directory, answer `y`.

Then restore the preserved files and merge `.gitignore`:
```bash
rm -rf node_modules .next 2>/dev/null
mv .docs.tmp docs
# Merge the Next.js .gitignore into the existing one we preserved.
cat .gitignore >> .gitignore.tmp
sort -u .gitignore.tmp > .gitignore
rm .gitignore.tmp
npm install
```

Expected: `node_modules/` populated, `docs/` intact, `.gitignore` contains both the storybook-saas entries and the Next.js defaults (deduplicated).

- [ ] **Step 2: Verify scaffold runs**

Run:
```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`, default Next.js page renders. Kill with Ctrl+C.

- [ ] **Step 3: Commit scaffold**

```bash
git add .
git commit -m "scaffold: Next.js 15 + TypeScript + Tailwind + App Router"
```

---

## Task 2: Install runtime dependencies + dev tooling

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install @anthropic-ai/sdk@^0.87.0 firebase firebase-admin pdf-lib@^1.17.1 archiver zod
```

- [ ] **Step 2: Install dev dependencies**

Run:
```bash
npm install -D vitest @vitest/ui @types/archiver
```

- [ ] **Step 3: Verify install**

Run:
```bash
npm list --depth=0
```

Expected: all packages listed with no `UNMET` errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add Anthropic SDK, Firebase, pdf-lib, archiver, zod, vitest"
```

---

## Task 3: Set up Vitest and create brand constants

**Files:**
- Create: `vitest.config.ts`, `lib/brand.ts`, `.env.example`

- [ ] **Step 1: Create Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 2: Add test script to package.json**

Edit `package.json` `scripts` to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create brand constants**

Create `lib/brand.ts`:
```ts
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Storybook';
export const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@example.com';
export const TAGLINE = 'Make your child the hero of a bedtime book in 5 minutes.';
```

- [ ] **Step 4: Create .env.example**

Create `.env.example`:
```
# Anthropic Managed Agents
ANTHROPIC_API_KEY=sk-ant-...
AGENT_ID=agent_011CZv5BFMhRFqHNKuRzR1wh
ENVIRONMENT_ID=env_0162HaoNtM5JEqboxhYge5mP

# Cloudflare Workers AI
CF_ACCOUNT_ID=
CF_API_TOKEN=

# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Dodo Payments
DODO_API_KEY=
DODO_WEBHOOK_SECRET=
DODO_PRODUCT_CREDIT_1=

# Admin
ADMIN_KEY=

# Branding
NEXT_PUBLIC_BRAND_NAME=Storybook
NEXT_PUBLIC_DOMAIN=storybook.example.com
NEXT_PUBLIC_SUPPORT_EMAIL=hello@example.com
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json lib/brand.ts .env.example
git commit -m "chore: vitest config, brand constants, env template"
```

---

## Task 4: Define shared TypeScript types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create types file**

Create `lib/types.ts`:
```ts
import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  credits: number;
  totalBooksGenerated: number;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

export type JobStatus =
  | 'pending'
  | 'generating'
  | 'building'
  | 'complete'
  | 'failed';

export type JobPhase =
  | 'starting'
  | 'researching'
  | 'writing'
  | 'drafting-images'
  | 'generating-images'
  | 'building-pdf'
  | 'building-epub'
  | 'done';

export interface JobProgress {
  phase: JobPhase;
  message: string;
  percent: number;
}

export interface BookPage {
  pageNumber: number;
  text: string;
  imageFile: string;
  imagePrompt: string;
}

export interface BookManifest {
  title: string;
  subtitle?: string;
  author?: string;
  pages: BookPage[];
  cover: { prompt: string };
}

export interface Job {
  jobId: string;
  userId: string;
  status: JobStatus;
  topic: string;
  childName: string | null;
  childAge: number | null;
  childDescription: string | null;
  artStyle: string | null;
  pages: number;
  sessionId: string;
  lastEventCursor: string | null;
  progress: JobProgress;
  bookJson: BookManifest | null;
  imageUrls: { cover: string | null; pages: (string | null)[] } | null;
  pdfUrl: string | null;
  epubUrl: string | null;
  error: { code: string; message: string } | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  creditDebited: boolean;
}

export type CreditTxnType = 'purchase' | 'spend' | 'refund';

export interface CreditTxn {
  txnId: string;
  userId: string;
  type: CreditTxnType;
  amount: number;
  balanceAfter: number;
  jobId: string | null;
  dodoPaymentId: string | null;
  createdAt: Timestamp;
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "types: User, Job, CreditTxn, BookManifest"
```

---

## Task 5: Port lib/agent.ts from the CLI

**Files:**
- Source: `/Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/agent.js`
- Create: `lib/agent.ts`

The CLI's `agent.js` uses `client.beta.sessions.events.stream()` (streaming). The SaaS uses `client.beta.sessions.events.list()` (polling). Both workflows share: session creation, message sending, event extraction, file download fallback. We port the shared parts and add a polling helper.

- [ ] **Step 1: Read the source file**

Run:
```bash
cat /Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/agent.js
```

Note the exports: `runStorybookAgent(topic, options)` and `downloadSessionFiles(sessionId, outputDir)`.

- [ ] **Step 2: Create the ported file**

Create `lib/agent.ts`:
```ts
import Anthropic from '@anthropic-ai/sdk';
import type { BookManifest } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface StartSessionResult {
  sessionId: string;
}

/**
 * Creates a new Managed Agents session and sends the initial user message.
 * Returns the session ID for subsequent polling.
 */
export async function startBookSession(prompt: string): Promise<StartSessionResult> {
  const agentId = process.env.AGENT_ID!;
  const environmentId = process.env.ENVIRONMENT_ID!;

  const session = await client.beta.sessions.create({
    agent: { type: 'agent', id: agentId },
    environment_id: environmentId,
  } as any);

  await client.beta.sessions.messages.create(session.id, {
    content: prompt,
  } as any);

  return { sessionId: session.id };
}

export interface SessionEventsResult {
  events: any[];
  nextCursor: string | null;
  isIdle: boolean;
}

/**
 * Lists new events since the given cursor. Returns the events, the new cursor,
 * and whether the session reached idle status.
 */
export async function listNewEvents(
  sessionId: string,
  afterCursor: string | null,
): Promise<SessionEventsResult> {
  const params: any = {};
  if (afterCursor) params.after = afterCursor;

  const resp: any = await (client.beta.sessions as any).events.list(sessionId, params);
  const events = resp.data || [];
  const nextCursor = events.length > 0 ? events[events.length - 1].id : afterCursor;
  const isIdle = events.some((e: any) => e.type === 'session.status_idle');

  return { events, nextCursor, isIdle };
}

/**
 * Scans event history for a write-tool call whose content looks like book.json.
 * Mirrors the CLI fallback when the Files API returns zero files.
 */
export function extractBookJsonFromEvents(events: any[]): BookManifest | null {
  for (const ev of events) {
    if (ev.type === 'agent.tool_use') {
      const toolName = ev.name || ev.tool_name;
      if (toolName === 'write') {
        const content = ev.input?.content;
        if (typeof content === 'string' && content.includes('"pages"')) {
          try {
            return JSON.parse(content) as BookManifest;
          } catch {
            continue;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Derives a user-facing progress message from the most recent event type.
 */
export function deriveProgress(events: any[]): { phase: string; message: string; percent: number } {
  if (events.length === 0) {
    return { phase: 'starting', message: 'Starting up...', percent: 5 };
  }
  const last = events[events.length - 1];
  const type = last.type;

  if (type === 'agent.tool_use') {
    const tool = last.name || last.tool_name;
    if (tool === 'web_search') return { phase: 'researching', message: 'Researching ideas...', percent: 15 };
    if (tool === 'write') return { phase: 'writing', message: 'Writing the story...', percent: 45 };
    if (tool === 'bash') return { phase: 'drafting-images', message: 'Preparing illustrations...', percent: 55 };
  }
  if (type === 'agent.message') {
    return { phase: 'writing', message: 'Thinking...', percent: 25 };
  }
  if (type === 'session.status_idle') {
    return { phase: 'generating-images', message: 'Story ready, generating pictures...', percent: 70 };
  }
  return { phase: 'writing', message: 'Working...', percent: 30 };
}
```

Porting notes captured inline:
- `client.beta.sessions.events.list()` is correct — the CLI memory confirms `events.stream()` is the streaming equivalent on `events`, not on `sessions` directly.
- The `as any` casts are a deliberate short-term workaround because `@anthropic-ai/sdk@0.87.0` ships beta types that don't yet include Managed Agents signatures. Remove the casts when the SDK upgrades.
- `extractBookJsonFromEvents` reproduces the exact fallback the CLI uses in `storybook.js` when the Files API returns zero files — a known Managed Agents beta bug documented in memory.

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/agent.ts
git commit -m "lib: port agent runner from CLI (polling-based for browser orchestration)"
```

---

## Task 6: Port lib/pdf.ts from the CLI

**Files:**
- Source: `/Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/pdf.js`
- Create: `lib/pdf.ts`

The CLI's `pdf.js` reads images from disk. The SaaS receives image bytes directly from memory (fetched from Firebase Storage). The port changes the I/O boundary: input is `{ manifest, imageBytes: Record<pageKey, Buffer> }`, output is `Uint8Array` (PDF bytes). All KDP compliance rules stay intact.

- [ ] **Step 1: Read the source**

Run:
```bash
cat /Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/pdf.js
```

Note the constants (PAGE_WIDTH, MARGIN, TEXT_AREA_HEIGHT, KDP_MIN_PAGES), the front-matter pages, the story page loop, the back-matter pages, and the `tryEmbedImage` + `wrapText` helpers.

- [ ] **Step 2: Create the ported file**

Create `lib/pdf.ts`:
```ts
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFImage } from 'pdf-lib';
import type { BookManifest } from './types';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 612;
const MARGIN = 48;
const SAFE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SAFE_HEIGHT = PAGE_HEIGHT - MARGIN * 2;
const TEXT_AREA_HEIGHT = 130;
const KDP_MIN_PAGES = 24;

export interface AssemblePdfInput {
  manifest: BookManifest;
  coverBytes: Uint8Array | null;
  pageBytes: (Uint8Array | null)[];
  author?: string;
}

export async function assemblePdf(input: AssemblePdfInput): Promise<Uint8Array> {
  const { manifest, pageBytes, author = 'Aditya Sankhla' } = input;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const centerText = (
    page: any,
    text: string,
    f: PDFFont,
    size: number,
    y: number,
    color = rgb(0.15, 0.15, 0.15),
  ) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_WIDTH - w) / 2, y, size, font: f, color });
  };

  const addBlankPage = () => pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // --- Front matter (6 pages) ---

  const halfTitle = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(halfTitle, manifest.title, boldFont, 24, PAGE_HEIGHT / 2);

  addBlankPage();

  const titlePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(titlePage, manifest.title, boldFont, 28, PAGE_HEIGHT / 2 + 40);
  if (manifest.subtitle) {
    centerText(titlePage, manifest.subtitle, italicFont, 14, PAGE_HEIGHT / 2);
  }
  centerText(titlePage, 'Written and illustrated with AI', font, 11, PAGE_HEIGHT / 2 - 35, rgb(0.5, 0.5, 0.5));
  centerText(titlePage, `By ${author}`, font, 13, PAGE_HEIGHT / 2 - 60);

  const copyrightPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const cpLines = [
    manifest.title,
    '',
    'Text and illustrations generated with artificial intelligence.',
    '',
    `Copyright ${new Date().getFullYear()} ${author}`,
    'All rights reserved.',
    '',
    'First edition.',
  ];
  let cy = PAGE_HEIGHT / 2 + 60;
  for (const line of cpLines) {
    if (line) centerText(copyrightPage, line, font, 10, cy, rgb(0.4, 0.4, 0.4));
    cy -= 18;
  }

  const dedPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(dedPage, 'For every little reader', italicFont, 18, PAGE_HEIGHT / 2 + 15);
  centerText(dedPage, 'who dreams at bedtime.', italicFont, 18, PAGE_HEIGHT / 2 - 15);

  addBlankPage();

  // --- Story pages ---

  for (let i = 0; i < manifest.pages.length; i++) {
    const page = manifest.pages[i];
    const bytes = pageBytes[i];
    const pdfPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const imgX = MARGIN;
    const imgY = MARGIN + TEXT_AREA_HEIGHT;
    const imgW = SAFE_WIDTH;
    const imgH = PAGE_HEIGHT - MARGIN - imgY;

    const img = await tryEmbedImage(pdfDoc, bytes);
    if (img) {
      pdfPage.drawImage(img, { x: imgX, y: imgY, width: imgW, height: imgH });
    } else {
      pdfPage.drawRectangle({
        x: imgX,
        y: imgY,
        width: imgW,
        height: imgH,
        color: rgb(0.93, 0.93, 0.97),
      });
    }

    pdfPage.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width: SAFE_WIDTH,
      height: TEXT_AREA_HEIGHT,
      color: rgb(0.99, 0.99, 1),
      opacity: 0.95,
    });

    const textLines = wrapText(page.text, font, 16, SAFE_WIDTH - 30);
    let ty = MARGIN + TEXT_AREA_HEIGHT - 28;
    for (const line of textLines) {
      pdfPage.drawText(line, {
        x: MARGIN + 15,
        y: ty,
        size: 16,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      ty -= 24;
    }

    const pn = `${page.pageNumber}`;
    const pnW = font.widthOfTextAtSize(pn, 9);
    pdfPage.drawText(pn, {
      x: (PAGE_WIDTH - pnW) / 2,
      y: MARGIN + 5,
      size: 9,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  // --- Back matter ---

  const endPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  endPage.drawRectangle({
    x: MARGIN,
    y: MARGIN,
    width: SAFE_WIDTH,
    height: SAFE_HEIGHT,
    color: rgb(0.97, 0.97, 1),
  });
  centerText(endPage, 'The End', boldFont, 36, PAGE_HEIGHT / 2);

  const aboutPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(aboutPage, 'A Note for Parents', boldFont, 18, PAGE_HEIGHT / 2 + 80);
  const noteLines = wrapText(
    'This book was created using artificial intelligence. Both the story and the illustrations were generated by AI, guided by a new dad who wanted to create something special for his son. We hope this little book makes your child smile at bedtime.',
    font,
    12,
    SAFE_WIDTH - 40,
  );
  let ny = PAGE_HEIGHT / 2 + 40;
  for (const line of noteLines) {
    centerText(aboutPage, line, font, 12, ny, rgb(0.35, 0.35, 0.35));
    ny -= 20;
  }

  // --- Pad to KDP minimum ---
  while (pdfDoc.getPageCount() < KDP_MIN_PAGES) {
    addBlankPage();
  }

  return await pdfDoc.save();
}

async function tryEmbedImage(pdfDoc: PDFDocument, bytes: Uint8Array | null): Promise<PDFImage | null> {
  if (!bytes || bytes.length < 2) return null;
  // Magic bytes: JPEG=FFD8, PNG=8950
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return await pdfDoc.embedJpg(bytes);
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return await pdfDoc.embedPng(bytes);
  }
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {}
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch {}
  return null;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
```

Porting notes captured inline:
- Image input is now `Uint8Array` (in-memory) instead of disk paths. Magic-byte detection stays identical.
- 48pt margin, 24-page minimum, front matter (6 pages), back matter (2 pages) — all preserved from CLI per the KDP rules in memory.
- `coverBytes` is accepted in the signature for forward compatibility with Slice 4 (showing cover on the title page) but not used in Slice 1.

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/pdf.ts
git commit -m "lib: port KDP-compliant PDF assembler from CLI"
```

---

## Task 7: Port lib/epub.ts from the CLI

**Files:**
- Source: `/Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/epub.js`
- Create: `lib/epub.ts`

Same porting strategy as `pdf.ts`: input is in-memory image bytes, output is EPUB bytes. Instead of `archiver` piping to a file stream, we collect into an in-memory buffer.

- [ ] **Step 1: Read the source**

Run:
```bash
cat /Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/epub.js
```

Key preserved behaviors: `mimetype` first, `store: true`, nav.xhtml with `epub:type="toc"`, image IDs prefixed with `img_`, `dcterms:modified` metadata.

- [ ] **Step 2: Create the ported file**

Create `lib/epub.ts`:
```ts
import archiver from 'archiver';
import { PassThrough } from 'stream';
import type { BookManifest } from './types';

export interface AssembleEpubInput {
  manifest: BookManifest;
  coverBytes: Uint8Array | null;
  pageBytes: (Uint8Array | null)[];
  author?: string;
}

interface ImageEntry {
  id: string;
  fname: string;
  mime: string;
}

interface Chapter {
  id: string;
  title: string;
  html: string;
}

export async function assembleEpub(input: AssembleEpubInput): Promise<Buffer> {
  const { manifest, coverBytes, pageBytes, author = 'Aditya Sankhla' } = input;

  const pass = new PassThrough();
  const chunks: Buffer[] = [];
  pass.on('data', (c) => chunks.push(c));

  const archive = archiver('zip', { store: true });
  archive.pipe(pass);

  archive.append('application/epub+zip', { name: 'mimetype' });

  archive.append(
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    { name: 'META-INF/container.xml' },
  );

  const imageEntries: ImageEntry[] = [];

  const addImage = (bytes: Uint8Array | null, id: string): string | null => {
    if (!bytes || bytes.length < 2) return null;
    const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/png';
    const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
    const fname = `${id}.${ext}`;
    archive.append(Buffer.from(bytes), { name: `OEBPS/images/${fname}` });
    imageEntries.push({ id, fname, mime });
    return `images/${fname}`;
  };

  const coverSrc = addImage(coverBytes, 'cover');
  const pageSrcs: (string | null)[] = [];
  for (let i = 0; i < manifest.pages.length; i++) {
    const page = manifest.pages[i];
    pageSrcs.push(addImage(pageBytes[i], `page${page.pageNumber}`));
  }

  const chapters: Chapter[] = [];

  chapters.push({
    id: 'cover',
    title: manifest.title,
    html: `<html><body style="text-align:center">
${coverSrc ? `<img src="${coverSrc}" style="max-width:100%;max-height:90vh" />` : ''}
<h1>${manifest.title}</h1>
<p><em>${manifest.subtitle || ''}</em></p>
<p>By ${author}</p></body></html>`,
  });

  chapters.push({
    id: 'dedication',
    title: 'Dedication',
    html:
      '<html><body style="text-align:center;padding-top:30%"><p><em>For every little reader<br/>who dreams at bedtime.</em></p></body></html>',
  });

  for (let i = 0; i < manifest.pages.length; i++) {
    const page = manifest.pages[i];
    const src = pageSrcs[i];
    chapters.push({
      id: `page${page.pageNumber}`,
      title: `Page ${page.pageNumber}`,
      html: `<html><body style="text-align:center">
${src ? `<img src="${src}" style="max-width:100%;max-height:70vh;margin-bottom:20px" />` : ''}
<p style="font-size:1.3em;line-height:1.6;padding:10px 20px">${page.text}</p></body></html>`,
    });
  }

  chapters.push({
    id: 'theend',
    title: 'The End',
    html:
      '<html><body style="text-align:center;padding-top:30%"><h1 style="color:#5959aa">The End</h1></body></html>',
  });

  chapters.push({
    id: 'note',
    title: 'A Note for Parents',
    html: `<html><body style="padding:20px"><h2>A Note for Parents</h2><p>This book was created using artificial intelligence. Both the story and the illustrations were generated by AI, guided by a new dad who wanted to create something special for his son. We hope this little book makes your child smile at bedtime.</p></body></html>`,
  });

  for (const ch of chapters) {
    archive.append(ch.html, { name: `OEBPS/${ch.id}.xhtml` });
  }

  const navItems = chapters
    .map((ch) => `      <li><a href="${ch.id}.xhtml">${ch.title}</a></li>`)
    .join('\n');

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`,
    { name: 'OEBPS/nav.xhtml' },
  );

  const manifestItems = chapters
    .map((ch) => `    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const imageItems = imageEntries
    .map(
      (img) =>
        `    <item id="img_${img.id}" href="images/${img.fname}" media-type="${img.mime}"/>`,
    )
    .join('\n');
  const spineItems = chapters.map((ch) => `    <itemref idref="${ch.id}"/>`).join('\n');
  const slug = manifest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  const bookId = slug + '-' + new Date().getFullYear();

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${manifest.title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifestItems}
${imageItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`,
    { name: 'OEBPS/content.opf' },
  );

  const navPoints = chapters
    .map(
      (ch, i) =>
        `    <navPoint id="nav${i}" playOrder="${i + 1}"><navLabel><text>${ch.title}</text></navLabel><content src="${ch.id}.xhtml"/></navPoint>`,
    )
    .join('\n');

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookId}"/></head>
  <docTitle><text>${manifest.title}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`,
    { name: 'OEBPS/toc.ncx' },
  );

  await archive.finalize();
  await new Promise<void>((resolve) => pass.on('end', () => resolve()));

  return Buffer.concat(chunks);
}
```

Porting notes inline:
- Uses `PassThrough` to collect into memory instead of piping to a file stream.
- `Buffer.from(bytes)` normalizes `Uint8Array` input so `archiver` handles it correctly.
- All EPUB 3 rules preserved: mimetype first, nav.xhtml with `epub:type="toc"`, `dcterms:modified`, `img_` prefix on image IDs, both nav.xhtml (EPUB 3) and toc.ncx (EPUB 2 fallback).

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/epub.ts
git commit -m "lib: port KDP-compliant EPUB 3 assembler from CLI"
```

---

## Task 8: Port lib/images.ts from the CLI

**Files:**
- Source: `/Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/images.js`
- Create: `lib/images.ts`

The CLI's `generateImagesLocally` loops through a manifest and writes files to disk. The SaaS generates one image at a time (called from a parallel API route). We only need the per-image function.

- [ ] **Step 1: Read the source**

Run:
```bash
cat /Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/src/images.js
```

- [ ] **Step 2: Create the ported file**

Create `lib/images.ts`:
```ts
/**
 * Calls Cloudflare Workers AI (Flux Schnell) to generate a single image.
 * Returns the image bytes as a Uint8Array, or throws on failure.
 */
export async function generateImage(prompt: string): Promise<Uint8Array> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare credentials not configured');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Cloudflare image API ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  if (!data?.result?.image) {
    throw new Error('Cloudflare response missing result.image');
  }

  return Uint8Array.from(Buffer.from(data.result.image, 'base64'));
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/images.ts
git commit -m "lib: port Cloudflare Flux Schnell image generator from CLI"
```

---

## Task 9: Create prompts.ts with unit test (TDD)

**Files:**
- Create: `lib/prompts.test.ts`, `lib/prompts.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/prompts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildBookPrompt } from './prompts';

describe('buildBookPrompt', () => {
  it('includes topic and page count', () => {
    const prompt = buildBookPrompt({ topic: 'a brave little fox', pages: 10 });
    expect(prompt).toContain('a brave little fox');
    expect(prompt).toContain('10');
    expect(prompt).toContain('book.json');
  });

  it('instructs the agent to output images under /mnt/session/outputs', () => {
    const prompt = buildBookPrompt({ topic: 'fireflies', pages: 12 });
    expect(prompt).toContain('imagePrompt');
    expect(prompt).toContain('2-3 sentences');
  });

  it('omits personalization when fields are absent', () => {
    const prompt = buildBookPrompt({ topic: 'clouds', pages: 12 });
    expect(prompt).not.toContain('hero of the story is named');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test
```

Expected: FAIL — `Cannot find module './prompts'`.

- [ ] **Step 3: Implement the prompt builder**

Create `lib/prompts.ts`:
```ts
export interface BookPromptInput {
  topic: string;
  pages: number;
  childName?: string | null;
  childAge?: number | null;
  childDescription?: string | null;
  artStyle?: string | null;
}

/**
 * Builds the initial user message sent to the Managed Agent.
 * Slice 1: topic + pages only. Personalization fields are wired for Slice 3
 * but safe to pass here — they are only rendered if present.
 */
export function buildBookPrompt(input: BookPromptInput): string {
  const { topic, pages, childName, childAge, childDescription, artStyle } = input;

  const parts: string[] = [
    `Write a ${pages}-page children's picture book about: ${topic}`,
    '',
    'Story rules:',
    '- 2-3 sentences per page, warm, bedtime-friendly, ending with resolution.',
    '- Use simple vocabulary a 3-8 year old will understand.',
    '',
    'Output: create a file called book.json in /mnt/session/outputs/ with this exact shape:',
    '{',
    '  "title": "...",',
    '  "subtitle": "..."?,',
    '  "author": "Aditya Sankhla",',
    '  "cover": { "prompt": "detailed cover illustration prompt" },',
    '  "pages": [',
    '    { "pageNumber": 1, "text": "...", "imageFile": "images/page_1.png", "imagePrompt": "..." }',
    '  ]',
    '}',
    '',
    'Image rules:',
    '- Each imagePrompt must be self-contained (no references like "same character as page 3").',
    '- Describe setting, mood, character, and art style in every imagePrompt.',
  ];

  if (childName) {
    parts.push('', 'Personalization:');
    parts.push(`- The hero of the story is named ${childName}.`);
    if (childAge) parts.push(`- They are ${childAge} years old.`);
    if (childDescription) {
      parts.push(`- Physical description: ${childDescription}. Include this in every imagePrompt so illustrations match.`);
    }
  }

  if (artStyle) {
    parts.push('', `Art style for every imagePrompt: ${artStyle}.`);
  }

  return parts.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm run test
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts lib/prompts.test.ts
git commit -m "lib: prompt builder with unit tests"
```

---

## Task 10: Firebase Admin + client initialization

**Files:**
- Create: `lib/firebase-admin.ts`, `lib/firebase-client.ts`

- [ ] **Step 1: Create Firebase Admin init**

Create `lib/firebase-admin.ts`:
```ts
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;
let db: Firestore;
let storage: Storage;
let auth: Auth;

function getApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) throw new Error('FIREBASE_ADMIN_PRIVATE_KEY not set');

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return app;
}

export function adminDb(): Firestore {
  if (!db) db = getFirestore(getApp());
  return db;
}

export function adminStorage(): Storage {
  if (!storage) storage = getStorage(getApp());
  return storage;
}

export function adminAuth(): Auth {
  if (!auth) auth = getAuth(getApp());
  return auth;
}
```

- [ ] **Step 2: Create Firebase client init**

Create `lib/firebase-client.ts`:
```ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

function getClientApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  app = initializeApp(config);
  return app;
}

export function clientAuth(): Auth {
  return getAuth(getClientApp());
}

export function clientDb(): Firestore {
  return getFirestore(getClientApp());
}

export function clientStorage(): FirebaseStorage {
  return getStorage(getClientApp());
}

export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase-admin.ts lib/firebase-client.ts
git commit -m "lib: Firebase Admin + client SDK initialization"
```

---

## Task 11: Create auth helper for verifying Firebase ID tokens

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create auth helper**

Create `lib/auth.ts`:
```ts
import { adminAuth } from './firebase-admin';

export interface AuthedUser {
  uid: string;
  email: string | undefined;
}

/**
 * Verifies the Firebase ID token from the Authorization: Bearer header.
 * Throws a 401 Response if the token is missing or invalid.
 */
export async function requireAuth(request: Request): Promise<AuthedUser> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const token = match[1];
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "lib: auth helper to verify Firebase ID tokens in API routes"
```

---

## Task 12: Create credits.ts with atomic spend/topup + unit test (TDD)

**Files:**
- Create: `lib/credits.test.ts`, `lib/credits.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/credits.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { spendCreditTx, topUpCreditsTx, InsufficientCreditsError } from './credits';

// A minimal fake of a Firestore transaction that lets us assert updates.
function makeFakeTx(initialUser: { credits: number }) {
  const writes: any[] = [];
  const user = { ...initialUser };
  const tx = {
    async get(ref: any) {
      if (ref.__collection === 'users') {
        return { exists: true, data: () => user, id: 'uid' };
      }
      // Empty query result for idempotency checks.
      return { empty: true, size: 0 };
    },
    update(ref: any, data: any) {
      if (ref.__collection === 'users') {
        Object.assign(user, data);
      }
      writes.push({ op: 'update', ref, data });
    },
    set(ref: any, data: any) {
      writes.push({ op: 'set', ref, data });
    },
  };
  return { tx, writes, user };
}

describe('spendCreditTx', () => {
  it('decrements credits and records a spend transaction', async () => {
    const { tx, writes, user } = makeFakeTx({ credits: 3 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn1' }) };

    await spendCreditTx(tx as any, userRef as any, txnCol as any, 'uid', 'job1');

    expect(user.credits).toBe(2);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'spend')).toBe(true);
  });

  it('throws InsufficientCreditsError when balance is zero', async () => {
    const { tx } = makeFakeTx({ credits: 0 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn1' }) };
    await expect(
      spendCreditTx(tx as any, userRef as any, txnCol as any, 'uid', 'job1'),
    ).rejects.toThrow(InsufficientCreditsError);
  });
});

describe('topUpCreditsTx', () => {
  it('increments credits and records a purchase transaction', async () => {
    const { tx, writes, user } = makeFakeTx({ credits: 1 });
    const userRef = { __collection: 'users', id: 'uid' };
    const txnCol = { doc: () => ({ __collection: 'credit_txns', id: 'txn2' }) };

    await topUpCreditsTx(tx as any, userRef as any, txnCol as any, 'uid', 5, 'pay_123');

    expect(user.credits).toBe(6);
    expect(writes.some((w) => w.op === 'set' && w.data.type === 'purchase')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test
```

Expected: FAIL — `Cannot find module './credits'`.

- [ ] **Step 3: Implement credits helper**

Create `lib/credits.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm run test
```

Expected: PASS — 4 tests green (2 from prompts, 2 from credits... wait, credits has 3: spend happy, spend insufficient, topUp happy).

- [ ] **Step 5: Commit**

```bash
git add lib/credits.ts lib/credits.test.ts
git commit -m "lib: atomic credit spend/topup helpers with unit tests"
```

---

## Task 13: Create dodo.ts with HMAC verification + unit test (TDD)

**Files:**
- Create: `lib/dodo.test.ts`, `lib/dodo.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/dodo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyDodoSignature } from './dodo';

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyDodoSignature', () => {
  const secret = 'test-secret';
  const body = '{"event":"payment.succeeded","data":{"id":"pay_123"}}';

  it('returns true for a valid signature', () => {
    const sig = sign(secret, body);
    expect(verifyDodoSignature(body, sig, secret)).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const sig = sign(secret, body);
    const tampered = body.replace('pay_123', 'pay_999');
    expect(verifyDodoSignature(tampered, sig, secret)).toBe(false);
  });

  it('returns false for an empty signature', () => {
    expect(verifyDodoSignature(body, '', secret)).toBe(false);
  });

  it('is constant-time — returns false for wrong but same-length signature', () => {
    const sig = sign(secret, body);
    const wrong = sig.replace(/./g, 'a').slice(0, sig.length);
    expect(verifyDodoSignature(body, wrong, secret)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test
```

Expected: FAIL — `Cannot find module './dodo'`.

- [ ] **Step 3: Implement dodo helper**

Create `lib/dodo.ts`:
```ts
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a Dodo webhook signature (HMAC-SHA256 of the raw body, hex-encoded).
 * Uses timing-safe comparison. Never logs the secret or signature.
 */
export function verifyDodoSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

export interface DodoCheckoutSessionInput {
  productId: string;
  uid: string;
  creditAmount: number;
  successUrl: string;
  cancelUrl: string;
}

export interface DodoCheckoutSession {
  url: string;
  id: string;
}

/**
 * Creates a hosted checkout session. Passes uid + creditAmount as metadata
 * so the webhook handler can attribute the purchase.
 *
 * Thin wrapper over the Dodo REST API — kept in one place so swapping
 * endpoints or upgrading the SDK is a single-file change.
 */
export async function createDodoCheckoutSession(input: DodoCheckoutSessionInput): Promise<DodoCheckoutSession> {
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) throw new Error('DODO_API_KEY not set');

  const resp = await fetch('https://api.dodopayments.com/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      line_items: [{ product_id: input.productId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        uid: input.uid,
        creditAmount: String(input.creditAmount),
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Dodo checkout ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  return { url: data.checkout_url || data.url, id: data.id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm run test
```

Expected: PASS — all tests green (prompts + credits + dodo = 10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dodo.ts lib/dodo.test.ts
git commit -m "lib: Dodo checkout session + timing-safe HMAC verification"
```

---

## Task 14: Create Firestore security rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Create rules file**

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: read own doc. Display name + lastActiveAt can be updated by the client.
    // Credit field is server-only.
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['displayName', 'lastActiveAt']);
      allow create: if false;
      allow delete: if false;
    }

    // Jobs: read-only for owner. All writes go through Admin SDK.
    match /jobs/{jobId} {
      allow read: if request.auth != null
                  && request.auth.uid == resource.data.userId;
      allow write: if false;
    }

    // Credit transactions: read-only for owner. No client writes.
    match /credit_txns/{txnId} {
      allow read: if request.auth != null
                  && request.auth.uid == resource.data.userId;
      allow write: if false;
    }

    // Deny anything else by default.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "rules: Firestore security — user isolation, server-only writes"
```

---

## Task 15: Create Firebase project (manual setup) + paste env vars

**Files:**
- Modify: `.env.local` (new local-only file, never committed)

**This task is manual — Aditya sets up the Firebase project in the browser.**

- [ ] **Step 1: Create a new Firebase project**

Go to `https://console.firebase.google.com/` and click **Add project**. Name it `storybook-saas-prod` (or similar). **Decline Google Analytics** — not needed for MVP. Make sure to use the free **Spark** plan and do NOT upgrade to Blaze. If Firebase asks for a credit card at any point, STOP and check with Claude in-session — the cardless constraint is non-negotiable.

- [ ] **Step 2: Enable Google Sign-In**

In the Firebase console: **Authentication → Get started → Sign-in method → Google → Enable**. Set a project support email. Save.

- [ ] **Step 3: Create Firestore database**

**Build → Firestore Database → Create database → Production mode → pick a region close to your users (e.g., `asia-south1` for India)**. Click Enable.

- [ ] **Step 4: Enable Cloud Storage**

**Build → Storage → Get started → Production mode → same region as Firestore**. If Firebase prompts for a Blaze upgrade at this step, STOP — note which step failed and we will switch to `uploadthing` as a fallback (the spec's 4.1 table lists this as the backup).

- [ ] **Step 5: Get client config**

**Project settings → General → Your apps → Add app → Web**. Register as `storybook-saas-web`. Copy the `firebaseConfig` object. Paste each value into `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=<apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<projectId>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<storageBucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
NEXT_PUBLIC_FIREBASE_APP_ID=<appId>
```

- [ ] **Step 6: Create a service account for Admin SDK**

**Project settings → Service accounts → Generate new private key → Generate key**. Download the JSON file. Add to `.env.local`:
```
FIREBASE_ADMIN_PROJECT_ID=<project_id from JSON>
FIREBASE_ADMIN_CLIENT_EMAIL=<client_email from JSON>
FIREBASE_ADMIN_PRIVATE_KEY="<private_key from JSON, keep newlines as literal \n>"
```

**Do not commit the JSON file.** `.gitignore` already excludes `service-account*.json`.

- [ ] **Step 7: Deploy security rules via CLI**

Run:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# Select your project, accept default rules file name (firestore.rules),
# accept default indexes file. Do NOT overwrite rules when prompted.
firebase deploy --only firestore:rules
```

Expected: `Deploy complete!`

- [ ] **Step 8: Add non-secret env vars**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=<from the CLI's .env — /Users/divyanshkumar/Documents/Aditya/Projects/storybook-agent/.env>
AGENT_ID=agent_011CZv5BFMhRFqHNKuRzR1wh
ENVIRONMENT_ID=env_0162HaoNtM5JEqboxhYge5mP
CF_ACCOUNT_ID=<from CLI .env>
CF_API_TOKEN=<from CLI .env>
NEXT_PUBLIC_BRAND_NAME=Storybook
NEXT_PUBLIC_DOMAIN=localhost:3000
NEXT_PUBLIC_SUPPORT_EMAIL=hello@example.com
ADMIN_KEY=$(openssl rand -hex 32)
```

- [ ] **Step 9: Smoke test the Admin SDK**

Create a temporary `scripts/smoke-admin.ts`:
```ts
import 'dotenv/config';
import { adminDb } from '../lib/firebase-admin';

async function main() {
  const db = adminDb();
  const docRef = db.collection('_smoke').doc('ping');
  await docRef.set({ ts: new Date().toISOString() });
  const snap = await docRef.get();
  console.log('Smoke test OK:', snap.data());
  await docRef.delete();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Install dotenv for the smoke script:
```bash
npm install -D dotenv tsx
```

Run:
```bash
npx tsx scripts/smoke-admin.ts
```

Expected: `Smoke test OK: { ts: '...' }`. If you see a permission error, the security rules blocked the write (Admin SDK bypasses rules — if this fails, the service account credentials are wrong).

- [ ] **Step 10: Delete the smoke script and commit nothing secret**

```bash
rm scripts/smoke-admin.ts
rmdir scripts 2>/dev/null || true
git status
```

Expected: no untracked files besides `.env.local` which is gitignored.

---

## Task 16: Implement /api/book/create route

**Files:**
- Create: `app/api/book/create/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/book/create/route.ts`:
```ts
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/book/create/route.ts
git commit -m "api: POST /api/book/create — atomic credit spend + Managed Agents session"
```

---

## Task 17: Implement /api/book/status route

**Files:**
- Create: `app/api/book/status/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/book/status/route.ts`:
```ts
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/book/status/route.ts
git commit -m "api: GET /api/book/status — incremental polling, idle detection, book.json extraction"
```

---

## Task 18: Implement /api/book/image route

**Files:**
- Create: `app/api/book/image/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/book/image/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { generateImage } from '@/lib/images';

export const runtime = 'nodejs';
export const maxDuration = 10;

const BodySchema = z.object({
  jobId: z.string().min(1),
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/book/image/route.ts
git commit -m "api: POST /api/book/image — Cloudflare generation + Storage upload + idempotent URL save"
```

---

## Task 19: Implement /api/book/build-pdf route

**Files:**
- Create: `app/api/book/build-pdf/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/book/build-pdf/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { assemblePdf } from '@/lib/pdf';

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

  const pdfBytes = await assemblePdf({
    manifest: job.bookJson,
    coverBytes: coverBytes ? new Uint8Array(coverBytes) : null,
    pageBytes: pageBytesArr,
  });

  // Upload.
  const objectPath = `jobs/${job.jobId}/book.pdf`;
  const file = bucket.file(objectPath);
  await file.save(Buffer.from(pdfBytes), { contentType: 'application/pdf', resumable: false });
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/book/build-pdf/route.ts
git commit -m "api: POST /api/book/build-pdf — download images, assemble, upload"
```

---

## Task 20: Implement /api/book/build-epub route

**Files:**
- Create: `app/api/book/build-epub/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/book/build-epub/route.ts`:
```ts
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/book/build-epub/route.ts
git commit -m "api: POST /api/book/build-epub — finalize job, mark complete, bump counter"
```

---

## Task 21: Implement /api/checkout route

**Files:**
- Create: `app/api/checkout/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/checkout/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createDodoCheckoutSession } from '@/lib/dodo';
import { DOMAIN } from '@/lib/brand';

export const runtime = 'nodejs';
export const maxDuration = 10;

// Slice 1 only exposes credit_1 — Slice 2 adds credit_5 and credit_20.
const PRODUCT_MAP: Record<string, { productId: string; credits: number }> = {
  credit_1: {
    productId: process.env.DODO_PRODUCT_CREDIT_1 || '',
    credits: 1,
  },
};

export async function GET(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const url = new URL(request.url);
  const product = url.searchParams.get('product') || 'credit_1';
  const entry = PRODUCT_MAP[product];
  if (!entry || !entry.productId) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  }

  const origin = url.origin;
  const session = await createDodoCheckoutSession({
    productId: entry.productId,
    uid: user.uid,
    creditAmount: entry.credits,
    successUrl: `${origin}/library?purchase=success`,
    cancelUrl: `${origin}/pricing?purchase=cancelled`,
  });

  return NextResponse.redirect(session.url, 303);
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/checkout/route.ts
git commit -m "api: GET /api/checkout — create Dodo checkout session, redirect"
```

---

## Task 22: Implement /api/webhooks/dodo route with idempotency

**Files:**
- Create: `app/api/webhooks/dodo/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/webhooks/dodo/route.ts`:
```ts
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
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/dodo/route.ts
git commit -m "api: POST /api/webhooks/dodo — HMAC verify + idempotent credit top-up"
```

---

## Task 23: AuthProvider, LoginButton, and /login page

**Files:**
- Create: `components/AuthProvider.tsx`, `components/LoginButton.tsx`, `app/login/page.tsx`

- [ ] **Step 1: Create AuthProvider**

Create `components/AuthProvider.tsx`:
```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase-client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signOut: async () => {
      await signOut(clientAuth());
    },
    getIdToken: async () => {
      if (!user) return null;
      return await user.getIdToken();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
```

- [ ] **Step 2: Create LoginButton**

Create `components/LoginButton.tsx`:
```tsx
'use client';

import { signInWithPopup } from 'firebase/auth';
import { clientAuth, googleProvider } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signInWithPopup(clientAuth(), googleProvider);
      router.push('/library');
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="rounded-full bg-[#5D6D7E] px-6 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
    >
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
```

- [ ] **Step 3: Create /login page**

Create `app/login/page.tsx`:
```tsx
import { LoginButton } from '@/components/LoginButton';
import { BRAND_NAME } from '@/lib/brand';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
      <div className="text-center">
        <h1 className="text-4xl font-serif text-[#2C3E50] mb-4">{BRAND_NAME}</h1>
        <p className="text-[#5D6D7E] mb-8">Sign in to start making books.</p>
        <LoginButton />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/AuthProvider.tsx components/LoginButton.tsx app/login/page.tsx
git commit -m "ui: AuthProvider context, Google sign-in button, /login page"
```

---

## Task 24: Root layout with AuthProvider + minimal landing page

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Replace app/layout.tsx**

Overwrite `app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Fraunces, Lora } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import { BRAND_NAME, TAGLINE } from '@/lib/brand';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display' });
const body = Lora({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-[#FAF7F2] text-[#2C3E50] font-serif">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Append brand CSS to app/globals.css**

The Tailwind v4 scaffold already created `app/globals.css` with `@import "tailwindcss";` at the top and some default dark-mode CSS variables. **Do not delete the existing `@import "tailwindcss";` line** — Tailwind v4 uses that CSS-first import instead of the v3 `@tailwind base/components/utilities` triplet.

Overwrite `app/globals.css` with the following (which preserves the v4 import and replaces Next.js defaults with our brand CSS):
```css
@import "tailwindcss";

:root {
  --color-cream: #FAF7F2;
  --color-primary: #5D6D7E;
  --color-accent: #E8A87C;
  --color-ink: #2C3E50;
  --color-muted: #A0A0A0;
}

body {
  background: var(--color-cream);
  color: var(--color-ink);
  font-family: var(--font-body), serif;
}

h1, h2, h3, h4 {
  font-family: var(--font-display), serif;
}
```

- [ ] **Step 3: Overwrite app/page.tsx**

Overwrite `app/page.tsx`:
```tsx
import Link from 'next/link';
import { BRAND_NAME, TAGLINE } from '@/lib/brand';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-6xl text-[#2C3E50] mb-6">{BRAND_NAME}</h1>
        <p className="text-xl text-[#5D6D7E] mb-10">{TAGLINE}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-full bg-[#5D6D7E] px-8 py-3 text-white font-medium hover:opacity-90"
          >
            Make a book — $5
          </Link>
        </div>
        <p className="mt-8 text-sm text-[#A0A0A0]">
          One credit = one full picture book (PDF + EPUB).
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Type-check + run dev server**

Run:
```bash
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3000` — expected: landing page with the brand name, tagline, and the "Make a book — $5" button. Click it → `/login` page with the Google button. Kill the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx app/globals.css
git commit -m "ui: root layout with fonts, minimal landing page, login entry"
```

---

## Task 25: /new page with NewBookForm

**Files:**
- Create: `components/NewBookForm.tsx`, `app/new/page.tsx`

- [ ] **Step 1: Create NewBookForm**

Create `components/NewBookForm.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function NewBookForm() {
  const { getIdToken } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [pages, setPages] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/book/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, pages }),
      });
      if (resp.status === 402) {
        router.push('/pricing');
        return;
      }
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const { jobId } = await resp.json();
      router.push(`/job/${jobId}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl w-full space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#5D6D7E] mb-2">
          What is the book about?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="a brave little fox who learns to share"
          className="w-full rounded-2xl border border-[#E0D9CC] bg-white px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#5D6D7E]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5D6D7E] mb-2">
          How many pages? ({pages})
        </label>
        <input
          type="range"
          min={8}
          max={16}
          value={pages}
          onChange={(e) => setPages(parseInt(e.target.value, 10))}
          className="w-full"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting || topic.length < 3}
        className="w-full rounded-full bg-[#5D6D7E] text-white py-4 font-medium text-lg hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Starting...' : 'Generate book (1 credit)'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create /new page**

Create `app/new/page.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { NewBookForm } from '@/components/NewBookForm';

export default function NewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-4xl mb-8 text-[#2C3E50]">A new book</h1>
      <NewBookForm />
    </main>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/NewBookForm.tsx app/new/page.tsx
git commit -m "ui: /new page with book creation form, 402 -> /pricing redirect"
```

---

## Task 26: /job/[id] page with JobProgress component (browser orchestrator)

**Files:**
- Create: `components/JobProgress.tsx`, `app/job/[id]/page.tsx`

The JobProgress component is the browser orchestrator. It:
1. Subscribes to the Firestore job doc via realtime listener
2. Polls `/api/book/status` every 2s while `status === 'generating'`
3. Fires parallel `/api/book/image` calls once `bookJson` is present
4. Fires `/api/book/build-pdf` then `/api/book/build-epub` once all images are ready
5. Renders download buttons when both URLs are present

- [ ] **Step 1: Create JobProgress**

Create `components/JobProgress.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job } from '@/lib/types';

export function JobProgress({ jobId }: { jobId: string }) {
  const { getIdToken } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imagesKickedOff = useRef(false);
  const pdfKickedOff = useRef(false);
  const epubKickedOff = useRef(false);

  // Subscribe to the job doc in realtime.
  useEffect(() => {
    const ref = doc(clientDb(), 'jobs', jobId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError('Job not found');
          return;
        }
        setJob({ ...(snap.data() as any), jobId: snap.id });
      },
      (err) => setError(err.message),
    );
    return () => unsub();
  }, [jobId]);

  // Poll /api/book/status while generating.
  useEffect(() => {
    if (!job) return;
    if (job.status !== 'generating') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const token = await getIdToken();
        await fetch(`/api/book/status?jobId=${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Swallow — realtime listener picks up changes regardless.
      }
      if (!cancelled) setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [job?.status, jobId, getIdToken]);

  // Kick off parallel image generation once bookJson is ready.
  useEffect(() => {
    if (!job) return;
    if (job.status !== 'building') return;
    if (!job.bookJson) return;
    if (imagesKickedOff.current) return;
    imagesKickedOff.current = true;

    (async () => {
      const token = await getIdToken();
      const pageCount = job.bookJson!.pages.length;
      // 1 cover + N pages.
      const calls: Promise<Response>[] = [];
      for (let p = 0; p <= pageCount; p++) {
        calls.push(
          fetch('/api/book/image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ jobId, page: p }),
          }),
        );
      }
      await Promise.all(calls);
    })().catch((e) => setError(e.message));
  }, [job?.status, job?.bookJson, jobId, getIdToken]);

  // Kick off PDF build once all images present.
  useEffect(() => {
    if (!job) return;
    if (job.status !== 'building') return;
    if (!job.imageUrls) return;
    const allReady = job.imageUrls.cover && job.imageUrls.pages.every((u) => !!u);
    if (!allReady) return;
    if (job.pdfUrl || pdfKickedOff.current) return;
    pdfKickedOff.current = true;

    (async () => {
      const token = await getIdToken();
      await fetch('/api/book/build-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
    })().catch((e) => setError(e.message));
  }, [job?.imageUrls, job?.pdfUrl, jobId, getIdToken]);

  // Kick off EPUB build once PDF is done.
  useEffect(() => {
    if (!job) return;
    if (!job.pdfUrl) return;
    if (job.epubUrl || epubKickedOff.current) return;
    epubKickedOff.current = true;

    (async () => {
      const token = await getIdToken();
      await fetch('/api/book/build-epub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
    })().catch((e) => setError(e.message));
  }, [job?.pdfUrl, job?.epubUrl, jobId, getIdToken]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!job) return <p>Loading...</p>;

  if (job.status === 'failed') {
    return (
      <div className="text-center">
        <h2 className="text-2xl mb-2">Something went wrong</h2>
        <p className="text-[#5D6D7E] mb-4">{job.error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  if (job.status === 'complete' && job.pdfUrl && job.epubUrl) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-3xl">{job.bookJson?.title || 'Your book'}</h2>
        <p className="text-[#5D6D7E]">Ready to read.</p>
        <div className="flex gap-3 justify-center">
          <a
            href={job.pdfUrl}
            className="rounded-full bg-[#5D6D7E] px-6 py-3 text-white font-medium"
            download
          >
            Download PDF
          </a>
          <a
            href={job.epubUrl}
            className="rounded-full bg-[#E8A87C] px-6 py-3 text-white font-medium"
            download
          >
            Download EPUB
          </a>
        </div>
      </div>
    );
  }

  const percent = job.progress?.percent ?? 0;
  const message = job.progress?.message || 'Working...';

  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-2xl mb-6">{job.topic}</h2>
      <div className="w-full bg-white rounded-full h-4 border border-[#E0D9CC] overflow-hidden mb-3">
        <div
          className="h-full bg-[#5D6D7E] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[#5D6D7E]">{message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create /job/[id] page**

Create `app/job/[id]/page.tsx`:
```tsx
'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { JobProgress } from '@/components/JobProgress';

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <JobProgress jobId={id} />
    </main>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/JobProgress.tsx app/job/\[id\]/page.tsx
git commit -m "ui: /job/[id] page with browser-orchestrated generation loop"
```

---

## Task 27: /library page with LibraryGrid

**Files:**
- Create: `components/LibraryGrid.tsx`, `app/library/page.tsx`

- [ ] **Step 1: Create LibraryGrid**

Create `components/LibraryGrid.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { clientDb } from '@/lib/firebase-client';
import { useAuth } from './AuthProvider';
import type { Job, User } from '@/lib/types';

export function LibraryGrid() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  // Subscribe to user doc for credit balance.
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(clientDb(), 'users', user.uid), (snap) => {
      const data = snap.data() as User | undefined;
      setCredits(data?.credits ?? 0);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to user's jobs.
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(clientDb(), 'jobs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setJobs(
        snap.docs.map((d) => ({ ...(d.data() as any), jobId: d.id })),
      );
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl text-[#2C3E50]">Your books</h1>
        <div className="flex items-center gap-4">
          <span className="text-[#5D6D7E]">
            {credits === null ? '...' : `${credits} credit${credits === 1 ? '' : 's'}`}
          </span>
          <Link
            href="/api/checkout?product=credit_1"
            className="rounded-full bg-[#E8A87C] px-5 py-2 text-white font-medium"
          >
            Buy 1 credit — $5
          </Link>
          <Link
            href="/new"
            className="rounded-full bg-[#5D6D7E] px-5 py-2 text-white font-medium"
          >
            New book
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="text-[#5D6D7E]">No books yet. Start with a credit.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <Link
              key={job.jobId}
              href={`/job/${job.jobId}`}
              className="block rounded-2xl bg-white border border-[#E0D9CC] p-6 hover:shadow-md transition"
            >
              <h2 className="text-xl mb-2 text-[#2C3E50]">
                {job.bookJson?.title || job.topic}
              </h2>
              <p className="text-sm text-[#5D6D7E] capitalize">{job.status}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create /library page**

Create `app/library/page.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { LibraryGrid } from '@/components/LibraryGrid';

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12">
      <LibraryGrid />
    </main>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/LibraryGrid.tsx app/library/page.tsx
git commit -m "ui: /library page with realtime job list + credit balance"
```

---

## Task 28: Set up Dodo Payments product (manual)

- [ ] **Step 1: Create the Dodo product**

Go to `https://app.dodopayments.com/` → Products → New product.

Name: `Storybook — 1 credit`
Price: `$5.00 USD`
Type: One-time payment
Description: `One book generation — PDF + EPUB`

Save. Copy the product ID (format `prod_...`) into `.env.local`:
```
DODO_PRODUCT_CREDIT_1=prod_xxxxxxxxxxxx
```

- [ ] **Step 2: Get API key + webhook secret**

In Dodo dashboard: Settings → API keys → create a new key. Copy into `.env.local`:
```
DODO_API_KEY=<key>
```

Settings → Webhooks → Add webhook:
- URL: `https://<vercel-domain>/api/webhooks/dodo` (use a placeholder for now; update after Task 29)
- Events: `payment.succeeded`

Copy the webhook secret into `.env.local`:
```
DODO_WEBHOOK_SECRET=<secret>
```

- [ ] **Step 3: Local smoke test of checkout redirect**

Run:
```bash
npm run dev
```

Open `http://localhost:3000/library` in the browser, sign in with Google, click "Buy 1 credit — $5". Expected: redirects to the Dodo hosted checkout page. Do NOT complete the payment locally — the webhook won't reach localhost without a tunnel. Kill the dev server.

---

## Task 29: Deploy to Vercel and wire the webhook

- [ ] **Step 1: Create Vercel project**

Push the repo to GitHub first:
```bash
gh repo create storybook-saas --source=. --public --remote=origin --push
```

Then in Vercel dashboard:
- New project → Import from GitHub → select `storybook-saas`
- Framework preset: Next.js (auto-detected)
- **Do NOT deploy yet** — add env vars first

- [ ] **Step 2: Paste env vars into Vercel**

In the Vercel project → Settings → Environment Variables, add every key from `.env.local` for the `Production` environment. Double-check `FIREBASE_ADMIN_PRIVATE_KEY` — paste the full PEM including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`, with literal `\n` for newlines (Next.js will replace them via the code in `lib/firebase-admin.ts`).

- [ ] **Step 3: First deploy**

Back in Vercel: Deploy. Expected: build succeeds, deployment URL returned (e.g. `https://storybook-saas-xyz.vercel.app`).

- [ ] **Step 4: Update Dodo webhook URL**

In Dodo dashboard: Settings → Webhooks → edit the `payment.succeeded` webhook → replace the placeholder URL with `https://<vercel-domain>/api/webhooks/dodo`. Save.

- [ ] **Step 5: Add Firebase authorized domain**

Firebase console → Authentication → Settings → Authorized domains → Add domain → paste the Vercel production domain. This is required for Google Sign-In to work on the deployed site.

- [ ] **Step 6: Update NEXT_PUBLIC_DOMAIN and redeploy**

Update the Vercel env var `NEXT_PUBLIC_DOMAIN` to the production domain (without `https://`). Trigger a redeploy by pushing any trivial commit or clicking Redeploy in the Vercel dashboard.

---

## Task 30: End-to-end smoke test on production

- [ ] **Step 1: Sign in and take stock**

Open the production URL. Click "Make a book — $5" → `/login` → Google sign-in → `/library`. Expected: library page shows "0 credits" and "No books yet".

- [ ] **Step 2: Purchase 1 credit**

Click "Buy 1 credit — $5" → Dodo hosted checkout → pay with a real card (use your own for the first test; consider it the cost of validating the flow). After payment: Dodo redirects to `/library?purchase=success`. Expected: within ~5 seconds, the credit badge updates from 0 → 1 (via the Firestore realtime listener). If it doesn't update, check `/api/webhooks/dodo` logs in Vercel — the webhook either didn't arrive, failed signature verification, or was rejected by Dodo (retry should fire). Resolve the webhook issue before continuing.

- [ ] **Step 3: Generate a book**

Click "New book" → fill in a topic like "a tiny whale who learns to sing" → keep pages at 12 → click "Generate book (1 credit)". Expected: redirects to `/job/<id>`. You should see:
- Phase: "Starting up..." → "Thinking..." → "Writing the story..." → "Generating illustrations..." → "Assembling the PDF..." → "Assembling the EPUB..." → "Done!"
- Total wall time: 4-8 minutes

- [ ] **Step 4: Download the artifacts**

When complete, click "Download PDF" and "Download EPUB". Expected: both files download and open. Verify visually — the PDF should be 24+ pages, images should render, the EPUB should open in Apple Books / Calibre / Kindle Previewer without errors.

- [ ] **Step 5: Verify credit is spent**

Back on `/library`: credits should show 0, and the generated book should appear in the grid with status "complete".

- [ ] **Step 6: Tag and announce**

```bash
git tag v0.1.0
git push --tags
```

Slice 1 is shipped. Tweet the URL — you now have a working $5 book generator deployed on zero-cost infrastructure, using the same Managed Agents backend that published your son's book on Amazon.

---

## Notes for Future Slices

After Slice 1 ships and you have at least one real paying customer, write the Slice 2 plan (`docs/superpowers/plans/<date>-storybook-saas-slice-2.md`) covering: the `credit_5` and `credit_20` Dodo products, the `/pricing` page, the `LibraryGrid` enhancements (cover thumbnails, filter by status, resume in-progress jobs), the `/api/admin/refund` endpoint, and the failed-job UI. Keep the same "spec → plan → implement" cycle.

Slice 3 (personalization) will require running `client.beta.agents.update()` to modify the system prompt on the existing agent — this is a runtime change, no code deploy needed, just a one-shot script that stays in `scripts/update-agent-prompt.ts`.

Slice 4 (KDP guide + marketing) is mostly content work — porting your existing Medium article into `/kdp-guide` and adding the `ExampleBookViewer` social proof component.
