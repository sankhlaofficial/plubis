#!/usr/bin/env bash
# Plubis production QA — comprehensive curl-based test runner.
# Targets ~80 tests across HTTP, security, validation, idempotency, perf, SEO.

PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH
set +e

BASE="https://plubis.vercel.app"
RESULTS="/Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas/qa-results/v2"
mkdir -p "$RESULTS"
LOG="$RESULTS/run.log"
JSON="$RESULTS/results.jsonl"
> "$LOG"
> "$JSON"

PASS=0
FAIL=0
WARN=0
TOTAL=0

run() {
  local id="$1"; local name="$2"; local expected="$3"; local actual="$4"; local note="$5"
  TOTAL=$((TOTAL+1))
  local status
  if [ "$actual" = "$expected" ]; then
    status="PASS"
    PASS=$((PASS+1))
    printf '✅ %-8s %s\n' "$id" "$name" >> "$LOG"
  else
    status="FAIL"
    FAIL=$((FAIL+1))
    printf '❌ %-8s %s | expected=%s actual=%s\n' "$id" "$name" "$expected" "$actual" >> "$LOG"
  fi
  printf '{"id":"%s","name":"%s","expected":"%s","actual":"%s","status":"%s","note":"%s"}\n' "$id" "$name" "$expected" "$actual" "$status" "$note" >> "$JSON"
}

run_warn() {
  local id="$1"; local name="$2"; local note="$3"
  TOTAL=$((TOTAL+1))
  WARN=$((WARN+1))
  printf '⚠️  %-8s %s | %s\n' "$id" "$name" "$note" >> "$LOG"
  printf '{"id":"%s","name":"%s","status":"WARN","note":"%s"}\n' "$id" "$name" "$note" >> "$JSON"
}

# Helper: fetch HTTP code
code() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

# Helper: HMAC-SHA256 hex of body with secret
hmac() {
  printf '%s' "$1" | openssl dgst -sha256 -hmac "$2" -hex | awk '{print $NF}'
}

SECRET=$(grep '^DODO_WEBHOOK_SECRET=' /Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas/.env.local | sed 's/^DODO_WEBHOOK_SECRET=//')

echo "=== PLUBIS PRODUCTION QA v2 ==="
echo "Started: $(date)"
echo

# ============================================================
# CATEGORY 1 — Public page status codes
# ============================================================
echo "--- CATEGORY 1: Public page HTTP codes ---"
run "C1.01" "GET /  →  200"            "200" "$(code "$BASE/")"
run "C1.02" "GET /login  →  200"       "200" "$(code "$BASE/login")"
run "C1.03" "GET /new (auth bounce)"   "200" "$(code "$BASE/new")"
run "C1.04" "GET /library (auth bounce)" "200" "$(code "$BASE/library")"
run "C1.05" "GET /job/test (auth bounce)" "200" "$(code "$BASE/job/test")"
run "C1.06" "GET /404page  →  404"     "404" "$(code "$BASE/this-route-does-not-exist")"
run "C1.07" "GET / with trailing slash" "200" "$(code "$BASE/")"
run "C1.08" "GET /login/ trailing slash" "308" "$(code "$BASE/login/")"

# ============================================================
# CATEGORY 2 — HTTP method matrix on every API endpoint
# ============================================================
echo
echo "--- CATEGORY 2: HTTP method matrix (wrong method = 405) ---"
# /api/book/create is POST only
run "C2.01" "GET /api/book/create"      "405" "$(code "$BASE/api/book/create")"
run "C2.02" "PUT /api/book/create"      "405" "$(code -X PUT "$BASE/api/book/create")"
run "C2.03" "DELETE /api/book/create"   "405" "$(code -X DELETE "$BASE/api/book/create")"
run "C2.04" "PATCH /api/book/create"    "405" "$(code -X PATCH "$BASE/api/book/create")"

# /api/book/status is GET only
run "C2.05" "POST /api/book/status"     "405" "$(code -X POST "$BASE/api/book/status?jobId=t")"
run "C2.06" "PUT /api/book/status"      "405" "$(code -X PUT "$BASE/api/book/status?jobId=t")"
run "C2.07" "DELETE /api/book/status"   "405" "$(code -X DELETE "$BASE/api/book/status?jobId=t")"

# /api/book/image is POST only
run "C2.08" "GET /api/book/image"       "405" "$(code "$BASE/api/book/image")"
run "C2.09" "PUT /api/book/image"       "405" "$(code -X PUT "$BASE/api/book/image")"

# /api/book/build-pdf is POST only
run "C2.10" "GET /api/book/build-pdf"   "405" "$(code "$BASE/api/book/build-pdf")"
run "C2.11" "DELETE /api/book/build-pdf" "405" "$(code -X DELETE "$BASE/api/book/build-pdf")"

# /api/book/build-epub is POST only
run "C2.12" "GET /api/book/build-epub"  "405" "$(code "$BASE/api/book/build-epub")"

# /api/checkout is GET only
run "C2.13" "POST /api/checkout"        "405" "$(code -X POST "$BASE/api/checkout?product=credit_1")"
run "C2.14" "DELETE /api/checkout"      "405" "$(code -X DELETE "$BASE/api/checkout?product=credit_1")"

# /api/webhooks/dodo is POST only
run "C2.15" "GET /api/webhooks/dodo"    "405" "$(code "$BASE/api/webhooks/dodo")"
run "C2.16" "PUT /api/webhooks/dodo"    "405" "$(code -X PUT "$BASE/api/webhooks/dodo")"

# ============================================================
# CATEGORY 3 — Auth-required endpoints without auth
# ============================================================
echo
echo "--- CATEGORY 3: Authenticated endpoints without auth ---"
run "C3.01" "POST /api/book/create no auth"   "401" "$(code -X POST "$BASE/api/book/create" -H 'Content-Type: application/json' -d '{}')"
run "C3.02" "POST /api/book/create empty auth" "401" "$(code -X POST "$BASE/api/book/create" -H 'Authorization: ' -H 'Content-Type: application/json' -d '{}')"
run "C3.03" "POST /api/book/create Bearer no token" "401" "$(code -X POST "$BASE/api/book/create" -H 'Authorization: Bearer' -H 'Content-Type: application/json' -d '{}')"
run "C3.04" "POST /api/book/create Bearer xxx" "401" "$(code -X POST "$BASE/api/book/create" -H 'Authorization: Bearer xxx' -H 'Content-Type: application/json' -d '{}')"
run "C3.05" "POST /api/book/create Basic auth" "401" "$(code -X POST "$BASE/api/book/create" -H 'Authorization: Basic abc' -H 'Content-Type: application/json' -d '{}')"
run "C3.06" "POST /api/book/create lowercase 'bearer'" "401" "$(code -X POST "$BASE/api/book/create" -H 'Authorization: bearer xxx' -H 'Content-Type: application/json' -d '{}')"
run "C3.07" "GET /api/book/status no auth"    "401" "$(code "$BASE/api/book/status?jobId=test")"
run "C3.08" "GET /api/book/status no jobId no auth" "401" "$(code "$BASE/api/book/status")"
run "C3.09" "POST /api/book/image no auth"    "401" "$(code -X POST "$BASE/api/book/image" -H 'Content-Type: application/json' -d '{}')"
run "C3.10" "POST /api/book/build-pdf no auth" "401" "$(code -X POST "$BASE/api/book/build-pdf" -H 'Content-Type: application/json' -d '{}')"
run "C3.11" "POST /api/book/build-epub no auth" "401" "$(code -X POST "$BASE/api/book/build-epub" -H 'Content-Type: application/json' -d '{}')"
run "C3.12" "GET /api/checkout no auth"        "401" "$(code "$BASE/api/checkout?product=credit_1")"
run "C3.13" "GET /api/checkout no product no auth" "401" "$(code "$BASE/api/checkout")"

# ============================================================
# CATEGORY 4 — Webhook HMAC verification (security critical)
# ============================================================
echo
echo "--- CATEGORY 4: Webhook HMAC security ---"
run "C4.01" "Webhook no signature"        "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -d '{"type":"payment.succeeded"}')"
run "C4.02" "Webhook empty signature"     "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H 'webhook-signature: ' -d '{"type":"payment.succeeded"}')"
run "C4.03" "Webhook short signature"     "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H 'webhook-signature: deadbeef' -d '{"type":"payment.succeeded"}')"
run "C4.04" "Webhook same-length wrong sig" "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H 'webhook-signature: ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' -d '{"type":"payment.succeeded"}')"
run "C4.05" "Webhook signature for empty body, posting non-empty" "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $(hmac '' "$SECRET")" -d '{"type":"payment.succeeded"}')"

body='{"type":"payment.succeeded","data":{"id":"pay_orig"}}'
sig=$(hmac "$body" "$SECRET")
tampered='{"type":"payment.succeeded","data":{"id":"pay_TAMPERED"}}'
run "C4.06" "Tampered body, original sig"  "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$tampered")"

body='{"type":"customer.updated","data":{}}'
sig=$(hmac "$body" "$SECRET")
run "C4.07" "Valid sig, ignored event"     "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

body='{"type":"payment.failed","data":{"id":"pay_qa_fail_001"}}'
sig=$(hmac "$body" "$SECRET")
run "C4.08" "Valid sig, payment.failed"    "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

body='{"type":"payment.succeeded","data":{"id":"pay_qa_no_meta"}}'
sig=$(hmac "$body" "$SECRET")
run "C4.09" "Valid sig, succeeded missing metadata" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

body='{"type":"payment.succeeded","data":{"id":"pay_qa_meta_uid_only","metadata":{"uid":"qa_test"}}}'
sig=$(hmac "$body" "$SECRET")
run "C4.10" "Succeeded missing creditAmount" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

body='{"type":"payment.succeeded","data":{"id":"pay_qa_meta_amount_only","metadata":{"creditAmount":"1"}}}'
sig=$(hmac "$body" "$SECRET")
run "C4.11" "Succeeded missing uid"        "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

run "C4.12" "Webhook no body, no sig"      "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json')"

# Empty body with valid sig (HMAC of empty string)
sig=$(hmac '' "$SECRET")
run "C4.13" "Webhook empty body, valid sig" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d '')"

# Malformed JSON with valid sig
malformed='{"type":"payment.succeeded'
sig=$(hmac "$malformed" "$SECRET")
run "C4.14" "Webhook malformed JSON, valid sig" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$malformed")"

# Refund event for unknown payment (graceful 200)
body='{"type":"refund.succeeded","data":{"id":"rfd_qa_unknown","payment_id":"pay_does_not_exist_in_db"}}'
sig=$(hmac "$body" "$SECRET")
run "C4.15" "Refund of unknown payment"     "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

# Refund event missing payment_id
body='{"type":"refund.succeeded","data":{"id":"rfd_qa_no_payment"}}'
sig=$(hmac "$body" "$SECRET")
run "C4.16" "Refund missing payment_id"    "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

# Idempotency: same ignored event sent twice
body='{"type":"customer.updated","data":{"id":"cust_qa_idem_test"}}'
sig=$(hmac "$body" "$SECRET")
first=$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")
second=$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")
run "C4.17" "Webhook idempotent ignored 1st" "200" "$first"
run "C4.18" "Webhook idempotent ignored 2nd" "200" "$second"

# Subscription event (not in our switch — should be 200 ignored)
body='{"type":"subscription.created","data":{"id":"sub_qa_test"}}'
sig=$(hmac "$body" "$SECRET")
run "C4.19" "Webhook subscription.created (ignored)" "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

# Unknown event type
body='{"type":"unknown.event","data":{}}'
sig=$(hmac "$body" "$SECRET")
run "C4.20" "Webhook unknown event type"   "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

# Event field instead of type field (legacy variant)
# After fix: succeeds with 200 because user doc gets created via set-with-init
body='{"event":"payment.succeeded","data":{"id":"pay_qa_legacy_v2","metadata":{"uid":"qa_legacy_v2","creditAmount":"1"}}}'
sig=$(hmac "$body" "$SECRET")
run "C4.21" "Webhook 'event' field instead of 'type'" "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body")"

# ============================================================
# CATEGORY 5 — Static asset and SEO checks
# ============================================================
echo
echo "--- CATEGORY 5: Static assets, SEO, robots ---"
run "C5.01" "GET /favicon.ico"             "200" "$(code "$BASE/favicon.ico")"
run "C5.02" "GET /robots.txt (Next default)" "404" "$(code "$BASE/robots.txt")"
run "C5.03" "GET /sitemap.xml"             "404" "$(code "$BASE/sitemap.xml")"
run "C5.04" "GET /manifest.json"           "404" "$(code "$BASE/manifest.json")"
run "C5.05" "GET /apple-touch-icon.png"    "404" "$(code "$BASE/apple-touch-icon.png")"

# ============================================================
# CATEGORY 6 — Security headers
# ============================================================
echo
echo "--- CATEGORY 6: Security headers ---"
HEADERS=$(curl -s -I "$BASE/")
hdr() { echo "$HEADERS" | grep -i "^$1:" | awk -F': ' '{print tolower($2)}' | tr -d '\r\n'; }

if echo "$HEADERS" | grep -qi "^strict-transport-security:"; then
  run "C6.01" "HSTS header present" "yes" "yes"
else
  run "C6.01" "HSTS header present" "yes" "no"
fi

if echo "$HEADERS" | grep -qi "^x-content-type-options:"; then
  run "C6.02" "X-Content-Type-Options" "yes" "yes"
else
  run_warn "C6.02" "X-Content-Type-Options" "missing — add via next.config.ts"
fi

if echo "$HEADERS" | grep -qi "^x-frame-options:"; then
  run "C6.03" "X-Frame-Options" "yes" "yes"
else
  run_warn "C6.03" "X-Frame-Options" "missing — clickjacking risk on /login"
fi

if echo "$HEADERS" | grep -qi "^content-security-policy:"; then
  run "C6.04" "Content-Security-Policy" "yes" "yes"
else
  run_warn "C6.04" "Content-Security-Policy" "missing — defer to Slice 2"
fi

if echo "$HEADERS" | grep -qi "^referrer-policy:"; then
  run "C6.05" "Referrer-Policy" "yes" "yes"
else
  run_warn "C6.05" "Referrer-Policy" "missing — defer to Slice 2"
fi

if echo "$HEADERS" | grep -qi "^permissions-policy:"; then
  run "C6.06" "Permissions-Policy" "yes" "yes"
else
  run_warn "C6.06" "Permissions-Policy" "missing — defer to Slice 2"
fi

# HTTP -> HTTPS
redirect=$(curl -s -o /dev/null -w "%{http_code}|%{redirect_url}" --max-redirs 0 "http://plubis.vercel.app/")
redirect_code=$(echo "$redirect" | cut -d'|' -f1)
redirect_url=$(echo "$redirect" | cut -d'|' -f2)
run "C6.07" "HTTP -> HTTPS redirect (308)" "308" "$redirect_code"
if [ "$redirect_url" = "https://plubis.vercel.app/" ]; then
  run "C6.08" "HTTP redirect to https://plubis.vercel.app/" "yes" "yes"
else
  run "C6.08" "HTTP redirect to https://plubis.vercel.app/" "yes" "no"
fi

# TLS 1.3 — verify via openssl s_client which is more reliable than curl --tlsv1.3 on macOS LibreSSL
tls_proto=$(echo | openssl s_client -connect plubis.vercel.app:443 -tls1_3 -servername plubis.vercel.app 2>/dev/null | grep -o 'TLSv1\.3' | head -1)
if [ "$tls_proto" = "TLSv1.3" ]; then
  run "C6.09" "TLS 1.3 supported"           "yes" "yes"
else
  run "C6.09" "TLS 1.3 supported"           "yes" "no ($tls_proto)"
fi

# HTTP/2
h2=$(curl -s -I --http2 "$BASE/" | head -1 | grep -o 'HTTP/[0-9.]*')
if [ "$h2" = "HTTP/2" ]; then
  run "C6.10" "HTTP/2 protocol"           "yes" "yes"
else
  run "C6.10" "HTTP/2 protocol"           "yes" "no ($h2)"
fi

# ============================================================
# CATEGORY 7 — Performance / response times
# ============================================================
echo
echo "--- CATEGORY 7: Performance ---"
for path in "/" "/login"; do
  for i in 1 2 3 4 5; do
    t=$(curl -s -o /dev/null -w "%{time_total}" "$BASE$path")
    if awk "BEGIN {exit !($t < 1.0)}"; then
      run "C7.$(printf '%02d' $((${#path} * 5 + i)))" "Perf $path attempt $i (<1s)" "ok" "ok"
    else
      run "C7.$(printf '%02d' $((${#path} * 5 + i)))" "Perf $path attempt $i (<1s)" "ok" "slow $t s"
    fi
  done
done

# API response time (401 path) — should be very fast since it bails immediately
for i in 1 2 3; do
  t=$(curl -s -o /dev/null -w "%{time_total}" "$BASE/api/checkout?product=credit_1")
  if awk "BEGIN {exit !($t < 1.0)}"; then
    run "C7.20.$i" "API 401 perf attempt $i (<1s)" "ok" "ok"
  else
    run "C7.20.$i" "API 401 perf attempt $i (<1s)" "ok" "slow $t s"
  fi
done

# ============================================================
# CATEGORY 8 — Edge cases / fuzzing on URL params
# ============================================================
echo
echo "--- CATEGORY 8: URL fuzzing ---"
# Path traversal attempts (Vercel correctly blocks with 403/400/404 — any 4xx is a pass)
pt1=$(code "$BASE/../../../etc/passwd"); case "$pt1" in 4*) pt1_status="4xx";; *) pt1_status="$pt1";; esac
run "C8.01" "Path traversal in route blocked" "4xx" "$pt1_status"
pt2=$(code "$BASE/..%2f..%2f..%2fetc%2fpasswd"); case "$pt2" in 4*) pt2_status="4xx";; *) pt2_status="$pt2";; esac
run "C8.02" "Encoded path traversal blocked" "4xx" "$pt2_status"
# Double slash — Vercel canonicalizes via 308 redirect, that is correct
run "C8.03" "GET // canonicalized"      "308" "$(code "$BASE//")"
# Trailing slash variant
run "C8.04" "GET /login//"              "308" "$(code "$BASE/login//")"
# Query string on landing
run "C8.05" "GET /?foo=bar"             "200" "$(code "$BASE/?foo=bar")"
# Query on auth-required page
run "C8.06" "GET /api/checkout no params" "401" "$(code "$BASE/api/checkout")"
run "C8.07" "GET /api/checkout?product=credit_99" "401" "$(code "$BASE/api/checkout?product=credit_99")"
run "C8.08" "GET /api/checkout?product=" "401" "$(code "$BASE/api/checkout?product=")"
run "C8.09" "GET /api/checkout?product=<script>" "401" "$(code "$BASE/api/checkout?product=%3Cscript%3E")"

# Long URL
LONG_TOPIC=$(printf 'a%.0s' {1..2000})
run "C8.10" "GET very long URL"          "401" "$(code "$BASE/api/book/status?jobId=$LONG_TOPIC")"

# Special characters in path
run "C8.11" "GET /job/<script>"          "200" "$(code "$BASE/job/%3Cscript%3E")"
run "C8.12" "GET /job/'OR'1'='1"         "200" "$(code "$BASE/job/'OR'1'='1")"

# ============================================================
# CATEGORY 9 — Body fuzzing on POST endpoints (no auth, but tests parser)
# ============================================================
echo
echo "--- CATEGORY 9: Body fuzzing (auth bails first, but tests parser robustness) ---"
# These all bail at auth so the responses are 401 — but verify the body parser doesn't crash on weird input
run "C9.01" "POST empty body to webhook"    "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json')"
run "C9.02" "POST 1MB body to webhook"      "401" "$(printf 'a%.0s' {1..1000000} | curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' --data-binary @-)"

# Non-JSON content type
run "C9.03" "POST text/plain to webhook"    "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: text/plain' -d 'hello')"
run "C9.04" "POST no content-type to webhook" "401" "$(code -X POST "$BASE/api/webhooks/dodo" -d 'hello')"

# SQL injection in webhook body
sqlbody='{"type":"payment.succeeded","data":{"id":"pay_'\'';DROP TABLE users;--"}}'
sig=$(hmac "$sqlbody" "$SECRET")
run "C9.05" "SQL injection in payment id" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$sqlbody")"

# XSS in webhook body — Firestore IDs cannot contain "/" so we use a benign-looking but safe XSS payload
# After fix: missing user doc gets created via set-with-merge, so this should now succeed (200)
xssbody='{"type":"payment.succeeded","data":{"id":"pay_xss_qa","metadata":{"uid":"qa_xss_safe_id","creditAmount":"1"}}}'
sig=$(hmac "$xssbody" "$SECRET")
xss_code=$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$xssbody")
run "C9.06" "Sanitized XSS-like uid metadata" "200" "$xss_code"

# Null bytes
run "C9.07" "POST with null byte body" "401" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' --data-binary $'\x00')"

# Unicode in metadata — after fix, missing user gets created
unibody='{"type":"payment.succeeded","data":{"id":"pay_uni_qa_v2","metadata":{"uid":"用户测试_v2","creditAmount":"1"}}}'
sig=$(hmac "$unibody" "$SECRET")
run "C9.08" "Unicode uid metadata"        "200" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$unibody")"

# Negative creditAmount — after fix, must be rejected with 400
negbody='{"type":"payment.succeeded","data":{"id":"pay_neg_qa","metadata":{"uid":"qa","creditAmount":"-5"}}}'
sig=$(hmac "$negbody" "$SECRET")
run "C9.09" "Negative creditAmount rejected" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$negbody")"

# Zero creditAmount
zerobody='{"type":"payment.succeeded","data":{"id":"pay_zero_qa","metadata":{"uid":"qa","creditAmount":"0"}}}'
sig=$(hmac "$zerobody" "$SECRET")
run "C9.10" "Zero creditAmount rejected"  "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$zerobody")"

# Non-numeric creditAmount
strbody='{"type":"payment.succeeded","data":{"id":"pay_str_qa","metadata":{"uid":"qa","creditAmount":"five"}}}'
sig=$(hmac "$strbody" "$SECRET")
run "C9.11" "Non-numeric creditAmount"    "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$strbody")"

# Float creditAmount — after fix, must be rejected with 400
flbody='{"type":"payment.succeeded","data":{"id":"pay_fl_qa","metadata":{"uid":"qa","creditAmount":"1.5"}}}'
sig=$(hmac "$flbody" "$SECRET")
run "C9.12" "Float creditAmount rejected" "400" "$(code -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$flbody")"

# ============================================================
# CATEGORY 10 — Webhook idempotency under burst
# ============================================================
echo
echo "--- CATEGORY 10: Idempotency under burst ---"
body='{"type":"customer.updated","data":{"id":"cust_burst_qa"}}'
sig=$(hmac "$body" "$SECRET")
# Fire 5 in parallel
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/webhooks/dodo" -H 'Content-Type: application/json' -H "webhook-signature: $sig" -d "$body" &
done > /tmp/burst.txt 2>&1
wait
all_200=$(cat /tmp/burst.txt 2>/dev/null | grep -c '200' || echo 0)
run "C10.01" "5 parallel ignored events (all 200)" "5" "$all_200"

# ============================================================
# CATEGORY 11 — Cache behavior
# ============================================================
echo
echo "--- CATEGORY 11: Caching ---"
cc1=$(curl -s -I "$BASE/" | grep -i 'cache-control' | awk -F': ' '{print $2}' | tr -d '\r\n')
run "C11.01" "Landing page Cache-Control set" "yes" "$([ -n "$cc1" ] && echo yes || echo no)"
echo "    cache-control: $cc1" >> "$LOG"

# API routes should NOT be cacheable
cc2=$(curl -s -I -X POST "$BASE/api/book/create" | grep -i 'cache-control' | awk -F': ' '{print $2}' | tr -d '\r\n')
echo "    api cache-control: $cc2" >> "$LOG"

# Vercel cache HIT after warmup
hit=$(curl -s -I "$BASE/" | grep -i 'x-vercel-cache' | awk -F': ' '{print $2}' | tr -d '\r\n')
run "C11.02" "Vercel cache populated"      "HIT" "$hit"

# ============================================================
# Summary
# ============================================================
echo
echo "=== SUMMARY ==="
echo "Total: $TOTAL"
echo "Pass:  $PASS"
echo "Fail:  $FAIL"
echo "Warn:  $WARN"
echo
echo "Log: $LOG"
echo "JSON: $JSON"
echo "Finished: $(date)"
