# Storybook SaaS — Design Spec

**Date:** 2026-04-11
**Author:** Aditya Sankhla (with Claude)
**Status:** Draft — pending review

## 1. Purpose

Turn the existing `storybook-agent` CLI into a web product that lets anyone with a browser generate a KDP-ready children's picture book in under 10 minutes. Monetize via paid credit packs. Ship on cardless free tiers so fixed cost stays at $0.

The underlying engine — Claude Managed Agents API + Cloudflare Workers AI for images + pdf-lib/archiver for assembly — is already working and has produced a real published book ("Nimbus Doesn't Want to Rain" on Amazon KDP, April 10 2026). This spec describes how to wrap that engine in a web SaaS.

## 2. Target Users

One product, three landing-page angles (same generator underneath):

1. **Parents making personalized bedtime books** — enter a topic + their child's name + description, get a custom PDF/EPUB to read on Kindle/iPad/phone. Strongest emotional hook.
2. **Indie authors publishing on KDP** — use the generator + the built-in KDP walkthrough to publish their first children's book on Amazon.
3. **Teachers** — generate classroom stories on specific topics (kindness, sharing, basic science).

## 3. Revenue Model

**Credit packs, paid from day 1. No free tier. No subscriptions.**

| Pack | Price | Per-book cost |
|---|---|---|
| 1 credit | $5 | $5 |
| 5 credits | $20 | $4 |
| 20 credits | $60 | $3 |

1 credit = 1 book generation. API cost per book is ~$0.70 (Sonnet 4.6 tokens). Gross margin: 80%+ at entry, 77% at bulk. Images are free (Cloudflare Workers AI free tier: 100K/day).

## 4. Architecture — Cardless Browser-Orchestrated

The single hard constraint: **no fixed cost, no credit card required anywhere** for MVP launch. Standard worker-based architectures (Firebase Functions, Vercel Fluid Compute, Railway) all require a card. The workaround: **the Managed Agents session runs on Anthropic's servers**, so we never need a long-running worker of our own. All our operations are short (under 10 seconds) — they fit in Vercel Hobby's free serverless timeout. The browser orchestrates the multi-step flow by polling short API routes.

### 4.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router, TypeScript) on **Vercel Hobby** | Aditya knows React; free; no card |
| Auth | **Firebase Auth Spark** (Google Sign-In only) | Free, no card, one-tap mobile signup |
| Database | **Firestore Spark** | Free, no card, realtime listeners = free SSE |
| File storage | **Firebase Storage Spark** (5 GB free) | Free, no card; fallback to uploadthing or Cloudflare R2 if Spark requires a card during bucket creation |
| Payments | **Dodo Payments** | Already verified and working from other projects |
| LLM | **Claude Managed Agents API** (existing agent `agent_011CZv5BFMhRFqHNKuRzR1wh`, existing env `env_0162HaoNtM5JEqboxhYge5mP`) | Already paid $5 into credits; existing tool runs |
| Images | **Cloudflare Workers AI Flux Schnell** | Free, 100K/day, already integrated in CLI |
| Worker | **None** — Vercel API routes (≤10s each) + browser-driven orchestration | Avoids card requirement |

### 4.2 Known Tradeoff: Vercel Hobby commercial-use caveat

Vercel Hobby TOS prohibits "commercial usage". For MVP validation and the first few paid customers this is an accepted risk — many indie hackers run on Hobby until they hit meaningful traction, then upgrade to Pro ($20/mo). Mitigation: upgrade to Vercel Pro the moment monthly revenue exceeds $50 or we hit 50 daily active users. If Vercel enforces before then, we migrate to Cloudflare Pages (also free, no commercial-use prohibition) — the Next.js code is portable and the migration is a single re-deploy plus DNS update.

### 4.3 Repository Layout

**New repo:** `storybook-saas` (separate from `storybook-agent` CLI). Single Next.js app — no monorepo, no pnpm workspaces. Core logic from the CLI is copy-pasted into `lib/` (drift is acceptable because the CLI is stable post-KDP publication).

```
storybook-saas/
├── app/
│   ├── (marketing)/              Unauthed marketing pages
│   │   ├── page.tsx              Landing: hero, 3 use-case cards, pricing, FAQ
│   │   ├── pricing/page.tsx      3 credit-pack cards → Dodo checkout
│   │   ├── kdp-guide/page.tsx    KDP publishing walkthrough (static, ported from Medium article)
│   │   ├── privacy/page.tsx      Legal
│   │   └── terms/page.tsx        Legal
│   ├── (app)/                    Authed pages
│   │   ├── new/page.tsx          Book creation form
│   │   ├── library/page.tsx      Grid of past + in-progress jobs
│   │   ├── job/[id]/page.tsx     Live progress + download
│   │   └── account/page.tsx      Minimal: email, credits, purchase history
│   ├── api/
│   │   ├── book/
│   │   │   ├── create/route.ts       POST: start session, deduct credit
│   │   │   ├── status/route.ts       GET:  poll events, update job
│   │   │   ├── image/route.ts        POST: generate one image
│   │   │   ├── build-pdf/route.ts    POST: assemble PDF
│   │   │   └── build-epub/route.ts   POST: assemble EPUB
│   │   ├── checkout/route.ts         GET:  create Dodo checkout session
│   │   ├── webhooks/dodo/route.ts    POST: process payment → credit top-up
│   │   └── admin/refund/route.ts     POST: manual refund (ADMIN_KEY protected)
│   └── layout.tsx
├── components/
│   ├── ui/                       shadcn/ui primitives
│   ├── NewBookForm.tsx
│   ├── JobProgress.tsx
│   ├── LibraryGrid.tsx
│   ├── PricingCards.tsx
│   ├── CreditBadge.tsx
│   ├── DownloadButtons.tsx
│   └── ExampleBookViewer.tsx
├── lib/
│   ├── agent.ts                  Ported from storybook-agent/src/agent.js
│   ├── pdf.ts                    Ported from storybook-agent/src/pdf.js
│   ├── epub.ts                   Ported from storybook-agent/src/epub.js
│   ├── images.ts                 Ported from storybook-agent/src/images.js
│   ├── prompts.ts                Personalization-aware agent message templates
│   ├── firebase-admin.ts         Server-side Firebase Admin SDK init
│   ├── firebase-client.ts        Client-side Firebase init
│   ├── dodo.ts                   Dodo Payments client wrapper
│   └── brand.ts                  BRAND_NAME, DOMAIN constants
├── firestore.rules               Security rules
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### 4.4 Core Logic Reuse

The following files are copied verbatim from `storybook-agent/src/` into `storybook-saas/lib/` and converted from JavaScript to TypeScript:

- `agent.js` → `agent.ts` — Managed Agents session runner. Existing SDK workarounds preserved: use `client.beta.sessions.events.stream()` (not `client.beta.sessions.stream()`), fall back to extracting `book.json` from `agent.tool_use` events if Files API returns zero files.
- `pdf.js` → `pdf.ts` — KDP-compliant PDF assembler. All KDP rules preserved: 8.5×8.5in page, 48pt margins, 24-page minimum, front/back matter, magic-byte image format detection.
- `epub.js` → `epub.ts` — EPUB 3 assembler. Fixes preserved: nav.xhtml with `epub:type="toc"`, `dcterms:modified` metadata, image IDs prefixed with `img_` to avoid OPF manifest collisions.
- `images.js` → `images.ts` — Cloudflare Flux Schnell image generator.

No functional changes — these modules have already been battle-tested by publishing a real book on Amazon KDP.

## 5. Data Model

Three Firestore collections.

### 5.1 `users/{uid}`

```ts
{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  credits: number;              // current balance
  totalBooksGenerated: number;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}
```

### 5.2 `jobs/{jobId}`

```ts
{
  jobId: string;
  userId: string;
  status: 'pending' | 'generating' | 'building' | 'complete' | 'failed';
  topic: string;
  childName: string | null;
  childAge: number | null;
  childDescription: string | null;
  artStyle: string | null;
  pages: number;                // default 12
  sessionId: string;            // Managed Agents session ID
  lastEventCursor: string | null;
  progress: {
    phase: 'starting' | 'researching' | 'writing'
         | 'drafting-images' | 'generating-images'
         | 'building-pdf' | 'building-epub' | 'done';
    message: string;
    percent: number;
  };
  bookJson: object | null;      // full manifest extracted from agent events
  imageUrls: { cover: string; pages: string[] } | null;
  pdfUrl: string | null;
  epubUrl: string | null;
  error: { code: string; message: string } | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  creditDebited: boolean;       // idempotency flag
}
```

### 5.3 `credit_txns/{txnId}`

```ts
{
  txnId: string;
  userId: string;
  type: 'purchase' | 'spend' | 'refund';
  amount: number;               // +5 for purchase, -1 for spend
  balanceAfter: number;
  jobId: string | null;         // FK to jobs when type='spend'
  dodoPaymentId: string | null; // FK to Dodo when type='purchase'
  createdAt: Timestamp;
}
```

### 5.4 Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: read own doc, write only displayName client-side.
    // All credit field mutations go through Admin SDK (server).
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow update: if request.auth.uid == uid
                    && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['displayName', 'lastActiveAt']);
      allow create: if false;   // only server
      allow delete: if false;
    }

    // Jobs: read-only for owner. All writes server-side.
    match /jobs/{jobId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false;
    }

    // Credit transactions: read-only for owner. Writes server-only.
    match /credit_txns/{txnId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false;
    }
  }
}
```

All credit mutations run server-side via Firebase Admin SDK in Vercel API routes, inside atomic `runTransaction()` calls.

## 6. Credit Purchase Flow

1. User clicks a pricing card on `/pricing` → `GET /api/checkout?product=credit_5`
2. `/api/checkout` (server):
   - Verifies Firebase ID token from cookie
   - Creates Dodo checkout session with `metadata: { uid, creditAmount }` and `success_url = /library?purchase=success`
   - Returns checkout URL → browser redirects
3. User pays on Dodo hosted page.
4. Dodo sends webhook → `POST /api/webhooks/dodo`:
   - Verify Dodo HMAC signature on raw body
   - Parse `payment.succeeded` event
   - Extract `metadata.uid` and `metadata.creditAmount`
   - `runTransaction(async (tx) => { ... })`:
     - Idempotency: check `credit_txns` for existing doc with this `dodoPaymentId`. If found, return early.
     - Read `users/{uid}`, compute `newBalance = credits + creditAmount`
     - `tx.update(userRef, { credits: newBalance })`
     - `tx.set(db.collection('credit_txns').doc(), { type: 'purchase', ... })`
   - Return `200 OK`
5. Browser is subscribed to `users/{uid}` via Firestore realtime listener → detects credit increase → shows toast → redirects to `/new`.

### 6.1 Dodo Products (to create in Dodo dashboard)

| Product code | Price | Credit amount |
|---|---|---|
| `credit_1` | $5 | 1 |
| `credit_5` | $20 | 5 |
| `credit_20` | $60 | 20 |

### 6.2 Security

- Webhook signature verification is mandatory (same pattern used for Stripe in WellM backend).
- `uid` comes from signed webhook metadata, not from browser query string — un-spoofable.
- Idempotency via `dodoPaymentId` uniqueness prevents double-credit on webhook retries.

## 7. Generation Flow (State Machine)

State field: `jobs/{jobId}.status`.

```
pending → generating → building → complete
                    ↓
                  failed (at any step)
```

Every step is a short API route (under 10 seconds) called from the browser.

### 7.1 Step 1 — Start: `POST /api/book/create`

Body: `{ topic, childName?, childAge?, childDescription?, artStyle?, pages }`

1. Verify Firebase ID token.
2. `runTransaction`:
   - Read `users/{uid}`
   - If `credits < 1` → return `402 Payment Required`
   - `credits -= 1`, write `credit_txns` spend record
   - Create `jobs/{jobId}` with `status='pending'`, `creditDebited=true`
3. Build personalized prompt via `lib/prompts.ts`.
4. Call Managed Agents:
   - `client.beta.sessions.create({ agent: { type: 'agent', id: AGENT_ID }, environment_id: ENV_ID })`
   - `client.beta.sessions.messages.create(session.id, { content: prompt })`
5. Update job: `{ status: 'generating', sessionId, lastEventCursor: null }`
6. Return `{ jobId }` to browser.

Wall time: 2–4 seconds.

### 7.2 Step 2 — Poll: `GET /api/book/status?jobId=X`

Called every 2 seconds by the browser while `status='generating'`.

1. Verify Firebase ID token + job belongs to user.
2. Read `jobs/{jobId}`.
3. If `status === 'generating'`:
   - Fetch new events: `client.beta.sessions.events.list(sessionId, { after: lastEventCursor })`
   - For each event, derive a progress message (e.g. "Writing page 5...", "Drafting image prompts...")
   - Update job with new `progress` + `lastEventCursor`
   - If `session.status_idle` event seen:
     - Extract `book.json` from `agent.tool_use` events where tool name is `write` and content includes `"pages"` (same fallback logic as CLI)
     - Set `job.bookJson = parsed manifest`
     - Set `job.status = 'building'`
4. Return job doc to browser.

Wall time: 0.5–2 seconds per poll.

### 7.3 Step 3 — Images (parallel): `POST /api/book/image`

Browser detects `status='building'` + `bookJson` present, fires `N + 1` concurrent calls where `N = job.pages` (1 cover call + one call per page). With the default 12 pages, that is 13 concurrent calls.

Body: `{ jobId, page }` where `page=0` is the cover and `page=1..N` are story pages.

1. Verify auth + job ownership.
2. Read `job.bookJson`, pick the target page's `imagePrompt`.
3. If `childDescription` present, inject into prompt: `"[imagePrompt], featuring a [childDescription]"`.
4. Call Cloudflare Workers AI: `POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell` with `{ prompt }`.
5. Detect image format by magic bytes (`0xFF 0xD8 = JPEG`, `0x89 0x50 = PNG`) — same rule as CLI.
6. Upload bytes to Firebase Storage: `/jobs/{jobId}/images/page_{N}.{ext}`.
7. `runTransaction`: update `job.imageUrls[page]` with signed download URL (24-hour expiry).

Wall time per call: 1.5–3 seconds. All 13 finish in ~3 seconds wall-clock (parallel).

### 7.4 Step 4 — Build PDF: `POST /api/book/build-pdf`

Called once after all 13 images are done.

Body: `{ jobId }`

1. Auth + job ownership check.
2. Read `job.bookJson` + `job.imageUrls`.
3. Download image bytes from Firebase Storage in parallel.
4. Call `lib/pdf.ts` → produces KDP-compliant PDF (8.5×8.5in, 48pt margins, 24-page minimum, front/back matter, magic-byte image embedding).
5. Upload PDF to Storage: `/jobs/{jobId}/book.pdf`.
6. Update job: `{ pdfUrl: signedUrl }`.

Wall time: 4–6 seconds. Tight but fits in Vercel Hobby's 10-second budget.

### 7.5 Step 5 — Build EPUB: `POST /api/book/build-epub`

Called after PDF completes.

1. Same as build-pdf but calls `lib/epub.ts`.
2. On completion: `{ status: 'complete', completedAt: now() }`.

Wall time: 3–5 seconds.

### 7.6 Step 6 — Download

Browser is subscribed to the job doc via Firestore realtime listener. As soon as `pdfUrl` and `epubUrl` land on the job doc, the UI renders download buttons. Signed URLs are valid for 24 hours; re-fetching signed URLs is a separate endpoint if needed (`/api/book/url?jobId&file=pdf`).

### 7.7 Resume Logic

If the user closes the browser mid-generation, the Managed Agents session on Anthropic's servers keeps running (or is already idle). When the user returns to `/library`, any job with `status` in `{generating, building}` shows as "In progress". Clicking it re-subscribes to the job doc and re-enters the poll / image / build loop from wherever the state machine left off. All API routes are idempotent by design — re-calling `/api/book/image` for a page that's already uploaded is a no-op that returns the existing URL.

## 8. Error Handling & Refunds

- Any API route can set `job.status = 'failed'` with `error = { code, message }`.
- **No auto-refund.** The debited credit stays spent on failure.
- The failed job doc persists in the user's library with a visible error message and a "Contact support" mailto link to the operator's support email.
- **Manual refunds** via `POST /api/admin/refund` — protected by `ADMIN_KEY` env var. Body: `{ uid, amount, reason }`. Runs a Firestore transaction that increments `user.credits` and writes a `credit_txns` refund record with `jobId` (optional) and `reason`.
- A simple curl one-liner is all that's needed to refund a complaining customer.

## 9. Personalization (Slice 3)

When Slice 3 ships, the Managed Agents system prompt on Anthropic's servers is updated via `client.beta.agents.update()` to accept personalization. The update is additive — the existing agent ID does not change, so all other slices keep working unchanged.

**Prompt template:**

```
You are a children's picture book author.

Write a {pages}-page picture book about: {topic}

{if childName}
The hero of the story is named {childName}.
{if childAge}They are {childAge} years old.{/if}
{if childDescription}Physical description: {childDescription} — include this in every image prompt so all illustrations match.{/if}
{/if}

Output format: book.json with fields {title, subtitle, author, pages: [{pageNumber, text, imageFile, imagePrompt}], cover: {prompt}}.
Story rules: 2–3 sentences per page, warm, bedtime-friendly, end with resolution.
Image rules: every imagePrompt must be self-contained (no "same character as page 3") and must include {childDescription} when provided.
```

The `childDescription` is also injected by the API route `/api/book/image` just before calling Cloudflare, as a belt-and-braces measure in case the agent omits it.

## 10. KDP Publishing Guide (Slice 4)

Static content at `/kdp-guide`. Ported from the Medium article "Claude's New Managed Agents API Is Mindblowing…" plus the hard-won KDP compliance rules already captured in the CLI's memory notes:

1. **Paperback setup** — book size, margins, bleed, interior color (Premium color for illustrated books)
2. **Uploading** — PDF format, 24-page minimum, fonts embedded
3. **Cover creation** — use KDP Cover Creator or upload custom
4. **Pricing** — recommended pricing (paperback $9.99, Kindle $4.99)
5. **AI disclosure** — select "Yes" on KDP, list Claude + Cloudflare Workers AI
6. **Kindle eBook setup** — EPUB 3, nav.xhtml requirement, unique OPF IDs
7. **Common rejections and fixes** — drawn from actual KDP rejection messages the CLI encountered

## 11. UI / UX Spec

### 11.1 Marketing Pages

| Route | Contents |
|---|---|
| `/` | Hero: "Make YOUR child the hero of a bedtime book in 5 minutes." Three use-case cards: Parents / Authors / Teachers. Example book preview (the "Nimbus" book pages). Pricing cards. FAQ (5 questions). Footer. |
| `/pricing` | Three credit-pack cards → Dodo checkout. |
| `/kdp-guide` | Multi-section static walkthrough. |
| `/privacy`, `/terms` | Legal — required for Dodo. |

### 11.2 App Pages

| Route | Contents |
|---|---|
| `/new` | `<NewBookForm>`: topic input, child name, age, free-text description, art style dropdown (watercolor / pastel / cartoon / realistic), pages slider (8–16), "Generate (1 credit)" button. |
| `/library` | Grid of jobs sorted by `createdAt desc`. Each card: cover thumbnail, title, status badge, created date. In-progress jobs are clickable and go to `/job/[id]`. `<CreditBadge>` in topbar with "Buy more" button. |
| `/job/[id]` | `<JobProgress>` subscribes to Firestore job doc. Shows phase + percent + current message. When complete, renders `<DownloadButtons>` (PDF + EPUB + "Publish on KDP" CTA linking to `/kdp-guide`). |
| `/account` | Email, credits balance, purchase history (from `credit_txns`), sign out. |

### 11.3 Design Tokens

- Display font: Fraunces (Google Fonts)
- Body font: Lora (Google Fonts)
- Cream background: `#FAF7F2`
- Primary (dusty blue): `#5D6D7E`
- Accent (peach): `#E8A87C`
- Text (ink): `#2C3E50`
- Muted: `#A0A0A0`
- Radius: `rounded-2xl` for cards, `rounded-full` for buttons
- Tailwind 3.4+ as the only CSS framework
- shadcn/ui primitives (Button, Input, Card, Toast, Dialog, Badge)

## 12. Environment Variables

```
# Anthropic Managed Agents
ANTHROPIC_API_KEY=sk-ant-...
AGENT_ID=agent_011CZv5BFMhRFqHNKuRzR1wh
ENVIRONMENT_ID=env_0162HaoNtM5JEqboxhYge5mP

# Cloudflare Workers AI
CF_ACCOUNT_ID=...
CF_API_TOKEN=...

# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (server)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# Dodo Payments
DODO_API_KEY=...
DODO_WEBHOOK_SECRET=...
DODO_PRODUCT_CREDIT_1=prod_...
DODO_PRODUCT_CREDIT_5=prod_...
DODO_PRODUCT_CREDIT_20=prod_...

# Admin
ADMIN_KEY=<random long string for refund endpoint>

# Branding (change in one place later)
NEXT_PUBLIC_BRAND_NAME=Storybook
NEXT_PUBLIC_DOMAIN=storybook.example.com
NEXT_PUBLIC_SUPPORT_EMAIL=hello@example.com
```

## 13. Implementation Slices (Ship Order)

### Slice 1 — Core Paid Flow (ship first)

- Next.js 15 skeleton + Tailwind + shadcn/ui
- Brand constants in `lib/brand.ts`
- New Firebase project (Spark plan, Auth + Firestore + Storage)
- Firebase Auth with Google Sign-In
- `/new` form: topic + pages only (no personalization yet)
- Port `agent.js → agent.ts`, `pdf.js → pdf.ts`, `epub.js → epub.ts`, `images.js → images.ts` into `lib/`
- All five `/api/book/*` routes wired end-to-end
- `/job/[id]` live progress page with Firestore realtime listener
- Minimal `/library` grid
- Firestore security rules
- Dodo product `credit_1` at $5, `/api/checkout`, webhook with HMAC verification and idempotency
- Deployed to Vercel Hobby with env vars set

**Definition of done:** Aditya tweets the URL, a stranger signs in with Google, pays $5, generates a book, downloads the PDF + EPUB. One successful real transaction.

### Slice 2 — Credit Packs + Library Polish

- Dodo products `credit_5` ($20) and `credit_20` ($60)
- `/pricing` page with three cards
- `/library` polish: cover thumbnails, filter by status, resume in-progress jobs
- `<CreditBadge>` in authed topbar with "Buy more" button
- `/api/admin/refund` endpoint with `ADMIN_KEY` guard
- Failed-job UI with error display and support mailto

### Slice 3 — Personalization (the Parent Moat)

- `client.beta.agents.update()` script to update the system prompt on Anthropic's servers (same agent ID, new prompt version)
- `lib/prompts.ts` with personalization template
- `<NewBookForm>` extended with `childName`, `childAge`, `childDescription`, `artStyle`
- `/api/book/image` injects `childDescription` into Cloudflare prompts
- Optional: saved child profiles at `users/{uid}/children/{childId}` for repeat use

### Slice 4 — KDP Guide + Marketing Polish

- `/kdp-guide` multi-section walkthrough, ported from Medium article + CLI memory rules
- Landing page polish: `<ExampleBookViewer>` with Nimbus book pages as social proof, FAQ, testimonial block
- SEO: meta tags, `sitemap.xml`, `og:image`, structured data for pricing
- Optional: Nimbus case study page ("How I made my son's first bedtime book")

## 14. Explicitly Out of Scope for v1

- Character consistency across pages (would require paid image models like FAL/Replicate with IP-Adapter, breaks cost model)
- Photo upload for personalization
- Teacher / classroom account types
- Subscription tier
- Book editing / per-page regeneration
- Multi-language support
- Audio narration
- Direct KDP API publishing (Amazon does not expose one for self-publishing)
- Physical book printing integration
- Mobile app (responsive web is enough)
- Real-time collaboration

## 15. Dependencies to Pin

| Package | Version | Notes |
|---|---|---|
| `node` | 20.x | Vercel default |
| `next` | ^15 | App Router |
| `react`, `react-dom` | ^18 | |
| `typescript` | ^5.4 | |
| `tailwindcss` | ^3.4 | |
| `@anthropic-ai/sdk` | ^0.87.0 | Same as CLI — do not upgrade, 2.x does not exist |
| `firebase` | latest | Client SDK |
| `firebase-admin` | latest | Server SDK |
| `pdf-lib` | ^1.17.1 | Same as CLI |
| `archiver` | latest | Same as CLI |
| `dodo-payments` | latest | Payments SDK |
| `chalk` | ^5 | Server-side log coloring, same as CLI |

## 16. Open Questions (Deferred)

- **Brand name + domain** — deliberately deferred. `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_DOMAIN` are env vars / config constants; a single edit swaps the brand when Aditya picks one.
- **Firebase Storage Spark card requirement** — 80% confident it's free without a card, but if the Firebase console prompts for a card when creating the Storage bucket, fall back to uploadthing (2 GB free tier, no card) and keep everything else unchanged.
- **Book retention policy** — MVP keeps all generated books in Firebase Storage indefinitely. Each book is ~5 MB (images + PDF + EPUB), so 5 GB free tier holds ~1000 books. When storage usage nears 80% of quota, add a retention policy or move older books to colder storage. Not a Slice 1 concern.
