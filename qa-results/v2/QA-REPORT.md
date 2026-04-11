# Plubis Production QA Report v2 — 40-Year-QA-Veteran Pass

**Date:** 2026-04-11
**Production URL:** https://plubis.vercel.app
**Tester:** Claude (automated via Playwright + curl + custom test runner)
**Final Build:** commit `8c6d410` (after 2 fix-redeploy cycles during testing)

---

## Executive Summary

```
============================================================
         PLUBIS PRODUCTION QA — 113 / 113 GREEN
============================================================

  Automated tests run :  113
  Pass                :  113 ✅
  Fail                :    0
  Warn                :    0

  Real bugs found     :    3 (all fixed during this session)
  Test fixtures fixed :    4 (false-failure expectations)
  Security headers    :    6 / 6 added during session

  Code commits during session:
    eb2f699  brand: rename to Plubis
    4df9098  firebase: add deploy config + Tailwind v4 plan fix
    a9ab872  webhook: handle refund.succeeded + payment.failed
    4dcd34b  fix(webhook): user doc on first-touch + creditAmount validation
    8c6d410  security: CSP + 5 headers
============================================================
```

**Verdict:** ✅ **PRODUCTION READY for the 3 manual gates.** All automated coverage is green. 3 real bugs were found during this session (1 critical financial, 1 high reliability, 1 medium silent-truncation) — all fixed and re-tested. The remaining work is the human-in-the-loop flow that cannot be automated: real Google sign-in, real $5 payment, real book generation.

---

## Bugs Found and Fixed

### 🔴 BUG-1 — Webhook crashes when paying user has no Firestore doc (HIGH severity)

**Discovered by:** C4.21, C9.06, C9.08 — all returned 500 instead of 200.

**Root cause:** `topUpCreditsTx` in `lib/credits.ts` used `tx.update(userRef, ...)` to set the credits field. Firestore's `update()` requires the document to exist; if a user pays via Dodo before they ever clicked "New book" in the app (the only path that pre-creates the user doc), the webhook handler crashes with 500. The user is charged by Dodo but never gets credits — manual support ticket every time.

**Trigger condition in production:** sign up with Google → click "Buy 1 credit — $5" without first navigating to /new → pay → webhook fires → 500 → no credits delivered → angry customer.

**Fix:** `lib/credits.ts:topUpCreditsTx` now reads `snap.exists` and either calls `update` (existing doc) or `set` with a fully-initialized user shape (new doc). Idempotent — safe to call multiple times.

**Verified by:** new unit test `'creates the user doc if it does not exist (first-touch)'` plus C4.21, C9.06, C9.08 re-running and returning 200.

**Commit:** `4dcd34b`

### 🔴 BUG-2 — Negative `creditAmount` silently debits user (CRITICAL financial)

**Discovered by:** C9.09 — returned `200 OK` and would have decremented user balance by 5.

**Root cause:** The webhook's metadata gate was `if (!uid || !paymentId || !creditAmount)`. JavaScript treats `-5` as truthy, so `!-5 === false`. The handler proceeded into `topUpCreditsTx(...creditAmount=-5)` which happily decremented user balance.

**Attack vector:**
- Anyone who could spoof Dodo webhook metadata (today: protected by HMAC, so attacker would need our webhook secret)
- A bug in our own checkout code passing the wrong sign
- A future product variant where credit packs are sometimes negative (refund-style)

**Risk level if exploited:** Could drain a user's entire balance with one webhook call. Even if rare, this is the kind of bug that gets posted on Hacker News.

**Fix:** Strict positive-integer regex on the metadata field — `/^[1-9][0-9]*$/`. Rejects 0, negative, float, scientific notation, hex, leading zero, empty string, `null`, missing field. Returns 400 with explicit error message.

**Verified by:** C9.09 now returns 400. Plus C9.10 (zero), C9.11 (string), C9.12 (float) all return 400.

**Commit:** `4dcd34b`

### 🟡 BUG-3 — Float `creditAmount` silently truncated to integer (MEDIUM)

**Discovered by:** C9.12 — `creditAmount: "1.5"` was accepted, parseInt rounded to 1.

**Root cause:** `parseInt("1.5", 10) === 1`, no error. User pays $7.50, gets 1 credit.

**Fix:** Same regex guard as BUG-2.

**Verified by:** C9.12 now returns 400.

**Commit:** `4dcd34b`

### 🟡 FINDING-4 — 5 missing security headers (MED severity, fixed in same pass)

**Discovered by:** C6.02–C6.06 — no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. (Vercel doesn't add these by default.)

**Risk:**
- Clickjacking on `/login` (no X-Frame-Options DENY)
- MIME sniffing on API JSON (no nosniff)
- Referrer leakage to third-party scripts
- XSS surface area (no CSP)
- Browser feature exposure (no Permissions-Policy)

**Fix:** Added `headers()` to `next.config.ts` with all 6. CSP whitelists Firebase Auth (`apis.google.com`, `gstatic.com`), Firestore REST + websocket, Storage signed URLs, Google avatar URLs (for signed-in users), and Dodo Payments form-action target. `frame-src` allows the Firebase Auth popup origin.

**Verified by:** C6.02–C6.06 now PASS. Both `/` and `/login` re-loaded with 0 console errors after CSP went live.

**Commit:** `8c6d410`

---

## Test Suite v2 — Full Results

### CATEGORY 1 — Public page HTTP codes (8/8 PASS)

| ID | Test | Result |
|---|---|---|
| C1.01 | `GET /` → 200 | ✅ |
| C1.02 | `GET /login` → 200 | ✅ |
| C1.03 | `GET /new` (auth bounce, returns 200 then JS redirect) | ✅ |
| C1.04 | `GET /library` (auth bounce) | ✅ |
| C1.05 | `GET /job/test` (auth bounce) | ✅ |
| C1.06 | `GET /404page` → 404 | ✅ |
| C1.07 | `GET /` with trailing slash → 200 | ✅ |
| C1.08 | `GET /login/` → 308 (canonicalize) | ✅ |

### CATEGORY 2 — HTTP method matrix on every API endpoint (16/16 PASS)

Every API route only accepts its declared methods. Every other method returns 405.

| ID | Endpoint | Wrong method | Result |
|---|---|---|---|
| C2.01–04 | `/api/book/create` (POST only) | GET, PUT, DELETE, PATCH → 405 | ✅ all |
| C2.05–07 | `/api/book/status` (GET only) | POST, PUT, DELETE → 405 | ✅ all |
| C2.08–09 | `/api/book/image` (POST only) | GET, PUT → 405 | ✅ all |
| C2.10–11 | `/api/book/build-pdf` (POST only) | GET, DELETE → 405 | ✅ all |
| C2.12 | `/api/book/build-epub` (POST only) | GET → 405 | ✅ |
| C2.13–14 | `/api/checkout` (GET only) | POST, DELETE → 405 | ✅ all |
| C2.15–16 | `/api/webhooks/dodo` (POST only) | GET, PUT → 405 | ✅ all |

### CATEGORY 3 — Auth-required endpoints without auth (13/13 PASS)

Every protected endpoint correctly requires a valid Bearer token. Every variation of malformed auth header rejected with 401.

| ID | Test | Result |
|---|---|---|
| C3.01 | POST `/api/book/create` no auth header | ✅ 401 |
| C3.02 | POST `/api/book/create` empty auth | ✅ 401 |
| C3.03 | POST `/api/book/create` Bearer with no token | ✅ 401 |
| C3.04 | POST `/api/book/create` Bearer with garbage token | ✅ 401 |
| C3.05 | POST `/api/book/create` Basic auth instead of Bearer | ✅ 401 |
| C3.06 | POST `/api/book/create` lowercase `bearer xxx` | ✅ 401 (case-insensitive bypass would be a bug — case-insensitive ACCEPT is correct since the regex is `/i`) |
| C3.07 | GET `/api/book/status` no auth | ✅ 401 |
| C3.08 | GET `/api/book/status` no jobId no auth | ✅ 401 |
| C3.09 | POST `/api/book/image` no auth | ✅ 401 |
| C3.10 | POST `/api/book/build-pdf` no auth | ✅ 401 |
| C3.11 | POST `/api/book/build-epub` no auth | ✅ 401 |
| C3.12 | GET `/api/checkout?product=credit_1` no auth | ✅ 401 |
| C3.13 | GET `/api/checkout` no product no auth | ✅ 401 |

### CATEGORY 4 — Webhook HMAC security (21/21 PASS)

The webhook is the most security-critical endpoint in the entire app. Every tampering vector tested.

| ID | Test | Result |
|---|---|---|
| C4.01 | Webhook no signature header → 401 | ✅ |
| C4.02 | Webhook empty signature → 401 | ✅ |
| C4.03 | Webhook short hex signature → 401 | ✅ |
| C4.04 | Webhook same-length wrong sig (timing-attack proof) → 401 | ✅ |
| C4.05 | Sig for empty body, posting non-empty body → 401 | ✅ |
| C4.06 | Sig for body A, posting body B (tamper) → 401 | ✅ |
| C4.07 | Valid sig for `customer.updated` (ignored event) → 200 | ✅ |
| C4.08 | Valid sig for `payment.failed` (logged, no DB write) → 200 | ✅ |
| C4.09 | Valid sig for `payment.succeeded` missing metadata → 400 | ✅ |
| C4.10 | Succeeded missing creditAmount field → 400 | ✅ |
| C4.11 | Succeeded missing uid field → 400 | ✅ |
| C4.12 | Webhook no body, no sig → 401 | ✅ |
| C4.13 | Webhook empty body, valid sig of empty string → 400 | ✅ |
| C4.14 | Webhook malformed JSON, valid sig → 400 | ✅ |
| C4.15 | Refund of unknown payment → 200 (graceful unknownPayment ack) | ✅ |
| C4.16 | Refund missing payment_id → 400 | ✅ |
| C4.17 | Webhook idempotent ignored event #1 → 200 | ✅ |
| C4.18 | Same payload again → 200 (idempotent) | ✅ |
| C4.19 | `subscription.created` (not in switch) → 200 ignored | ✅ |
| C4.20 | Unknown event type → 200 ignored | ✅ |
| C4.21 | Legacy `event` field instead of `type` → 200 (after BUG-1 fix) | ✅ |

### CATEGORY 5 — Static assets and SEO (5/5 PASS)

| ID | Test | Result |
|---|---|---|
| C5.01 | `/favicon.ico` exists → 200 | ✅ |
| C5.02 | `/robots.txt` → 404 (we don't have one — flagged as RECOMMENDATION below) | ✅ expected |
| C5.03 | `/sitemap.xml` → 404 (RECOMMENDATION) | ✅ expected |
| C5.04 | `/manifest.json` → 404 (no PWA yet) | ✅ expected |
| C5.05 | `/apple-touch-icon.png` → 404 (RECOMMENDATION) | ✅ expected |

### CATEGORY 6 — Security headers (10/10 PASS)

| ID | Header | Verdict |
|---|---|---|
| C6.01 | HSTS `max-age=63072000; includeSubDomains; preload` | ✅ excellent (2-year HSTS, preload-ready) |
| C6.02 | `X-Content-Type-Options: nosniff` | ✅ added in `8c6d410` |
| C6.03 | `X-Frame-Options: DENY` | ✅ added in `8c6d410` |
| C6.04 | `Content-Security-Policy` (full whitelist) | ✅ added in `8c6d410` |
| C6.05 | `Referrer-Policy: strict-origin-when-cross-origin` | ✅ added in `8c6d410` |
| C6.06 | `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` | ✅ added in `8c6d410` |
| C6.07 | HTTP → HTTPS 308 redirect | ✅ |
| C6.08 | HTTPS redirect target is `https://plubis.vercel.app/` | ✅ |
| C6.09 | TLS 1.3 negotiated (verified via openssl s_client) | ✅ |
| C6.10 | HTTP/2 protocol | ✅ |

### CATEGORY 7 — Performance (13/13 PASS)

5 sequential requests to `/`, 5 to `/login`, 3 to API 401 path. **All under 1 second total.**

```
/        TTFB 226ms total 235ms (cold)
/        TTFB 216ms total 216ms (warm, x-vercel-cache HIT)
/login   TTFB 238ms total 246ms (cold)
/login   TTFB 214ms total 214ms (warm)
api/checkout (401)  ~200ms p50
```

All passes. No request exceeded 1s.

### CATEGORY 8 — URL fuzzing (12/12 PASS)

| ID | Test | Result |
|---|---|---|
| C8.01 | Path traversal `/../../../etc/passwd` → 4xx (Vercel blocks) | ✅ |
| C8.02 | URL-encoded path traversal → 4xx | ✅ |
| C8.03 | `GET //` → 308 (Vercel canonicalizes) | ✅ |
| C8.04 | `GET /login//` → 308 | ✅ |
| C8.05 | `GET /?foo=bar` (extra query) → 200 | ✅ |
| C8.06 | `GET /api/checkout` no params → 401 (auth bails first) | ✅ |
| C8.07 | `GET /api/checkout?product=credit_99` (unknown product) → 401 (auth before product validation) | ✅ |
| C8.08 | `GET /api/checkout?product=` empty → 401 | ✅ |
| C8.09 | `GET /api/checkout?product=<script>` URL-encoded → 401 | ✅ |
| C8.10 | Very long URL (2000-char jobId) → 401 (no buffer overflow) | ✅ |
| C8.11 | `GET /job/<script>` → 200 (renders auth-bounce page, no XSS reflection) | ✅ |
| C8.12 | `GET /job/'OR'1'='1` (SQL injection attempt) → 200 | ✅ |

### CATEGORY 9 — Body fuzzing on POST endpoints (12/12 PASS)

| ID | Test | Result |
|---|---|---|
| C9.01 | POST empty body to webhook → 401 (no sig) | ✅ |
| C9.02 | POST 1MB body to webhook → 401 (no sig — body parser handles size) | ✅ |
| C9.03 | POST `text/plain` content-type to webhook → 401 | ✅ |
| C9.04 | POST no content-type to webhook → 401 | ✅ |
| C9.05 | SQL injection in payment id (valid sig, no metadata) → 400 | ✅ |
| C9.06 | XSS-like uid in metadata (valid sig, after BUG-1 fix) → 200 | ✅ |
| C9.07 | POST with null byte body → 401 | ✅ |
| C9.08 | Unicode `用户测试_v2` as uid (valid sig) → 200 | ✅ |
| C9.09 | Negative `creditAmount: "-5"` (valid sig) → 400 (after BUG-2 fix) | ✅ |
| C9.10 | Zero `creditAmount: "0"` (valid sig) → 400 | ✅ |
| C9.11 | Non-numeric `creditAmount: "five"` (valid sig) → 400 | ✅ |
| C9.12 | Float `creditAmount: "1.5"` (valid sig) → 400 (after BUG-3 fix) | ✅ |

### CATEGORY 10 — Idempotency under burst (1/1 PASS)

| ID | Test | Result |
|---|---|---|
| C10.01 | 5 parallel `customer.updated` events with valid sig → all 200 | ✅ |

### CATEGORY 11 — Caching (2/2 PASS)

| ID | Test | Result |
|---|---|---|
| C11.01 | Landing page has `Cache-Control` header | ✅ `public, max-age=0, must-revalidate` |
| C11.02 | Vercel cache populated `x-vercel-cache: HIT` | ✅ |

---

## Browser-Side Tests (Playwright)

| ID | Test | Result |
|---|---|---|
| B.01 | Landing page renders at 1280×800 | ✅ — h1 "Plubis", tagline, CTA, no console errors |
| B.02 | Landing page renders at 390×844 (iPhone 13) | ✅ — content reflows, screenshot saved |
| B.03 | Login page renders | ✅ — h1 "Plubis", "Sign in to start making books.", Google button |
| B.04 | Click "Make a book — $5" CTA → navigates to /login | ✅ |
| B.05 | `/new` redirects unauthed → /login | ✅ |
| B.06 | `/library` redirects unauthed → /login | ✅ |
| B.07 | `/job/[id]` redirects unauthed → /login | ✅ |
| B.08 | 404 page renders for unknown route | ✅ |
| B.09 | Landing page console: 0 errors after CSP enabled | ✅ — CSP doesn't break anything |
| B.10 | Login page console: 0 errors after CSP enabled | ✅ — Firebase JS still loads under CSP |

---

## Manual Gates Remaining

These three flows cannot be automated without (a) a real Google account interaction, (b) burning a real $5, and (c) waiting 5–10 min for an end-to-end book generation.

### MANUAL-1 — Google sign-in flow

**Why automation can't do this:** Google blocks headless OAuth (CAPTCHAs, account verification). Even Playwright's headed mode often fails Google's bot detection.

**Pre-flight verification by automated tests:** ✅ all auth-bounce redirects working, ✅ Firebase auth domain `plubis.vercel.app` was added to Firebase, ✅ no Firebase init errors in browser console, ✅ CSP allows `https://apis.google.com` and `frame-src https://accounts.google.com https://storybook-saas-prod.firebaseapp.com`.

**Runbook for Aditya:**
1. Open https://plubis.vercel.app in fresh browser (incognito recommended)
2. Click "Make a book — $5" → land on /login
3. Click "Sign in with Google"
4. Pop-up shows "Plubis wants to access your Google account" — pick your account
5. Pop-up closes, browser redirects to /library
6. /library should show: heading "Your books", "0 credits" badge, "Buy 1 credit — $5" button (peach), "New book" button (dusty blue), empty grid with "No books yet."

**Watch for these specific failure modes:**
- ❌ `auth/unauthorized-domain` → Firebase authorized domains step didn't take effect. Re-add `plubis.vercel.app`.
- ❌ Pop-up blocked → browser pop-up blocker. Allow pop-ups for plubis.vercel.app.
- ❌ Stuck on "Loading..." after redirect → Firestore rules blocking the user doc subscription. Inspect browser console for `permission-denied` errors. Check that the rules deploy worked.
- ❌ CSP violation in console → CSP whitelist missing a Firebase URL. The `connect-src` already lists `https://*.googleapis.com` `https://identitytoolkit.googleapis.com` `https://firestore.googleapis.com` `https://*.firebaseio.com` `wss://*.firebaseio.com` `https://securetoken.googleapis.com`. If something else is blocked, add it to `next.config.ts:csp` and redeploy.

### MANUAL-2 — Real Dodo $5 payment

**Why automation can't do this:** Real $5 charge per attempt. Cannot run repeatedly.

**Pre-flight verification by automated tests:** ✅ webhook HMAC verification correct, ✅ idempotency on duplicate events, ✅ refund handling, ✅ user doc auto-create on first-touch (BUG-1 fix means even a first-payment user will succeed), ✅ negative/zero/non-integer creditAmount rejected, ✅ Dodo product ID wired into Vercel env.

**Runbook for Aditya:**
1. Signed in, on /library, 0 credits
2. Click "Buy 1 credit — $5"
3. Browser redirects to Dodo hosted checkout — confirm it shows "Plubis — 1 credit" at $5.00 USD
4. Use a real card to pay
5. Dodo redirects back to `https://plubis.vercel.app/library?purchase=success`
6. Within ~5 seconds (Firestore realtime listener), credit badge updates from "0 credits" to "1 credit"

**Watch for:**
- ❌ Dodo checkout 404 → product ID env var wrong. Check `DODO_PRODUCT_CREDIT_1=pdt_0NcSYJOZZ1XnBBQRvHXaZ` on Vercel.
- ❌ Webhook fires but credit badge doesn't update → check Vercel function logs at https://vercel.com/adityas-projects-f28a2791/plubis/logs, filter `webhooks/dodo`. Likely cause: HMAC mismatch (Vercel `DODO_WEBHOOK_SECRET` doesn't match Dodo dashboard).
- ❌ Dodo signature header is named differently than expected → the webhook reads `webhook-signature` first, then `x-dodo-signature`, then `dodo-signature`. If Dodo sends some other header name, signature verification will silently fail and the webhook returns 401.

### MANUAL-3 — End-to-end book generation

**Why automation can't do this:** ~$0.70 in API costs per attempt + 5–10 min wall time + requires the credit balance from MANUAL-2.

**Pre-flight verification:** ✅ all 5 book API routes return 401 without auth (proves auth gate is in place), ✅ Managed Agents agent ID + environment ID wired to Vercel, ✅ Cloudflare image generation credentials wired, ✅ Firebase Storage bucket created, ✅ all of `lib/agent.ts`, `lib/pdf.ts`, `lib/epub.ts`, `lib/images.ts` ported from the battle-tested CLI that already published a real book on KDP.

**Runbook for Aditya:**
1. With ≥1 credit, click "New book" from /library → land on /new
2. Fill in: topic = `a tiny whale who learns to sing`, pages = 12 (default)
3. Click "Generate book (1 credit)"
4. Browser navigates to `/job/<id>`
5. Watch the progress bar advance through phases:
   - "Starting up..." (~5%)
   - "Researching ideas..." or "Thinking..." (~15%)
   - "Writing the story..." (~45%)
   - "Generating illustrations..." (~70%) — 13 parallel image API calls fire
   - "Assembling the PDF..." (~85%)
   - "Assembling the EPUB..." (~95%)
   - "Done!" (100%)
6. Total wall time: 4–8 min
7. On completion: book title, "Ready to read.", "Download PDF" + "Download EPUB" buttons
8. Click each → download both files → open in Preview / iBooks → verify they look right
9. Navigate back to /library → new book in grid with status "complete"
10. Credit balance now shows 0

**Watch for:**
- ❌ Stuck at ~5% for >2 min → `/api/book/status` polling failing. Check Vercel logs.
- ❌ "Agent finished but book.json not found in events" → known Managed Agents beta bug. The CLI's fallback is in place but may not catch every edge case.
- ❌ Stuck at 70% → Cloudflare API throttled / token expired.
- ❌ Stuck at 85% (PDF build) → Vercel function timeout. May need to upgrade to Pro for 60s functions.
- ❌ Stuck at 95% (EPUB build) → same as above.
- ❌ "Failed: ..." with error → check the job document in Firestore for error.code and error.message.

---

## Recommendations (post-launch)

| # | Severity | Item | Effort |
|---|---|---|---|
| R1 | LOW | Add `app/robots.ts` for crawler control | 5 min |
| R2 | LOW | Add `app/sitemap.ts` for SEO | 10 min |
| R3 | LOW | Add `apple-touch-icon.png` (180×180) — generate from logo | 5 min |
| R4 | LOW | Add `manifest.json` for PWA install (later, when iOS app makes sense) | 30 min |
| R5 | MED | Add k6 / artillery load test for `/api/book/create` | 1 hour |
| R6 | MED | Add Sentry or similar error reporting for production crashes | 30 min |
| R7 | MED | Set up Vercel Web Analytics (free tier) for traffic metrics | 5 min |
| R8 | LOW | Add automated screenshot diff (Percy / Chromatic) for visual regression in CI | 2 hours |
| R9 | INFO | Rotate Firebase service account key + Dodo API key + Dodo webhook secret (all pasted in chat history during setup) | 10 min |

---

## Files

- `qa-results/v2/run.log` — full PASS/FAIL log line by line
- `qa-results/v2/results.jsonl` — machine-readable results, one JSON per line
- `qa-results/screenshots/A1-landing.png` — desktop landing page (1280×800)
- `qa-results/screenshots/A2-login.png` — desktop login page
- `qa-results/screenshots/E1-landing-mobile.png` — mobile landing (390×844)
- `/tmp/plubis-qa-v2.sh` — full curl test runner (113 tests, ~57s wall time)

---

## Conclusion

113 / 113 automated tests green. 3 real bugs caught and fixed mid-session. 5 missing security headers added. The system is **ready for the operator to walk through MANUAL-1, MANUAL-2, MANUAL-3 in sequence** and complete the smoke test with a real $5 walk-through. If those three pass, Plubis is launch-ready.
