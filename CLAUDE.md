# Plubis — Claude Code Context

Children's book SaaS. Web sibling of `storybook-agent` CLI. Sells picture-book generation at $5/book.

**Production:** https://plubis.vercel.app
**Repo:** `sankhlaofficial/plubis` on GitHub, branch `main`, auto-deploys to Vercel on push.

## Current State (April 12, 2026)

- **Slice 1 is live**: full paid flow working — Google sign-in → buy credit → generate book → download PDF + EPUB
- **UI/UX v2 shipped**: complete design overhaul based on Dribbble 23430521 (yellow-hero children's book look). All 5 pages rebuilt.
- **GTM Plan approved (April 12)** — pivoted to "conversation books for life's big moments" (see `GTM Positioning` below). Slice 2 product changes are the next build.
- **Working tree is clean.** All commits pushed to `main`.

## GTM Positioning (locked in April 12, 2026)

**The moat is NOT "another AI children's book generator." It's "picture books for life's big moments."** Plubis owns the category of AI-generated *conversation books* — books that help parents talk to their kids about specific emotional situations (new sibling, first day of school, grief, divorce, nightmares, etc.). No dominant competitor has claimed this category.

**New H1 copy:** "A book for the hard things to explain. Generated in 5 minutes. Your first one is free."

**Constraints driving the plan:**
- Founder is in India targeting US audience → **no physical product, no hardcover, no Lulu fulfillment**
- Founder will NOT put his face on the brand → **no founder videos/photos, no personal-brand content**
- Zero warm audience → **everything is cold**, brand runs from @plubis_app (new handle), NOT @aditya_sankhla_
- Budget: **$30/month**, 4-week sprint, ~10 hrs/week

**Regulatory guardrail:** Market as "conversation books" or "books for hard conversations." Never "therapy," "treatment," "cure," or any medical claim. Standard disclaimer: "Not a substitute for professional mental health care."

**Full plan:** `/Users/divyanshkumar/.claude/plans/quiet-tinkering-gray.md` (Section 0.4 is the authoritative version — supersedes Sections 0.5-0.10).

## Slice 2 Product Changes (Next Build — ~1.5 coding days)

These ship BEFORE any marketing. The product IS the marketing.

1. **Child's Name field** on `components/NewBookForm.tsx` → feeds `lib/prompts.ts` + dedication page (45 min)
2. **Hidden Dedication Page** auto-rendered at start of every PDF + EPUB. Handwritten font (Google Fonts: Caveat or Dancing Script). No Plubis branding. Format: "This book was made for [Name], on [Date], by [Parent First Name], who loves them more than words can say." (1 hr) — `lib/pdf.ts`, `lib/epub.ts`
3. **Free first book** in exchange for email + child's name. Change paywall — first credit is free on signup. (2 hr) — `lib/credits.ts`, `app/api/book/create/route.ts`, AuthProvider
4. **Situation Picker** on new-book form — dropdown of ~20 curated emotional situations + "Other" text field. This is the MOAT. (3 hr) — `components/NewBookForm.tsx`, new `lib/situations.ts`, `lib/prompts.ts`
5. **20 Situation Prompt Templates** in `lib/situations.ts` — each a carefully-crafted paragraph describing age-appropriate emotional framing for one situation. (~1 day of research + writing). Situations: new sibling, first day of school, grief (pet), grief (grandparent), divorce/separation, moving, nightmares, doctor visit, dentist visit, potty regression, parent travel, deployment, big feelings, tantrums, new pet, lost friend, new school, new language, parent illness, other. Tag each with age range 2-4 / 4-7.
6. **De-brand the book interior** — strip all Plubis mentions from PDF. Only the colophon on the back matter can have a tiny "Made with Plubis" line. (15 min) — `lib/pdf.ts`
7. **Multi-book credit packs** — `credit_3` ($12) and `credit_10` ($35) products in Dodo, wired into `app/api/checkout/route.ts` and `components/PricingModal.tsx` (new). (2 hr)
8. **Family Library subscription** ($9.99/mo) — LAUNCH IN WEEK 2 ONLY if Week 1 validates demand. Don't add to MVP.
9. **Faceless About page** — `app/about/page.tsx`. Tells the product story and the category mission. No founder photo. No "I" voice — use "we" or neutral product language. (1 hr)

## GTM Prerequisites (also ship before Week 1 marketing)

10. Buy domain on Porkbun (plubis.app / plubis.io / plubis.co) — ~$12-25/year
11. Fix `NEXT_PUBLIC_DOMAIN` in `.env.local` → new domain
12. Install PostHog free tier + Vercel Analytics (event tracking + funnel)
13. Create `app/sitemap.ts` + `app/robots.ts`
14. Verify domain with Google Search Console + submit sitemap
15. Regenerate OG image + favicon with Flux Schnell (faceless — product imagery only)
16. Build email capture form + Firestore `leads` collection → Resend welcome sequence
17. Add `/thank-you` page with share CTA (pre-filled tweet template, no Plubis branding required)

## Programmatic SEO Plan (the sleeper channel)

Generate **125 long-tail blog articles** via Claude API using a template: "The best picture book to read to a [AGE]-year-old about [SITUATION]". 5 ages × 25 situations = 125 articles. Each ~1500 words. Each CTA points to Plubis with "Or make your own in 5 minutes — first one free." Cost: ~$4 total via Anthropic API. Publish as `app/blog/[slug]/page.tsx` reading from MDX files. Submit sitemap to GSC. Pays back in Month 2-3, compounds forever.

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
