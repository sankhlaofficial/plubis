# Plubis — Claude Code Context

Children's book SaaS. Web sibling of `storybook-agent` CLI. Sells picture-book generation at $5/book.

**Production:** https://plubis.vercel.app
**Repo:** `sankhlaofficial/plubis` on GitHub, branch `main`, auto-deploys to Vercel on push.

## Current State (April 12, 2026 — end of day)

- **Slice 1 is live**: full paid flow working — Google sign-in → buy credit → generate book → download PDF + EPUB
- **UI/UX v2 shipped April 11**: yellow-hero children's book design language based on Dribbble 23430521
- **Slice 2 shipped April 12** — all 9 product changes live in production (see commit trail below). The product IS the marketing; Slice 2 was the prerequisite for any cold-start traffic.
- **Programmatic SEO engine shipped April 12** — infrastructure for 125 long-tail blog articles (routes, markdown renderer, sitemap, robots, generator script). Generator run pending.
- **Working tree is clean.** All commits pushed to `main`.

### April 12 commit trail (Slice 2 + SEO engine)
- `0d144ec` feat(books): hidden dedication page + child name field + de-branded interior
- `adddb46` feat(moat): situation picker + 19 prompt templates
- `bd41ee3` feat(conversion): free first book + credit packs + pricing & about pages
- `561e404` feat(seo): programmatic blog engine (125 articles pending generation)

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

## Slice 2 Shipped (April 12, 2026) ✅

All 9 product changes from the plan are live in production. The product IS the marketing — this all shipped BEFORE any cold-start traffic begins.

1. ✅ **Child's Name field** — `components/NewBookForm.tsx`. Required input. Parent's first name is silently derived from Firebase `user.displayName` and POSTed in the body so the dedication page stays a surprise.
2. ✅ **Hidden Dedication Page** — `lib/pdf.ts` + `lib/epub.ts`. Renders at front matter: *"This book was made for [Name], on [Date], by [Parent First Name], who loves them more than words can say."* Italic 18pt in PDF; cursive `font-family: 'Caveat', 'Dancing Script', cursive` in EPUB. Date comes from `job.createdAt.toDate()` for stable rebuilds. Legacy-safe: missing `childName` → falls back to static "For every little reader" dedication. Handwritten TTF embedding deferred to v2.
3. ✅ **Free first book** — `lib/credits.ts` `grantSignupBonus()` (idempotent via `signupBonusGranted` flag). `/api/users/init` called by `AuthProvider` on auth change; `/api/book/create` also calls it as a fallback. Legacy users with `totalBooksGenerated > 0` are marked granted without receiving credits. NewBookForm swaps the CTA to "Generate my free book" and shows a mint "✨ Your first book is on us" banner when eligible.
4. ✅ **Situation Picker** — `components/NewBookForm.tsx` `<select>` with 19 curated situations + "Something else" freeform textarea. Optional — picker can be skipped for a cozy story. Also reads `?situation=` query param for blog article deep-links.
5. ✅ **19 Prompt Templates** in `lib/situations.ts` (the plan said 20 including "other"; 19 curated + the "other" freeform path). Each template follows the shared rules: name the feeling honestly, don't minimize, open in a familiar safe world, resolve on "the feeling makes sense and you are loved through it", no medical/therapy language. `lib/prompts.ts` `buildBookPrompt` layers the framing after the topic line ("topic is the costume, framing is the body underneath").
6. ✅ **De-branded book interior** — `lib/pdf.ts` + `lib/epub.ts`. Stripped the "new dad" founder narrative from the back-matter "A Note for Parents" page. Replaced with a minimal colophon page: *"Thank you for reading."* + a tiny `Made with Plubis · plubis.app` line at the bottom. AI disclosure on the title page is kept for KDP compliance.
7. ✅ **Multi-book credit packs** — `lib/products.ts` single source of truth with 3 tiers (`credit_1` $5, `credit_3` $12 most-popular, `credit_10` $35). `components/PricingModal.tsx` shows all three, routes purchases through `/api/checkout?product=<key>`. `app/pricing/page.tsx` renders the same modal full-page. **Needs Dodo setup**: create `credit_3` and `credit_10` products in the Dodo dashboard, add `DODO_PRODUCT_CREDIT_3` and `DODO_PRODUCT_CREDIT_10` to Vercel env, then redeploy. The `credit_1` tier still works with the existing env var.
8. ⏸️ **Family Library subscription** ($9.99/mo) — deliberately held for Week 2, only if Week 1 validates demand.
9. ✅ **Faceless About page** — `app/about/page.tsx`. Product story + category mission + how-it-works + what-this-is-and-isn't legal guardrail + CTA. No founder photo, no "I" voice, no personal narrative.

## Programmatic SEO Engine (shipped April 12, 2026) ✅

Infrastructure is live. Generator run is pending.

- `lib/blog/seo-config.ts` — 125 article configs (5 ages × 25 situations; 19 picker-matched + 6 SEO-only broader topics like bedtime, sharing, confidence)
- `lib/blog/types.ts`, `lib/blog/data.ts` — types + type-safe loader over `content/blog.json`
- `lib/blog/markdown.tsx` — zero-dep hand-rolled markdown → JSX renderer. Handles exactly the subset the generator prompt pins: `##`/`###` headings, paragraphs, `-` lists, `**bold**`, `*italic*`, `[links](url)`. No `@next/mdx`, no `gray-matter`, no `remark` — preserves the "no new npm packages" rule.
- `app/blog/page.tsx` — index with "coming soon" empty state
- `app/blog/[slug]/page.tsx` — SSG dynamic route using `generateStaticParams`, bottom CTA deep-links `/new?situation=<slug>` for picker-matched articles
- `app/sitemap.ts` + `app/robots.ts` — marketing pages today, every blog article added automatically after the generator runs
- `scripts/generate-blog.cjs` — Node CLI that calls the Claude API for each config. Resumable (appends to `content/blog.json`, skips existing). Defaults to `claude-opus-4-6` (~$6.50 for 125 articles); set `ANTHROPIC_MODEL=claude-sonnet-4-6` for the plan's ~$4 budget. Set `BLOG_GEN_LIMIT=N` for smoke tests.

**To run the generator:**
```bash
# Smoke test one article (~$0.05)
BLOG_GEN_LIMIT=1 node scripts/generate-blog.cjs
# Full run at plan budget (~$4, Sonnet, ~15 min)
ANTHROPIC_MODEL=claude-sonnet-4-6 node scripts/generate-blog.cjs
# Then: git add content/blog.json && git commit && git push → Vercel rebuilds with 125 static /blog/[slug] pages
```

## GTM Prerequisites (not yet shipped)

10. Buy domain on Porkbun (plubis.app / plubis.io / plubis.co) — ~$12-25/year
11. Fix `NEXT_PUBLIC_DOMAIN` in `.env.local` → new domain (sitemap + robots host depend on this)
12. Install PostHog free tier + Vercel Analytics (event tracking + funnel)
13. ✅ `app/sitemap.ts` + `app/robots.ts` — shipped with the SEO engine
14. Verify domain with Google Search Console + submit sitemap
15. Regenerate OG image + favicon with Flux Schnell (faceless — product imagery only)
16. Build email capture form + Firestore `leads` collection → Resend welcome sequence
17. Add `/thank-you` page with share CTA (pre-filled tweet template)

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
  api/checkout/route.ts                 # Dodo checkout session creator (3 tiers)
  api/webhooks/dodo/route.ts            # Standard Webhooks handler
  api/users/init/route.ts               # first-touch user doc + signup bonus (Slice 2)
  {page,login,library,new,job/[id]}/page.tsx
  about/page.tsx                        # faceless About (Slice 2)
  pricing/page.tsx                      # full-page pricing, uses PricingModal (Slice 2)
  blog/{page,[slug]/page}.tsx           # SEO blog index + SSG article route (Slice 2)
  sitemap.ts                            # auto-generated sitemap (Slice 2)
  robots.ts                             # auto-generated robots.txt (Slice 2)
components/
  {Logo,Button,PillLabel,DecorativeShape,CloudDivider,BookMockup,LoadingSkeleton,MobileMenu,Header,Footer}.tsx   # chrome
  {HeroSection,HowItWorks,WhatYouGet,ExampleBook,Testimonial}.tsx                                                # landing sections
  {AuthProvider,LoginButton,LibraryGrid,BookCard,EmptyLibrary,NewBookForm,JobProgress,JobPhaseAnimation}.tsx     # app
  PricingModal.tsx                                                                                               # 3-tier credit picker (Slice 2)
lib/
  agent.ts           # Managed Agents SDK wrapper
  auth.ts            # requireAuth middleware
  brand.ts           # BRAND_NAME / TAGLINE / DOMAIN / SUPPORT_EMAIL
  credits.ts         # topUp + refund + grantSignupBonus (Slice 2)
  dodo.ts            # createCheckoutSession + verifySignature
  epub.ts            # archiver-based EPUB assembly (with hidden dedication)
  firebase-admin.ts + firebase-client.ts
  images.ts          # Cloudflare Flux Schnell wrapper
  pdf.ts             # pdf-lib assembly (with hidden dedication + colophon)
  products.ts        # 3-tier credit product catalog (Slice 2)
  prompts.ts         # buildBookPrompt with situation framing layer (Slice 2)
  situations.ts      # 19 curated situation prompt templates — THE MOAT (Slice 2)
  types.ts           # Job, User, CreditTxn shapes
  blog/
    types.ts         # BlogArticleConfig + BlogArticle shapes (Slice 2)
    seo-config.ts    # 125 article configs (5 ages × 25 situations) (Slice 2)
    markdown.tsx     # zero-dep markdown → JSX renderer (Slice 2)
    data.ts          # type-safe loader over content/blog.json (Slice 2)
content/
  blog.json          # generator output, empty until scripts/generate-blog.cjs runs (Slice 2)
public/
  showcase-cover.jpg + showcase-page-{1,2,3}.jpg + og-image.jpg   # Flux-generated assets
scripts/
  generate-showcase.cjs  # one-shot Flux Schnell asset generator
  generate-blog.cjs      # Claude-API-driven 125-article blog generator (Slice 2)
  grant-credits.cjs      # admin credit grant tool
  job-watcher.cjs        # realtime job tailer for debugging
```

## Known follow-ups (for next session)

1. **Dodo dashboard: create `credit_3` + `credit_10` products**, add `DODO_PRODUCT_CREDIT_3` and `DODO_PRODUCT_CREDIT_10` to Vercel env, redeploy. Without this, the 3-pack and 10-pack checkout returns 400. The 1-pack still works.
2. **Run the blog generator** — `ANTHROPIC_MODEL=claude-sonnet-4-6 node scripts/generate-blog.cjs` from the repo root. ~$4 at Sonnet rates, ~15 min. Resumable. Commit `content/blog.json` and push to trigger Vercel rebuild with 125 static `/blog/[slug]` pages.
3. **End-to-end smoke test on production** — sign in with a fresh Google account, pick a situation (e.g., "new sibling"), child name "Arya", generate, open the PDF, verify the dedication page renders with the right name + date + parent first name.
4. **Rotate leaked secrets** (user deferred): Firebase service account JSON, Dodo API key, Dodo webhook secret. Should be rotated before public launch.
5. **Brand favicon + apple-touch-icon** — still using Next.js default. Generate via Flux Schnell or hand-built SVG.
6. **NEXT_PUBLIC_DOMAIN** in `.env.local` is `localhost:3000` — should be the real domain so `metadataBase`, sitemap URLs, and robots.txt host resolve correctly.
7. **Agent "Luna" bias** — Anthropic Sonnet 4.6 keeps naming moon characters Luna regardless of prompt. Add negative prompting if it becomes a pattern.
8. **GTM prerequisites still pending**: PostHog + Vercel Analytics, email capture + `leads` Firestore collection + Resend welcome sequence, `/thank-you` page, Porkbun domain, Google Search Console verification + sitemap submit.

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
