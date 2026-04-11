# Plubis — Claude Code Context

Children's book SaaS. Web sibling of `storybook-agent` CLI. Sells picture-book generation at $5/book.

**Production:** https://plubis.vercel.app
**Repo:** `sankhlaofficial/plubis` on GitHub, branch `main`, auto-deploys to Vercel on push.

## Current State (April 11, 2026)

- **Slice 1 is live**: full paid flow working — Google sign-in → buy credit → generate book → download PDF + EPUB
- **UI/UX v2 shipped**: complete design overhaul based on Dribbble 23430521 (yellow-hero children's book look). All 5 pages rebuilt.
- **Working tree is clean.** All commits pushed to `main`.

## Stack

- Next.js 15.5 App Router + React 19 + TypeScript 5.4
- Tailwind v4 **CSS-first** — `@theme` block in `app/globals.css`, **NO** `tailwind.config.ts`
- Firebase (Auth + Firestore + Storage) — prod project `storybook-saas-prod`
- `@anthropic-ai/sdk@^0.87.0` — Managed Agents Beta
- Cloudflare Workers AI Flux Schnell (free tier)
- Dodo Payments — `live.dodopayments.com` (NOT api.) + Standard Webhooks svix signatures
- Vercel Hobby (10s function timeout — browser-side retry loop handles 504s)
- pdf-lib + archiver

## Design System (locked in — don't deviate)

Design tokens live in `app/globals.css` inside `@theme { ... }`. Use class names like `bg-sun`, `bg-blossom`, `bg-mint`, `bg-peach`, `bg-sky`, `bg-cream`, `bg-cream-200`, `text-ink`, `text-ink-soft`, `text-muted`, `border-outline`, `border-dash`.

**Fonts:** Fraunces (display serif) + DM Sans (body). Body tag already has body font set.

**Utility classes:** `.section`, `.container-prose`, `.dashed-card`, `.pill`, `.animate-float-slow`, `.animate-twinkle`, `.animate-wobble`, `.animate-pulse-soft`, `.animate-shimmer`.

**Primitives** (all in `components/`): `Logo`, `Button` (with `download`/`external`/`href`/`onClick`), `PillLabel`, `DecorativeShape`, `CloudDivider`, `BookMockup`, `LoadingSkeleton`, `MobileMenu`, `Header`, `Footer`. Reuse these everywhere — don't reinvent buttons.

**Section components:** `HeroSection`, `HowItWorks`, `WhatYouGet`, `ExampleBook`, `Testimonial`, `BookCard`, `EmptyLibrary`, `JobPhaseAnimation`.

**No new npm packages.** All decoration is inline SVG. All animation is CSS keyframes. All state is React.

## Load-Bearing Code — DO NOT TOUCH

### `components/JobProgress.tsx` — 5 useEffects
1. Firestore job doc subscription
2. Status polling `/api/book/status` while `status === 'generating'`
3. Parallel image generation with **3-retry-per-image** logic (survives Vercel 504s)
4. PDF build kickoff when all images present
5. EPUB build kickoff when PDF done

These are production-critical. Only the return JSX at the bottom has been rebuilt. Any refactor requires full end-to-end test with a real $5 payment.

### `components/LibraryGrid.tsx` — 2 useEffects + error handling
- Jobs Firestore query with error callback + 5s "stuck loading" hint (Safari/ITP workaround — we've regressed on this before)
- The Header handles credits now, not LibraryGrid

### `lib/dodo.ts` — Standard Webhooks signature verification
- HMAC-SHA256 over `` `${id}.${timestamp}.${rawBody}` ``
- Secret: `whsec_`-prefixed, base64-decoded
- Signature format: `v1,<base64>`
- Endpoint: `live.dodopayments.com/checkouts` (NOT `api.dodopayments.com/checkout_sessions`)
- Body uses `product_cart` + `return_url` (NOT `line_items` + `success_url`)

### `lib/agent.ts` — Managed Agents session runner
- `listNewEvents` uses `{ limit: 1000, order: 'asc' }` — the Anthropic API rejects `after: cursor`
- `startBookSession` uses `(client.beta.sessions as any).events.send(session.id, { events: [{ type: 'user.message', content: [...] }] })`

### `lib/epub.ts` — race condition fix
- `pass.on('end', resolve)` MUST be registered **before** `archive.finalize()`
- Uses the `const finished = new Promise<void>(...)` pattern

## Pipeline flow (end-to-end)

1. `/new` → `POST /api/book/create` → creates `jobs/{jobId}` Firestore doc with `status: 'generating'`, deducts 1 credit, starts Anthropic Managed Agent session
2. JobProgress subscribes to the doc realtime. When `status === 'generating'`, polls `/api/book/status?jobId=...` every 2s — that route pulls new events from the agent session and updates the job doc
3. Once `bookJson` is ready (status flips to `building`), JobProgress kicks off **parallel** image generation — 1 cover + N pages, each with 3-retry logic
4. Once all `imageUrls.cover` + `imageUrls.pages[]` are non-null, JobProgress POSTs `/api/book/build-pdf` (pdf-lib assembly → Storage upload → signed URL)
5. Once `pdfUrl` is set, JobProgress POSTs `/api/book/build-epub` (archiver → Storage → signed URL, Content-Disposition slugified from title)
6. Status flips to `complete`, user sees Download PDF + Download EPUB + "Make another" + "Copy share link"

## Repo layout

```
app/
  api/book/{create,image,status,build-pdf,build-epub}/route.ts
  api/checkout/route.ts                 # Dodo checkout session creator
  api/webhooks/dodo/route.ts            # Standard Webhooks handler
  {page,login,library,new,job/[id]}/page.tsx
components/
  {Logo,Button,PillLabel,DecorativeShape,CloudDivider,BookMockup,LoadingSkeleton,MobileMenu,Header,Footer}.tsx   # chrome
  {HeroSection,HowItWorks,WhatYouGet,ExampleBook,Testimonial}.tsx                                                # landing sections
  {AuthProvider,LoginButton,LibraryGrid,BookCard,EmptyLibrary,NewBookForm,JobProgress,JobPhaseAnimation}.tsx     # app
lib/
  agent.ts         # Managed Agents SDK wrapper
  auth.ts          # requireAuth middleware
  brand.ts         # BRAND_NAME / TAGLINE / DOMAIN / SUPPORT_EMAIL
  credits.ts       # topUp + refund transactions
  dodo.ts          # createCheckoutSession + verifySignature
  epub.ts          # archiver-based EPUB assembly
  firebase-admin.ts + firebase-client.ts
  images.ts        # Cloudflare Flux Schnell wrapper
  pdf.ts           # pdf-lib assembly
  prompts.ts       # system prompts
  types.ts         # Job, User shapes
public/
  showcase-cover.jpg + showcase-page-{1,2,3}.jpg + og-image.jpg   # Flux-generated assets
scripts/
  generate-showcase.cjs  # one-shot Flux Schnell asset generator
  grant-credits.cjs      # admin credit grant tool
  job-watcher.cjs        # realtime job tailer for debugging
```

## Known follow-ups (for next session)

1. **Rotate leaked secrets** (user deferred): Firebase service account JSON, Dodo API key, Dodo webhook secret. Should be rotated before public launch.
2. **Brand favicon + apple-touch-icon** — still using Next.js default. Generate via Flux Schnell or hand-built SVG.
3. **NEXT_PUBLIC_DOMAIN** in `.env.local` is `localhost:3000` — should be `plubis.vercel.app` so `metadataBase` resolves correctly.
4. **Real $5 Dodo payment smoke test** on production.
5. **Tweet the launch URL** — v2 is tweetable.
6. **Agent "Luna" bias** — Anthropic Sonnet 4.6 keeps naming moon characters Luna regardless of prompt. Add negative prompting if it becomes a pattern.
7. **Credit pack tiers** — currently only `credit_1` ($5). Could add a 3-pack or 10-pack discount product.

## Workflow rules

- **Never** add Co-Authored-By trailers to commits (breaks Vercel Hobby + adds unwanted GitHub contributor)
- **Never** skip hooks (`--no-verify`)
- **Always** run `npm run build` before committing UI changes
- **Always** use the existing `Button`/`PillLabel`/`DecorativeShape` primitives, not inline hex classes
- **Never** introduce new npm packages without explicit user approval
- **Deploy** happens automatically via `git push origin main` → Vercel. No manual `vercel deploy` needed.

## Recent commit trail (April 11 UI overhaul)

```
e7abe53 fix(header): always show buy-credits path — + button on desktop, full CTA in mobile drawer
da1cf8b feat(ui): job progress rebuild — phase animation + next-CTAs + share link
293235f feat(ui): new-book form rebuild — ?topic= prefill + suggestion chips + branded card
e06296e feat(ui): library page rebuild — BookCard + EmptyLibrary + Header-managed credit pill
35abc18 feat(ui): login page rebuild — header/footer + branded Google sign-in
cb72dd4 feat(ui): landing page rebuild — hero, how-it-works, pricing, example, testimonial
9db6e1e fix(assets): rename showcase files to .jpg to match actual format
a4b6f5b feat(ui): chrome primitives + showcase assets
809a6ac feat(ui): design system foundation — @theme block + DM Sans + metadata
```

Full hard-won bug-fix trail is in the Plubis memory: `project_plubis_saas.md`.
